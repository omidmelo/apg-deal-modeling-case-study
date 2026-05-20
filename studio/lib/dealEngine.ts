/**
 * APG Deal Modeling Tool — Deal Engine
 *
 * Pure function: takes deal inputs + artist anchors, returns a full
 * month-by-month projection for base / best / worst scenarios.
 *
 * No UI, no side-effects, no imports from the rest of the app.
 * Safe to call on every state change (120 iterations of arithmetic).
 */

import type {
  ArtistAnchors,
  DealInputs,
  DealProjection,
  MonthlyRow,
  ScenarioResult,
} from "@/types/deal"

// ─── Release scheduling ────────────────────────────────────────────────────────

/**
 * Compute evenly-spaced release months within the delivery window.
 * Uses midpoint spacing so releases are distributed across the window
 * rather than piled at the edges.
 *
 * Examples:
 *   n=1, D=24  → [12]
 *   n=2, D=24  → [6, 18]
 *   n=3, D=24  → [4, 12, 20]
 *   n=4, D=24  → [3, 9, 15, 21]
 *
 * All months are clamped to [1, termMonths].
 */
function scheduleReleases(
  n: number,
  deliveryWindowMonths: number,
  termMonths: number,
): number[] {
  if (n <= 0) return []
  const interval = deliveryWindowMonths / n
  return Array.from({ length: n }, (_, i) =>
    Math.min(
      Math.max(1, Math.round(interval * (i + 0.5))),
      termMonths,
    ),
  )
}

// ─── Trajectory mean-reversion ────────────────────────────────────────────────

/**
 * Half-life (months) for trajectory mean-reversion.
 *
 * The observed short-term catalog growth rate decays toward zero with this
 * half-life, preventing runaway compounding on long-term deals.
 *
 * Growth step k (0-indexed) applies: traj × 0.5^(k / HALFLIFE)
 *   k = 0  → full initial rate
 *   k = 18 → half the initial rate
 *   k → ∞  → rate approaches 0
 *
 * This bounds the maximum stream growth per scenario at:
 *   exp(traj/100 × HALFLIFE / ln(2))
 *
 * Examples at HALFLIFE = 18:
 *   +2.56 %/mo  →  max ~1.97× baseline
 *   +4.77 %/mo  →  max ~3.56× baseline   (vs. 256× at year 10 without decay)
 */
const TRAJECTORY_HALFLIFE_MONTHS = 18

/**
 * Pre-compute catalog daily streams for every month using decayed trajectory.
 * Returns a 1-indexed array: result[t] = catalog daily streams at month t.
 */
function buildCatalogCurve(
  baseline: number,
  trajectoryPct: number,
  termMonths: number,
): Float64Array {
  const curve = new Float64Array(termMonths + 1)
  curve[1] = baseline
  for (let t = 2; t <= termMonths; t++) {
    // Growth step index k = t - 2 (0-indexed: k=0 is the first growth, month 1→2)
    const k = t - 2
    const decayedTraj = trajectoryPct * Math.pow(0.5, k / TRAJECTORY_HALFLIFE_MONTHS)
    curve[t] = Math.max(0, curve[t - 1] * (1 + decayedTraj / 100))
  }
  return curve
}

// ─── Single-scenario projection ────────────────────────────────────────────────

/**
 * Project a single scenario.
 *
 * @param inputs         - Deal lever values (unchanged from user input)
 * @param anchors        - Artist metrics anchoring the projection
 * @param trajectoryPct  - Catalog trajectory to use (%/month; varies by scenario)
 * @param peakMultiplier - New-release peak multiplier (varies by scenario)
 */
