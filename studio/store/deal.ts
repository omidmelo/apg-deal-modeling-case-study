"use client"

/**
 * Deal store — holds all configurator lever values and the active scenario.
 *
 * Convention: percentages are stored as human-readable 0–100 (e.g. 15 = 15%).
 * Dollar amounts are stored in raw USD. The `toEngineInputs()` helper converts
 * to the fractional format expected by dealEngine.ts before running projections.
 */

import { create } from "zustand"

// Pure types + helpers live in lib/dealParams so server-side code can import
// them without pulling in Zustand.
export type { DealParams } from "@/lib/dealParams"
export { DEFAULT_PARAMS, toEngineInputs } from "@/lib/dealParams"
import { DEFAULT_PARAMS, type DealParams } from "@/lib/dealParams"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Scenario = "base" | "best" | "worst"

// ─── Store ────────────────────────────────────────────────────────────────────

interface DealStore {
  params:   DealParams
  scenario: Scenario

  setParam:    <K extends keyof DealParams>(key: K, value: DealParams[K]) => void
  setParams:   (partial: Partial<DealParams>) => void
  setScenario: (s: Scenario) => void
  resetParams: (overrides?: Partial<DealParams>) => void
}

export const useDealStore = create<DealStore>((set) => ({
  params:   { ...DEFAULT_PARAMS },
  scenario: "base",

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setParams: (partial) =>
    set((state) => ({ params: { ...state.params, ...partial } })),

  setScenario: (scenario) => set({ scenario }),

  resetParams: (overrides) => set({ params: { ...DEFAULT_PARAMS, ...overrides } }),
}))
