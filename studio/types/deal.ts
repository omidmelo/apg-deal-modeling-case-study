// ─── Deal Inputs ─────────────────────────────────────────────────────────────

/** All configurable deal levers. All percentages are expressed as fractions (0–1). */
export interface DealInputs {
  /** Deal length in years (1–10). */
  contractTermYears: number

  /** Upfront cash payment to the artist at deal close, USD. */
  advanceUsd: number

  /** Additional marketing spend committed at deal close, USD. */
  marketingBudgetUsd: number

  /**
   * Distribution / admin fee taken off gross royalties before any split.
   * e.g. 0.15 = 15%
   */
  distributionFeePct: number

  /**
   * Label's share of net royalties while the advance is still unrecouped.
   * e.g. 0.80 = label keeps 80%, artist gets 20%.
   */
  labelSharePreRecoup: number

  /**
   * Label's share of net royalties once the advance is fully recouped.
   * e.g. 0.50 = 50/50 split.
   */
  labelSharePostRecoup: number

  /**
   * Fraction of monthly net royalties applied toward the recoup balance.
   * 1.0 = all royalties count; <1.0 = artist receives a guaranteed floor pre-recoup.
   */
  recoupmentRatePct: number

  /** Annual cost of capital for NPV discounting (e.g. 0.08 = 8%). */
  costOfCapitalAnnual: number

  /** Number of new releases scheduled within the delivery window. */
  numNewReleases: number

  /** Months over which the new releases are spread (from deal start). */
  deliveryWindowMonths: number

  /**
   * New-release peak size as a multiple of catalog monthly streams at the
   * time of release. e.g. 3.0 = spike 3× the current catalog baseline.
   */
  peakMultiplier: number

  /**
   * Months until a new release's stream contribution halves (exponential decay).
   * e.g. 4 = contribution is 50% of peak after 4 months.
   */
  decayHalfLifeMonths: number

  /** Royalty rate in USD per stream. Defaults to $0.0035. */
  royaltyRate: number
}

// ─── Artist anchors ────────────────────────────────────────────────────────────

/**
 * The handful of pre-computed metrics from the artist JSON that anchor
 * the financial projections. No chart data — just the summary numbers.
 */
export interface ArtistAnchors {
  /** Trailing 12-month average daily streams (catalog + new release). */
  avgDailyStreams: number

  /** Catalog trajectory in % per month (from 24-month regression). Can be negative. */
  catalogTrajectoryPct: number

  /** Catalog stability score 0–100 (higher = more predictable cash flow). */
  catalogStabilityScore: number
}

// ─── Projection outputs ────────────────────────────────────────────────────────

/** One row in the month-by-month projection table. */
export interface MonthlyRow {
  /** 1-indexed month number within the deal term. */
  month: number

  /** Projected catalog streams this month. */
  catalogStreams: number

  /** Projected new-release streams this month (sum of all active releases). */
  newReleaseStreams: number

  /** Total streams = catalog + new release. */
  totalStreams: number

  /** Gross royalties: totalStreams × royaltyRate. */
  grossRoyalties: number

  /** Net royalties after distribution fee: grossRoyalties × (1 − distFeePct). */
  netRoyalties: number

  /** Unrecouped balance at the START of this month (0 once recouped). */
  recoupBalanceStart: number

  /** Unrecouped balance at the END of this month (clamped at 0). */
  recoupBalanceEnd: number

  /**
   * Label's economic revenue this month.
   * netRoyalties × labelSharePre (if unrecouped at start) or × labelSharePost.
   */
  labelRevenue: number

  /** Running total of label revenue from month 1 through this month. */
  cumulativeLabelRevenue: number

  /** Present value of this month's label revenue, discounted at costOfCapital. */
  npvContribution: number
}

/** Summary results for a single scenario (base / best / worst). */
export interface ScenarioResult {
  /** Full month-by-month projection. */
  months: MonthlyRow[]

  /** advance + marketingBudget (the label's total cash out). */
  totalInvestment: number

  /**
   * First month where cumulativeLabelRevenue ≥ totalInvestment.
   * null if the deal never breaks even within the contract term.
   */
  breakEvenMonth: number | null

  /**
   * First month where the recoup balance hits 0 (artist advance is paid back).
   * null if unrecouped at end of term.
   */
  recoupmentMonth: number | null

  /**
   * (cumulativeLabelRevenue − totalInvestment) / totalInvestment × 100.
   * Negative = loss.
   */
  totalROIPct: number

  /** cumulativeLabelRevenue − totalInvestment at end of term. Negative = loss. */
  labelProfit: number

  /** Net present value of the deal: PV(label inflows) − totalInvestment. */
  npv: number
}

/** Full deal projection: three scenarios + the inputs used. */
export interface DealProjection {
  base:  ScenarioResult
  best:  ScenarioResult
  worst: ScenarioResult
  inputs:  DealInputs
  anchors: ArtistAnchors
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/** Industry-standard starting values for the deal configurator. */
export const DEFAULT_DEAL_INPUTS: DealInputs = {
  contractTermYears:    5,
  advanceUsd:           500_000,
  marketingBudgetUsd:   100_000,
  distributionFeePct:   0.15,      // 15% dist fee
  labelSharePreRecoup:  0.80,      // label keeps 80% pre-recoup
  labelSharePostRecoup: 0.50,      // 50/50 post-recoup
  recoupmentRatePct:    1.00,      // 100% of net royalties count toward recoup
  costOfCapitalAnnual:  0.08,      // fallback default — overridden by costOfCapitalPct in DealParams (default 12%)
  numNewReleases:       2,
  deliveryWindowMonths: 24,
  peakMultiplier:       3.0,
  decayHalfLifeMonths:  4,
  royaltyRate:          0.0035,
}