function projectScenario(
  inputs: DealInputs,
  anchors: ArtistAnchors,
  trajectoryPct: number,
  peakMultiplier: number,
): ScenarioResult {
  const termMonths      = inputs.contractTermYears * 12
  const totalInvestment = inputs.advanceUsd + inputs.marketingBudgetUsd

  // Monthly discount rate derived from annual cost of capital
  // (1 + annual)^(1/12) − 1
  const monthlyDiscRate = Math.pow(1 + inputs.costOfCapitalAnnual, 1 / 12) - 1

  const releaseMonths = scheduleReleases(
    inputs.numNewReleases,
    inputs.deliveryWindowMonths,
    termMonths,
  )

  // Catalog curve with mean-reversion (avoids exponential explosion on long terms)
  const catalogDailyAt = buildCatalogCurve(
    anchors.avgDailyStreams,
    trajectoryPct,
    termMonths,
  )

  const rows: MonthlyRow[]      = []
  let recoupBalance              = totalInvestment
  let cumulativeLabelRevenue     = 0
  let cumulativeNPV              = 0
  let breakEvenMonth: number | null    = null
  let recoupmentMonth: number | null   = null

  for (let t = 1; t <= termMonths; t++) {

    // ── 1. Catalog streams ──────────────────────────────────────────────────
    //
    // Use the pre-computed mean-reverting catalog curve.
    // The trajectory decays toward 0 with TRAJECTORY_HALFLIFE_MONTHS half-life,
    // so observed short-term momentum doesn't compound forever.
    //
    const catalogStreams = catalogDailyAt[t] * 30   // 30-day month

    // ── 2. New-release streams ──────────────────────────────────────────────
    //
    // Each release drops at its scheduled month, peaks at
    // (catalog baseline at that month) × peakMultiplier, then decays
    // exponentially with the given half-life:
    //
    //   contribution(t) = peak × 0.5^(monthsSince / halfLife)
    //
    // At release month (monthsSince = 0):  contribution = peak
    // After one half-life:                 contribution = peak / 2
    // After two half-lives:                contribution = peak / 4
    //
    let newReleaseStreams = 0
    for (const rm of releaseMonths) {
      if (t >= rm) {
        const monthsSince = t - rm

        // Catalog baseline at the time the release drops (peak anchoring).
        // Uses the same mean-reverting curve so release peaks stay consistent.
        const catalogAtRelease = catalogDailyAt[Math.min(rm, termMonths)] * 30
        const peakMonthlyStreams = catalogAtRelease * peakMultiplier

        newReleaseStreams +=
          peakMonthlyStreams *
          Math.pow(0.5, monthsSince / inputs.decayHalfLifeMonths)
      }
    }

    const totalStreams = catalogStreams + newReleaseStreams

    // ── 3. Royalties ────────────────────────────────────────────────────────

    const grossRoyalties = totalStreams * inputs.royaltyRate
    const netRoyalties   = grossRoyalties * (1 - inputs.distributionFeePct)

    // ── 4. Recoupment ───────────────────────────────────────────────────────
    //
    // Each month, (netRoyalties × recoupmentRatePct) is applied toward
    // the outstanding balance.  recoupmentRatePct < 1 means the artist
    // receives a guaranteed floor even before full recoupment.
    //
    // We record the balance at START-of-month (used to determine the split)
    // and at END-of-month (carried forward).
    //
    const recoupBalanceStart = recoupBalance
    const recoupApplied = recoupBalanceStart > 0
      ? Math.min(netRoyalties * inputs.recoupmentRatePct, recoupBalanceStart)
      : 0
    recoupBalance = Math.max(0, recoupBalanceStart - recoupApplied)

    if (recoupmentMonth === null && recoupBalanceStart > 0 && recoupBalance === 0) {
      recoupmentMonth = t
    }

    // ── 5. Label revenue ────────────────────────────────────────────────────
    //
    // Split is determined by the balance at the START of the month.
    // If the advance was still outstanding at the start, use the pre-recoup
    // share even if it tipped to zero during this month; the post-recoup
    // split kicks in from the NEXT month.
    //
    const labelShare   = recoupBalanceStart <= 0
      ? inputs.labelSharePostRecoup
      : inputs.labelSharePreRecoup
    const labelRevenue = netRoyalties * labelShare

    cumulativeLabelRevenue += labelRevenue

    if (breakEvenMonth === null && cumulativeLabelRevenue >= totalInvestment) {
      breakEvenMonth = t
    }

    // ── 6. NPV ──────────────────────────────────────────────────────────────

    const discountFactor  = Math.pow(1 + monthlyDiscRate, -t)
    const npvContribution = labelRevenue * discountFactor
    cumulativeNPV        += npvContribution

    // ── Record row ──────────────────────────────────────────────────────────

    rows.push({
      month:                 t,
      catalogStreams:        Math.round(catalogStreams),
      newReleaseStreams:     Math.round(newReleaseStreams),
      totalStreams:          Math.round(totalStreams),
      grossRoyalties:        round2(grossRoyalties),
      netRoyalties:          round2(netRoyalties),
      recoupBalanceStart:    round2(recoupBalanceStart),
      recoupBalanceEnd:      round2(recoupBalance),
      labelRevenue:          round2(labelRevenue),
      cumulativeLabelRevenue: round2(cumulativeLabelRevenue),
      npvContribution:       round2(npvContribution),
    })
  }

  const labelProfit = cumulativeLabelRevenue - totalInvestment
  const totalROIPct = totalInvestment > 0
    ? (labelProfit / totalInvestment) * 100
    : 0
  // NPV = PV of all future inflows (already summed) minus the upfront outflow
  const npv = cumulativeNPV - totalInvestment

  return {
    months:         rows,
    totalInvestment: round2(totalInvestment),
    breakEvenMonth,
    recoupmentMonth,
    totalROIPct:    round1(totalROIPct),
    labelProfit:    Math.round(labelProfit),
    npv:            Math.round(npv),
  }
}

