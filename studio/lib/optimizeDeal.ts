/**
 * APG Deal Optimizer
 *
 * Finds the deal structure that maximises label NPV (base scenario) subject to
 * a set of label + artist floor constraints.
 *
 * Algorithm: boundary sweep over contractTermYears
 * ─────────────────────────────────────────────────
 * Most deal parameters have a monotone effect on NPV, so their optimal value
 * is provably at a constraint boundary — no search needed:
 *
 *   labelSharePostRecoupPct  → maximise → 100 − minArtistPostRecoupPct
 *   labelSharePreRecoupPct   → maximise → capped at PRE_RECOUP_MAX (85%)
 *   recoupmentRatePct        → maximise → maxRecoupmentRatePct
 *   advanceUsd               → minimise → minAdvanceK
 *   marketingBudgetUsd       → pin at $0 (optimizer does not float marketing;
 *                              the engine models a genuine trade-off — more
 *                              spend lifts catalog baseline and release peaks
 *                              but also raises the recoupment pool. The NPV-
 *                              maximising budget depends on artist-specific
 *                              stream velocity and is left to the user to tune)
 *   contractTermYears        → non-obvious (discounting vs. extra royalties);
 *                              swept over [1 … maxContractYears]
 *
 * Total evaluations: maxContractYears ≤ 10.
 * Each call to runDeal() takes <0.5 ms → total <5 ms in the browser.
 *
 * Break-even constraint applies to the BASE scenario (industry standard:
 * deals are structured to break even in the expected case, not the tail).
 *
 * Fixed (never floated): distributionFeePct, royaltyRate, costOfCapitalPct,
 *   numNewReleases, deliveryWindowMonths, peakMultiplier, decayHalfLifeMonths,
 *   marketingBudgetUsd.
 */

import { runDeal } from "@/lib/dealEngine"
import { toEngineInputs, type DealParams } from "@/lib/dealParams"
import type { ArtistAnchors } from "@/types/deal"

// ─── Advance tier ─────────────────────────────────────────────────────────────

export interface AdvanceTier {
  minK:     number  // minimum realistic advance ($K)
  defaultK: number  // suggested starting advance ($K) — midpoint of range
  maxK:     number  // maximum realistic advance ($K)
}

/**
 * Return a realistic advance range based on the artist's average daily streams.
 *
 * Tiers (industry benchmarks):
 *   < 500K /day   →  $25K – $100K
 *   500K – 1M     →  $100K – $300K
 *   1M – 2M       →  $300K – $750K
 *   > 2M          →  $750K – $2M
 *
 * Default is the midpoint of the range.
 */
