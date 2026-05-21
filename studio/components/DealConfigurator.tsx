"use client"

import { useState, useEffect, useRef } from "react"
import { useDealStore, DEFAULT_PARAMS, type DealParams } from "@/store/deal"
import { fmtUsd } from "@/lib/format"
import { InfoTooltip } from "@/components/InfoTooltip"
import { optimizeDeal, DEFAULT_CONSTRAINTS, type OptimizeConstraints } from "@/lib/optimizeDeal"
import type { ArtistAnchors } from "@/types/deal"

// ─── Shared input primitives ──────────────────────────────────────────────────

/** A single lever row: label · input · unit */
function LeverRow({
  label,
  hint,
  unit,
  children,
}: {
  label:    string
  hint?:    string
  unit?:    string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-zinc-800/60 last:border-0">
      {/* Label */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-xs text-zinc-400 truncate">{label}</span>
        {hint && <InfoTooltip content={hint} />}
      </div>

      {/* Input + unit */}
      <div className="flex items-center gap-1.5 shrink-0">
        {children}
        {unit && <span className="text-xs text-zinc-600 w-12 text-left">{unit}</span>}
      </div>
    </div>
  )
}

const INPUT_CLS =
  "w-20 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 " +
  "tabular-nums text-right focus:outline-none focus:border-zinc-500 transition-colors " +
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"

/**
 * Number input bound to a DealParams key.
 *
 * Uses a local display string so the user can type freely (delete, backspace,
 * partial entry) without the controlled value fighting them. The store is only
 * updated — and the value clamped to [min, max] — on blur or Enter.
 * When the store value changes externally (e.g. Reset), the display syncs.
 */
function NumInput({
  paramKey,
  min,
  max,
  step,
  decimals = 0,
}: {
  paramKey:  keyof DealParams
  min:       number
  max:       number
  step:      number
  decimals?: number
}) {
  const storeValue = useDealStore((s) => s.params[paramKey]) as number
  const setParam   = useDealStore((s) => s.setParam)

  const fmt = (n: number) => decimals > 0 ? n.toFixed(decimals) : String(n)
  const [display, setDisplay] = useState(() => fmt(storeValue))

  // Sync display when the store is updated externally (Reset, etc.)
  useEffect(() => { setDisplay(fmt(storeValue)) }, [storeValue])   // eslint-disable-line

  const commit = (raw: string) => {
    const parsed  = parseFloat(raw)
    const clamped = isNaN(parsed) ? storeValue : Math.min(max, Math.max(min, parsed))
    setParam(paramKey, clamped as DealParams[typeof paramKey])
    setDisplay(fmt(clamped))
  }

  return (
    <input
      type="number"
      className={INPUT_CLS}
      value={display}
      min={min}
      max={max}
      step={step}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={(e)  => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") { commit(e.currentTarget.value); e.currentTarget.blur() } }}
    />
  )
}

/**
 * Dollar input — displays in $K, stores raw USD.
 * Same local-display-state pattern as NumInput.
 */
function DollarInput({
  paramKey,
  minK,
  maxK,
  stepK,
}: {
  paramKey: keyof DealParams
  minK:     number
  maxK:     number
  stepK:    number
}) {
  const valueUsd = useDealStore((s) => s.params[paramKey]) as number
  const setParam = useDealStore((s) => s.setParam)

  const [display, setDisplay] = useState(() => String(valueUsd / 1_000))

  // Sync display when the store is updated externally (Reset, etc.)
  useEffect(() => { setDisplay(String(valueUsd / 1_000)) }, [valueUsd])

  const commit = (raw: string) => {
    const parsed  = parseFloat(raw)
    const clampedK = isNaN(parsed) ? valueUsd / 1_000 : Math.min(maxK, Math.max(minK, parsed))
    setParam(paramKey, clampedK * 1_000 as DealParams[typeof paramKey])
    setDisplay(String(clampedK))
  }

  return (
    <input
      type="number"
      className={INPUT_CLS}
      value={display}
      min={minK}
      max={maxK}
      step={stepK}
      onChange={(e) => setDisplay(e.target.value)}
      onBlur={(e)  => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") { commit(e.currentTarget.value); e.currentTarget.blur() } }}
    />
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mt-5 mb-1 first:mt-0">
      {label}
    </p>
  )
}

// ─── Constraint input primitives ─────────────────────────────────────────────

const CONSTRAINT_INPUT_CLS =
  "w-16 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 " +
  "tabular-nums text-right focus:outline-none focus:border-zinc-500 transition-colors " +
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"

function ConstraintRow({
  label,
  unit,
  children,
}: {
  label:    string
  unit?:    string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-700/40 last:border-0">
      <span className="flex-1 text-xs text-zinc-500 truncate">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {children}
        {unit && <span className="text-xs text-zinc-600 w-10 text-left">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DealConfigurator({
  anchors,
  initialConstraints = DEFAULT_CONSTRAINTS,
  paramDefaults = {},
  initialOptimized = false,
}: {
  anchors:             ArtistAnchors
  initialConstraints?: OptimizeConstraints
  paramDefaults?:      Partial<DealParams>
  initialOptimized?:   boolean
}) {
  const resetParams = useDealStore((s) => s.resetParams)
  const setParams   = useDealStore((s) => s.setParams)
  const params      = useDealStore((s) => s.params)

  // Optimizer UI state
  const [showConstraints, setShowConstraints] = useState(false)
  const [constraints,     setConstraints]     = useState<OptimizeConstraints>(initialConstraints)
  const [optimized,       setOptimized]       = useState(initialOptimized)
  const [noSolution,      setNoSolution]      = useState(false)

  // skipCount absorbs the two predictable params fires that must never clear the pill:
  //   fire 1 — initial mount (params value from the store before any reset)
  //   fire 2 — parent's useEffect seeding the store with optimized/default params
  const skipCount = useRef(2)

  // Set to true before any programmatic setParams call (Optimize button, Reset)
  // so that one additional fire is absorbed instead of clearing the pill.
  const justOptimized = useRef(false)

  // Clear the "Optimized" pill whenever the user manually edits a param.
  useEffect(() => {
    if (skipCount.current > 0) {
      skipCount.current -= 1
      return
    }
    if (justOptimized.current) {
      justOptimized.current = false
      return
    }
    if (optimized) setOptimized(false)
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  function setConstraint<K extends keyof OptimizeConstraints>(key: K, value: number) {
    setConstraints((c) => ({ ...c, [key]: value }))
  }

  function handleOptimize() {
    setNoSolution(false)
    const result = optimizeDeal(params, anchors, constraints)
    if (result === null) {
      setNoSolution(true)
      setOptimized(false)
    } else {
      justOptimized.current = true
      setParams(result)
      setOptimized(true)
    }
  }

  // Guard: delivery window must not exceed contract term in months
  const maxDeliveryWindow = params.contractTermYears * 12

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Deal Configurator
          </p>
          {optimized && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-900/60 text-violet-300 border border-violet-700/50">
              <span className="text-violet-400">✦</span> Optimized
            </span>
          )}
        </div>
        {!optimized && (
          <button
            onClick={() => { justOptimized.current = true; resetParams(paramDefaults); setOptimized(initialOptimized); setNoSolution(false) }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Deal Economics ───────────────────────────────────────────────── */}
      <SectionHeader label="Deal Economics" />

      <LeverRow label="Contract Term" unit="years" hint="Total deal length. Projections run for this many years.">
        <NumInput paramKey="contractTermYears" min={1} max={10} step={1} />
      </LeverRow>

      <LeverRow
        label="Advance"
        unit="$K"
        hint="Upfront cash payment to the artist at deal close. Added to the recoupment pool."
      >
        <DollarInput paramKey="advanceUsd" minK={0} maxK={10_000} stepK={50} />
      </LeverRow>

      <LeverRow
        label="Marketing Budget"
        unit="$K"
        hint="Spend committed at deal close. Added to the recoupment pool and drives two revenue effects (log-scaled, diminishing returns): (1) catalog baseline lift — sustained visibility from editorial placements and algorithmic momentum (+15% sensitivity); (2) release peak lift — larger launch spikes from playlist pitching and promotional campaigns (+30% sensitivity). Reference point: $200K."
      >
        <DollarInput paramKey="marketingBudgetUsd" minK={0} maxK={5_000} stepK={25} />
      </LeverRow>

      {/* ── Revenue Split ────────────────────────────────────────────────── */}
      <SectionHeader label="Revenue Split" />

      <LeverRow
        label="Distribution Fee"
        unit="%"
        hint="Admin / distribution fee taken off gross royalties before the label/artist split is applied."
      >
        <NumInput paramKey="distributionFeePct" min={0} max={30} step={1} />
      </LeverRow>

      <LeverRow
        label="Label Share (pre-recoup)"
        unit="%"
        hint="Label's percentage of net royalties while the advance is still unrecouped. Artist receives the remainder."
      >
        <NumInput paramKey="labelSharePreRecoupPct" min={0} max={100} step={5} />
      </LeverRow>

      <LeverRow
        label="Label Share (post-recoup)"
        unit="%"
        hint="Label's percentage of net royalties once the advance is fully recouped. Artist receives the remainder."
      >
        <NumInput paramKey="labelSharePostRecoupPct" min={0} max={100} step={5} />
      </LeverRow>

      <LeverRow
        label="Recoupment Rate"
        unit="%"
        hint="Fraction of monthly net royalties applied toward the outstanding advance balance. 100% = all royalties recoup; lower values guarantee the artist a floor before full recoupment."
      >
        <NumInput paramKey="recoupmentRatePct" min={0} max={100} step={5} />
      </LeverRow>

      {/* ── Release Schedule ─────────────────────────────────────────────── */}
      <SectionHeader label="Release Schedule" />

      <LeverRow
        label="New Releases"
        unit="albums"
        hint="Number of new releases expected over the delivery window. Set to 0 for catalog-only deals."
      >
        <NumInput paramKey="numNewReleases" min={0} max={10} step={1} />
      </LeverRow>

      <LeverRow
        label="Delivery Window"
        unit="months"
        hint="Period over which the new releases are spread. Releases are evenly spaced within this window."
      >
        <NumInput
          paramKey="deliveryWindowMonths"
          min={1}
          max={maxDeliveryWindow}
          step={1}
        />
      </LeverRow>

      <LeverRow
        label="Peak Multiplier"
        unit="×"
        hint="New-release peak size as a multiple of catalog monthly streams at the time of release. e.g. 3× means the release spikes to 3× the current catalog baseline."
      >
        <NumInput paramKey="peakMultiplier" min={0} max={20} step={0.5} decimals={1} />
      </LeverRow>

      <LeverRow
        label="Decay Half-life"
        unit="months"
        hint="Months until a new release's stream contribution halves. e.g. 4 months means the spike is 50% of peak after 4 months, 25% after 8."
      >
        <NumInput paramKey="decayHalfLifeMonths" min={1} max={24} step={1} />
      </LeverRow>

      {/* ── Assumptions ──────────────────────────────────────────────────── */}
      <SectionHeader label="Assumptions" />

      <LeverRow
        label="Cost of Capital"
        unit="% / yr"
        hint="Annual discount rate used to compute NPV. Represents the label's hurdle rate — the minimum return required to justify the investment."
      >
        <NumInput paramKey="costOfCapitalPct" min={0} max={30} step={0.5} decimals={1} />
      </LeverRow>

      <LeverRow
        label="Royalty Rate"
        unit="$ / stream"
        hint="Per-stream royalty rate used throughout. Fixed at the industry standard of $0.0035 per stream."
      >
        <span className="w-20 text-right text-xs text-zinc-600 tabular-nums pr-1">
          $0.0035
        </span>
      </LeverRow>

      {/* Investment summary */}
      <div className="mt-4 rounded-md bg-zinc-800/50 px-3 py-2.5 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Total Investment</span>
        <span className="text-sm font-semibold text-zinc-200 tabular-nums">
          {fmtUsd(params.advanceUsd + params.marketingBudgetUsd)}
        </span>
      </div>

      {/* ── Optimizer ────────────────────────────────────────────────────── */}

      {/* Constraint panel — revealed by chevron */}
      {showConstraints && (
        <div className="mt-3 rounded-md border border-zinc-700/60 bg-zinc-800/30 px-3 py-2">

          {/* Label constraints */}
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">
            Label Constraints
          </p>

          <ConstraintRow label="Max Investment" unit="$K">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.maxInvestmentK}
              min={100} max={10_000} step={100}
              onChange={(e) => setConstraint("maxInvestmentK", Number(e.target.value))}
            />
          </ConstraintRow>

          <ConstraintRow label="Max Marketing" unit="$K">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.maxMarketingK}
              min={0} max={5_000} step={50}
              onChange={(e) => setConstraint("maxMarketingK", Number(e.target.value))}
            />
          </ConstraintRow>

          <ConstraintRow label="Break-even by (base)" unit="months">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.breakEvenByMonth}
              min={1} max={120} step={1}
              onChange={(e) => setConstraint("breakEvenByMonth", Number(e.target.value))}
            />
          </ConstraintRow>

          <ConstraintRow label="Max contract term" unit="years">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.maxContractYears}
              min={1} max={10} step={1}
              onChange={(e) => setConstraint("maxContractYears", Number(e.target.value))}
            />
          </ConstraintRow>

          {/* Artist floor */}
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mt-3 mb-0.5">
            Artist Floor
          </p>

          <ConstraintRow label="Min advance" unit="$K">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.minAdvanceK}
              min={0} max={5_000} step={50}
              onChange={(e) => setConstraint("minAdvanceK", Number(e.target.value))}
            />
          </ConstraintRow>

          <ConstraintRow label="Artist post-recoup ≥" unit="%">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.minArtistPostRecoupPct}
              min={0} max={100} step={5}
              onChange={(e) => setConstraint("minArtistPostRecoupPct", Number(e.target.value))}
            />
          </ConstraintRow>

          <ConstraintRow label="Max recoupment rate" unit="%">
            <input
              type="number"
              className={CONSTRAINT_INPUT_CLS}
              value={constraints.maxRecoupmentRatePct}
              min={0} max={100} step={5}
              onChange={(e) => setConstraint("maxRecoupmentRatePct", Number(e.target.value))}
            />
          </ConstraintRow>

          {/* Reset constraints link */}
          <button
            onClick={() => setConstraints(initialConstraints)}
            className="mt-2.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* No-solution feedback */}
      {noSolution && (
        <p className="mt-3 text-[11px] text-amber-500/80 text-center">
          No feasible solution found — try relaxing the constraints.
        </p>
      )}

      {/* Split button: Optimize | ⌄ */}
      <div className="mt-3 flex rounded-md overflow-hidden border border-zinc-700">
        <button
          onClick={handleOptimize}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
        >
          <span className="text-violet-400">✦</span>
          Optimize Deal Structure
        </button>
        <div className="w-px bg-zinc-700 shrink-0" />
        <button
          onClick={() => setShowConstraints((s) => !s)}
          className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px]"
          aria-label="Toggle optimization constraints"
        >
          {showConstraints ? "▲" : "▼"}
        </button>
      </div>

    </div>
  )
}