// ─── Confidence band ───────────────────────────────────────────────────────────

/**
 * Derive best and worst scenario parameters from the base inputs.
 *
 * The band width is driven by catalogStabilityScore:
 *   volatility = (100 − stabilityScore) / 100  → 0 (perfectly stable) to 1 (chaotic)
 *
 * Trajectory swing:  0.30 %/month (stable) to 1.50 %/month (volatile)
 * Peak swing:        10% (stable) to 30% (volatile)
 */
function scenarioBand(anchors: ArtistAnchors, basePeak: number): {
  bestTraj:  number
  worstTraj: number
  bestPeak:  number
  worstPeak: number
} {
  const volatility     = (100 - anchors.catalogStabilityScore) / 100
  const trajectorySwing = 0.30 + volatility * 1.20   // 0.30–1.50 %/month
  const peakSwingFrac   = 0.10 + volatility * 0.20   // 10–30%

  return {
    bestTraj:  anchors.catalogTrajectoryPct + trajectorySwing,
    worstTraj: anchors.catalogTrajectoryPct - trajectorySwing,
    bestPeak:  basePeak * (1 + peakSwingFrac),
    worstPeak: basePeak * Math.max(0, 1 - peakSwingFrac),
  }
}

// ─── Marketing lift ────────────────────────────────────────────────────────────

/**
 * Reference marketing budget for lift scaling.
 * At this spend level the lift factor equals ln(2) ≈ 0.693.
 */
const MARKETING_REFERENCE_USD = 200_000

/**
 * Catalog baseline sensitivity to marketing spend.
 * At the reference budget: +10.4% baseline lift.
 * At $500K: +18.8%. At $1M: +26.9%.
 */
const CATALOG_LIFT_ALPHA = 0.15

/**
 * Release peak sensitivity to marketing spend.
 * At the reference budget: +20.8% peak lift.
 * At $500K: +37.6%. At $1M: +53.8%.
 */
const PEAK_LIFT_ALPHA = 0.30

/**
 * Apply marketing spend effects to artist anchors and peak multiplier.
 *
 * Marketing budget affects two things:
 *   1. Catalog baseline (avgDailyStreams) — sustained visibility from
 *      editorial placements, sync, and algorithmic momentum.
 *   2. Release peak multiplier — larger launch spike from playlist pitching,
 *      social ads, and promotional campaigns around new releases.
 *
 * Both scale logarithmically (diminishing returns on additional spend):
 *   lift = ln(marketingBudgetUsd / reference + 1)
 *   catalogFactor = 1 + CATALOG_LIFT_ALPHA × lift
 *   peakFactor    = 1 + PEAK_LIFT_ALPHA    × lift
 *
 * At $0 spend the lift is exactly zero — no penalty, no bonus.
 * Trajectory and decay half-life are artist-intrinsic and stay unchanged.
 */
function applyMarketingLift(
  inputs:  DealInputs,
  anchors: ArtistAnchors,
): { liftedAnchors: ArtistAnchors; liftedPeak: number } {
  if (inputs.marketingBudgetUsd <= 0) {
    return { liftedAnchors: anchors, liftedPeak: inputs.peakMultiplier }
  }
  const lift = Math.log(inputs.marketingBudgetUsd / MARKETING_REFERENCE_USD + 1)
  return {
    liftedAnchors: {
      ...anchors,
      avgDailyStreams: anchors.avgDailyStreams * (1 + CATALOG_LIFT_ALPHA * lift),
    },
    liftedPeak: inputs.peakMultiplier * (1 + PEAK_LIFT_ALPHA * lift),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a full deal projection (base + best + worst scenarios).
 *
 * Marketing spend is applied as a lift to the catalog baseline and release
 * peak before projecting all three scenarios.
 *
 * @param inputs   - Deal levers from the configurator
 * @param anchors  - Pre-computed artist metrics from the artist JSON
 * @returns        - DealProjection with three ScenarioResults and metadata
 */
export function runDeal(inputs: DealInputs, anchors: ArtistAnchors): DealProjection {
  const { liftedAnchors, liftedPeak } = applyMarketingLift(inputs, anchors)

  const { bestTraj, worstTraj, bestPeak, worstPeak } =
    scenarioBand(liftedAnchors, liftedPeak)

  return {
    base:  projectScenario(inputs, liftedAnchors, liftedAnchors.catalogTrajectoryPct, liftedPeak),
    best:  projectScenario(inputs, liftedAnchors, bestTraj,  bestPeak),
    worst: projectScenario(inputs, liftedAnchors, worstTraj, worstPeak),
    inputs,
    anchors,  // original (pre-lift) anchors stored for reference
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