export function getAdvanceTier(avgDailyStreams: number): AdvanceTier {
  if (avgDailyStreams < 500_000) {
    return { minK: 25,  defaultK: 63,   maxK: 100  }
  } else if (avgDailyStreams < 1_000_000) {
    return { minK: 100, defaultK: 200,  maxK: 300  }
  } else if (avgDailyStreams < 2_000_000) {
    return { minK: 300, defaultK: 525,  maxK: 750  }
  } else {
    return { minK: 750, defaultK: 1375, maxK: 2_000 }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OptimizeConstraints {
  /** Advance + marketing budget cap ($K) */
  maxInvestmentK:         number
  /** Marketing budget ceiling ($K) — independent of total investment cap */
  maxMarketingK:          number
  /** Worst-case scenario must break even by this month */
  breakEvenByMonth:       number
  /** Upper bound on contract term (years) */
  maxContractYears:       number
  /** Minimum acceptable advance ($K) — artist floor */
  minAdvanceK:            number
  /** Artist must receive at least this share post-recoup (%) */
  minArtistPostRecoupPct: number
  /** Ceiling on recoupment rate (%) */
  maxRecoupmentRatePct:   number
}

export const DEFAULT_CONSTRAINTS: OptimizeConstraints = {
  maxInvestmentK:         1_500,
  maxMarketingK:          500,
  breakEvenByMonth:       60,   // base-scenario break-even within 5 years
  maxContractYears:       7,
  minAdvanceK:            300,
  minArtistPostRecoupPct: 40,
  maxRecoupmentRatePct:   100,
}

// ─── Internal constants ───────────────────────────────────────────────────────

/**
 * Practical industry cap on label share before recoupment.
 * Even optimizing purely for NPV, giving the artist 0% pre-recoup would be
 * non-negotiable in practice.
 */
const PRE_RECOUP_MAX = 85   // %


// ─── Optimizer ────────────────────────────────────────────────────────────────

/**
 * Find the deal structure that maximises base-scenario label NPV subject to
 * the given constraints.
 *
 * Returns `null` if no feasible solution exists (all candidates violate at
 * least one constraint).  The caller should surface this to the user.
 *
 * Params pinned analytically (monotone in NPV — optimal always at boundary):
 *   labelSharePostRecoupPct  → maximise → 100 − minArtistPostRecoupPct
 *   labelSharePreRecoupPct   → maximise → PRE_RECOUP_MAX (85%)
 *   recoupmentRatePct        → maximise → maxRecoupmentRatePct
 *   advanceUsd               → minimise → minAdvanceK
 *
 * Params swept (non-monotone — genuine trade-off):
 *   contractTermYears   → longer = more cash flows but heavier discounting
 *   marketingBudgetUsd  → higher = better streams (catalog lift + peak lift)
 *                         but also higher investment and recoup burden
 *
 * Total evaluations: maxContractYears × (MARKETING_STEPS + 1) ≤ 7 × 51 = 357.
 * Each runDeal() call < 1 ms → total well under 400 ms.
 *
 * Params fixed at current user values (not floated):
 *   distributionFeePct, royaltyRate, costOfCapitalPct,
 *   numNewReleases, peakMultiplier, decayHalfLifeMonths, deliveryWindowMonths.
 */
export function optimizeDeal(
  current:     DealParams,
  anchors:     ArtistAnchors,
  constraints: OptimizeConstraints,
): DealParams | null {

  // ── Pin monotone params at optimal constraint boundaries ──────────────────

  // Label share post-recoup: maximise subject to artist floor
  const labelSharePostRecoupPct = 100 - constraints.minArtistPostRecoupPct

  // Label share pre-recoup: maximise, capped at practical industry ceiling
  const labelSharePreRecoupPct = Math.min(
    PRE_RECOUP_MAX,
    Math.max(labelSharePostRecoupPct, PRE_RECOUP_MAX),
  )

  // Recoupment rate: maximise (faster recoup → label enters post-recoup sooner)
  const recoupmentRatePct = constraints.maxRecoupmentRatePct

  // Advance: minimise (lowest feasible outflow)
  const advanceUsd = constraints.minAdvanceK * 1_000

  // Maximum marketing budget: the tighter of the investment cap headroom
  // and the explicit marketing ceiling
  const maxMarketingUsd = Math.min(
    Math.max(0, constraints.maxInvestmentK * 1_000 - advanceUsd),
    constraints.maxMarketingK * 1_000,
  )

  // ── Sweep contractTermYears × marketingBudgetUsd ──────────────────────────
  //
  // Marketing now has a genuine revenue effect (catalog baseline lift + release
  // peak lift, both log-scaled), making it a real trade-off against the higher
  // recoupment burden.  We sweep it in MARKETING_STEPS increments.
  //
  // Contract term is non-obvious for the same reason as before: discounting
  // reduces the value of distant cash flows.

  const MARKETING_STEPS = 50

  let bestNPV    = -Infinity
  let bestParams: DealParams | null = null

  for (let years = 1; years <= constraints.maxContractYears; years++) {

    // deliveryWindow must not exceed contract term in months
    const deliveryWindowMonths = Math.min(
      current.deliveryWindowMonths,
      years * 12,
    )

    for (let step = 0; step <= MARKETING_STEPS; step++) {
      const marketingBudgetUsd = (maxMarketingUsd * step) / MARKETING_STEPS

      const candidate: DealParams = {
        ...current,
        contractTermYears:      years,
        advanceUsd,
        marketingBudgetUsd,
        labelSharePreRecoupPct,
        labelSharePostRecoupPct,
        recoupmentRatePct,
        deliveryWindowMonths,
      }

      const projection = runDeal(toEngineInputs(candidate), anchors)

      // ── Constraint: total investment cap ────────────────────────────────
      if (advanceUsd + marketingBudgetUsd > constraints.maxInvestmentK * 1_000) continue

      // ── Constraint: base-case break-even by target month ────────────────
      //
      // Applied to the base scenario (industry standard: deals are structured
      // to break even in the expected case, not the downside tail).
      // breakEvenMonth = null means label never recoups within the contract term.
      //
      const baseBE = projection.base.breakEvenMonth
      if (baseBE === null || baseBE > constraints.breakEvenByMonth) continue

      // ── Objective: maximise base-scenario NPV ───────────────────────────
      const baseNPV = projection.base.npv
      if (baseNPV > bestNPV) {
        bestNPV    = baseNPV
        bestParams = { ...candidate }
      }
    }
  }

  return bestParams
}
