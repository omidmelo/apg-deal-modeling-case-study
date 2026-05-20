import { create } from "zustand";

// ─── Deal parameter types ─────────────────────────────────────────────────────

export type Scenario = "worst" | "base" | "best";

export interface DealParams {
  contractTermYears: number       // 1–7
  advanceUsd: number              // $
  marketingBudgetUsd: number      // $
  distributionFeePct: number      // 0–30%
  splitPreRecoupLabel: number     // label share 0–100 (artist = 100 - this)
  splitPostRecoupLabel: number    // label share 0–100 post-recoupment
  recoupmentRatePct: number       // % of artist royalties withheld
  costOfCapitalPct: number        // annual discount rate
  newReleases: number             // expected new releases over term
  deliveryWindowMonths: number    // months between releases
  frontlinePeakMultiplier: number // peak stream multiplier on release
  frontlineDecayRate: number      // monthly decay rate (0–1)
}

export const DEFAULT_DEAL_PARAMS: DealParams = {
  contractTermYears:      3,
  advanceUsd:             500_000,
  marketingBudgetUsd:     100_000,
  distributionFeePct:     10,
  splitPreRecoupLabel:    85,
  splitPostRecoupLabel:   70,
  recoupmentRatePct:      100,
  costOfCapitalPct:       8,
  newReleases:            2,
  deliveryWindowMonths:   18,
  frontlinePeakMultiplier: 3,
  frontlineDecayRate:     0.2,
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface DealStore {
  params: DealParams;
  scenario: Scenario;
  setParam: <K extends keyof DealParams>(key: K, value: DealParams[K]) => void;
  setScenario: (s: Scenario) => void;
  resetParams: () => void;
}

export const useDealStore = create<DealStore>((set) => ({
  params:   { ...DEFAULT_DEAL_PARAMS },
  scenario: "base",

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  setScenario: (scenario) => set({ scenario }),

  resetParams: () => set({ params: { ...DEFAULT_DEAL_PARAMS } }),
}));
