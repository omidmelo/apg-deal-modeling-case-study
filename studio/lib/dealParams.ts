/**
 * Pure deal parameter types and helpers.
 *
 * Intentionally free of React / Zustand so this module can be safely imported
 * by both client components (via store/deal.ts) and server-side code
 * (e.g. lib/rankRoster.ts).
 */

import type { DealInputs } from "@/types/deal"

// ─── Types ────────────────────────────────────────────────────────────────────

/** Store representation — percentages as 0–100 for clean UI binding. */
export interface DealParams {
  contractTermYears:        number  // 1–10 years
  advanceUsd:               number  // USD
  marketingBudgetUsd:       number  // USD
  distributionFeePct:       number  // 0–100
  labelSharePreRecoupPct:   number  // 0–100 (label's share before recoup)
  labelSharePostRecoupPct:  number  // 0–100 (label's share after recoup)
  recoupmentRatePct:        number  // 0–100 (fraction of net royalties toward balance)
  costOfCapitalPct:         number  // 0–100 annual
  numNewReleases:           number  // integer ≥ 0
  deliveryWindowMonths:     number  // months
  peakMultiplier:           number  // × catalog baseline at release
  decayHalfLifeMonths:      number  // months until contribution halves
  royaltyRate:              number  // $/stream (displayed read-only)
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS: DealParams = {
  contractTermYears:        5,
  advanceUsd:               500_000,
  marketingBudgetUsd:       200_000,
  distributionFeePct:       15,
  labelSharePreRecoupPct:   80,
  labelSharePostRecoupPct:  50,
  recoupmentRatePct:        100,
  costOfCapitalPct:         12,
  numNewReleases:           3,
  deliveryWindowMonths:     36,
  peakMultiplier:           3.0,
  decayHalfLifeMonths:      4,
  royaltyRate:              0.0035,
}

// ─── Engine adapter ───────────────────────────────────────────────────────────

/** Convert store params → DealInputs fractions expected by dealEngine.ts. */
export function toEngineInputs(p: DealParams): DealInputs {
  return {
    contractTermYears:    p.contractTermYears,
    advanceUsd:           p.advanceUsd,
    marketingBudgetUsd:   p.marketingBudgetUsd,
    distributionFeePct:   p.distributionFeePct   / 100,
    labelSharePreRecoup:  p.labelSharePreRecoupPct  / 100,
    labelSharePostRecoup: p.labelSharePostRecoupPct / 100,
    recoupmentRatePct:    p.recoupmentRatePct    / 100,
    costOfCapitalAnnual:  p.costOfCapitalPct     / 100,
    numNewReleases:       p.numNewReleases,
    deliveryWindowMonths: p.deliveryWindowMonths,
    peakMultiplier:       p.peakMultiplier,
    decayHalfLifeMonths:  p.decayHalfLifeMonths,
    royaltyRate:          p.royaltyRate,
  }
}
