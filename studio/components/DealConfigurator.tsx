"use client"

import { useState, useEffect } from "react"
import { useDealStore, DEFAULT_PARAMS, type DealParams } from "@/store/deal"
import { InfoTooltip } from "@/components/InfoTooltip"

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

// ─── Main component ───────────────────────────────────────────────────────────

export function DealConfigurator() {
  const resetParams = useDealStore((s) => s.resetParams)
  const params      = useDealStore((s) => s.params)

  // Guard: delivery window must not exceed contract term in months
  const maxDeliveryWindow = params.contractTermYears * 12

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Deal Configurator
        </p>
        <button
          onClick={resetParams}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Reset
        </button>
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
        hint="Additional spend committed at deal close. Also added to the recoupment pool."
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
          ${((params.advanceUsd + params.marketingBudgetUsd) / 1_000).toFixed(0)}K
        </span>
      </div>

    </div>
  )
}
