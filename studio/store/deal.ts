"use client"

/**
 * Deal store — holds all configurator lever values and the active scenario.
 *
 * Convention: percentages are stored as human-readable 0–100 (e.g. 15 = 15%).
 * Dollar amounts are stored in raw USD. The `toEngineInputs()` helper converts
 * to the fractional format expected by dealEngine.ts before running projections.
 */

import { create } from "zustand"
import type { DealInputs } from "@/types/deal"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Scenario = "base" | "best" | "worst"

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

/** Convert store params → DealInputs fractions for the engine. */
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

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS: DealParams = {
  contractTermYears:        5,
  advanceUsd:               500_000,
  marketingBudgetUsd:       200_000,   // ~40% of advance — realistic label marketing commitment
  distributionFeePct:       15,
  labelSharePreRecoupPct:   80,
  labelSharePostRecoupPct:  50,
  recoupmentRatePct:        100,
  costOfCapitalPct:         12,        // 12% reflects illiquidity + talent-investment risk premium
  numNewReleases:           3,         // 3 albums is the standard expectation on a 5-year deal
  deliveryWindowMonths:     36,        // 36 months spaces 3 releases at months 6, 18, 30
  peakMultiplier:           3.0,
  decayHalfLifeMonths:      4,
  royaltyRate:              0.0035,
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface DealStore {
  params:   DealParams
  scenario: Scenario

  setParam:    <K extends keyof DealParams>(key: K, value: DealParams[K]) => void
  setScenario: (s: Scenario) => void
  resetParams: () => void
}

export const useDealStore = create<DealStore>((set) => ({
  params:   { ...DEFAULT_PARAMS },
  scenario: "base",

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setScenario: (scenario) => set({ scenario }),

  resetParams: () => set({ params: { ...DEFAULT_PARAMS } }),
}))
