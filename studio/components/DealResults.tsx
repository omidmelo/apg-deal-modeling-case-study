"use client"

import { useMemo } from "react"
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"

import { runDeal }                          from "@/lib/dealEngine"
import { useDealStore, toEngineInputs }     from "@/store/deal"
import { fmtUsd }                           from "@/lib/format"
import { InfoTooltip }                      from "@/components/InfoTooltip"
import type { ArtistAnchors, ScenarioResult } from "@/types/deal"
import type { Scenario }                    from "@/store/deal"

// ─── Shared chart config ──────────────────────────────────────────────────────

const CHART_MARGIN = { top: 4, right: 8, left: 0, bottom: 0 }

const AXIS_STYLE = {
  tick:     { fill: "#52525b", fontSize: 10 },
  tickLine: false,
  axisLine: false,
}

const GRID_PROPS = {
  stroke:          "#27272a",
  strokeDasharray: "3 3",
  vertical:        false,
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background:   "#18181b",
    border:       "1px solid #3f3f46",
    borderRadius: "6px",
    fontSize:     "12px",
    color:        "#a1a1aa",
  },
  cursor: { stroke: "#3f3f46" },
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  hint,
  sentiment,
}: {
  label:     string
  value:     string
  sub?:      string
  hint?:     string
  sentiment: "positive" | "negative" | "neutral"
}) {
  const valueColor =
    sentiment === "positive" ? "text-green-400"
    : sentiment === "negative" ? "text-red-400"
    : "text-zinc-100"

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-1 mb-1.5">
        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
          {label}
        </p>
        {hint && <InfoTooltip content={hint} direction="down" />}
      </div>
      <p className={`text-lg sm:text-xl font-bold tabular-nums leading-none ${valueColor}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Scenario switcher ────────────────────────────────────────────────────────

const SCENARIO_LABELS: Record<Scenario, string> = {
  worst: "Worst",
  base:  "Base",
  best:  "Best",
}

function ScenarioSwitcher() {
  const scenario    = useDealStore((s) => s.scenario)
  const setScenario = useDealStore((s) => s.setScenario)

  return (
    <div className="flex rounded-md border border-zinc-700 overflow-hidden text-xs font-medium">
      {(["worst", "base", "best"] as Scenario[]).map((s) => (
        <button
          key={s}
          onClick={() => setScenario(s)}
          className={[
            "px-3 py-1.5 transition-colors",
            scenario === s
              ? s === "best"  ? "bg-green-900/50 text-green-400"
              : s === "worst" ? "bg-red-900/40 text-red-400"
              : "bg-zinc-700 text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300",
          ].join(" ")}
        >
          {SCENARIO_LABELS[s]}
        </button>
      ))}
    </div>
  )
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({
  title,
  hint,
  children,
}: {
  title:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        {hint && <InfoTooltip content={hint} />}
      </div>
      {children}
    </div>
  )
}

// ─── Legend dot/line helpers ─────────────────────────────────────────────────

function LegendLine({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      className="w-4 inline-block"
      style={{
        borderTop:        `${dashed ? "1px" : "2px"} ${dashed ? "dashed" : "solid"} ${color}`,
        verticalAlign:    "middle",
      }}
    />
  )
}

function LegendSwatch({ color }: { color: string }) {
  return <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DealResults({ anchors }: { anchors: ArtistAnchors }) {
  const params   = useDealStore((s) => s.params)
  const scenario = useDealStore((s) => s.scenario)

  // Run engine on every param change — 120 iterations, negligible cost
  const projection = useMemo(
    () => runDeal(toEngineInputs(params), anchors),
    [params, anchors],
  )

  const active: ScenarioResult = projection[scenario]
  const termMonths = params.contractTermYears * 12

  // X-axis: one tick per year
  const yearTicks = useMemo(
    () => Array.from({ length: params.contractTermYears }, (_, i) => (i + 1) * 12),
    [params.contractTermYears],
  )
  const xFmt = (v: unknown) => {
    const m = v as number
    return m % 12 === 0 ? `Yr ${m / 12}` : ""
  }
  const xTooltipFmt = (v: unknown) => `Month ${v as number}`

  // ── Chart dataset: monthly cash flow ──────────────────────────────────────
  // `active` tracks the selected scenario so the main chart line updates.
  // The confidence band still spans worst→best for context.

  const cashFlowData = useMemo(
    () =>
      projection.base.months.map((row, i) => {
        const best  = projection.best.months[i].labelRevenue
        const worst = projection.worst.months[i].labelRevenue
        return {
          month:      row.month,
          base:       row.labelRevenue,
          active:     projection[scenario].months[i].labelRevenue,
          bandBottom: worst,
          bandSize:   Math.max(0, best - worst),
        }
      }),
    [projection, scenario],
  )

  // ── Chart dataset: cumulative revenue ────────────────────────────────────

  const cumulativeData = useMemo(
    () =>
      projection.base.months.map((row, i) => {
        const best  = projection.best.months[i].cumulativeLabelRevenue
        const worst = projection.worst.months[i].cumulativeLabelRevenue
        return {
          month:      row.month,
          base:       row.cumulativeLabelRevenue,
          active:     projection[scenario].months[i].cumulativeLabelRevenue,
          bandBottom: worst,
          bandSize:   Math.max(0, best - worst),
        }
      }),
    [projection, scenario],
  )

  // ── Chart dataset: revenue composition ───────────────────────────────────
  // Uses the active scenario so composition updates when scenario switches.

  const compositionData = useMemo(
    () =>
      projection[scenario].months.map((row) => {
        const catShare = row.totalStreams > 0 ? row.catalogStreams / row.totalStreams : 1
        return {
          month:         row.month,
          catalogRev:    row.labelRevenue * catShare,
          newReleaseRev: row.labelRevenue * (1 - catShare),
        }
      }),
    [projection, scenario],
  )

  // ── KPI helpers ───────────────────────────────────────────────────────────

  const fmtMonth = (m: number | null) => (m == null ? "—" : `Mo. ${m}`)
  const fmtMonthSub = (m: number | null) =>
    m == null ? "not within term" : `of ${termMonths} months`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mt-10 space-y-5">

      {/* Divider + header */}
      <div className="border-t border-zinc-800 pt-6 sm:pt-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-zinc-300">Deal Projection</h2>
            <InfoTooltip
              direction="down"
              content={`Base is the expected outcome, built from this artist's observed streaming trend and your deal inputs. Best assumes streams grow faster and new releases spike higher — a strong environment. Worst is the opposite: streams slow down or dip and releases underperform. How wide the band is depends on catalog stability (${anchors.catalogStabilityScore.toFixed(0)}/100) — a consistent streaming history produces a tight band; an erratic one produces a wide spread.`}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">
            Scenario range driven by catalog stability ({anchors.catalogStabilityScore.toFixed(0)}/100)
          </p>
        </div>
        <ScenarioSwitcher />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Break-even"
          value={fmtMonth(active.breakEvenMonth)}
          sub={fmtMonthSub(active.breakEvenMonth)}
          hint="When cumulative label revenue covers the total investment (advance + marketing). This is the cash-on-cash payback point."
          sentiment={active.breakEvenMonth != null ? "positive" : "negative"}
        />
        <KpiCard
          label="Advance Paid Back"
          value={fmtMonth(active.recoupmentMonth)}
          sub={fmtMonthSub(active.recoupmentMonth)}
          hint="When the artist's royalty share has fully paid down the advance balance. After this point the label's share of royalties drops to the post-payback rate."
          sentiment={active.recoupmentMonth != null ? "positive" : "negative"}
        />
        <KpiCard
          label="Total ROI"
          value={`${active.totalROIPct >= 0 ? "+" : ""}${active.totalROIPct.toFixed(1)}%`}
          sub={`over ${params.contractTermYears}-yr term`}
          hint="Total label revenue divided by total investment (advance + marketing), minus 1. A simple cash-on-cash return — does not account for the time value of money. See NPV for the time-adjusted view."
          sentiment={active.totalROIPct >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Label Profit"
          value={fmtUsd(active.labelProfit)}
          sub="after advance & marketing"
          hint="Cumulative label revenue over the full deal term, minus the total investment (advance + marketing). Undiscounted — this is the raw cash profit."
          sentiment={active.labelProfit >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="NPV"
          value={fmtUsd(active.npv)}
          sub={`at ${params.costOfCapitalPct}% cost of capital`}
          sentiment={active.npv >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Charts row: cash flow + cumulative */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 1: Monthly label revenue */}
        <ChartCard
          title="Monthly Label Revenue"
          hint="Label's net revenue per month (after the admin fee and the label/artist split). The grey band spans the worst-to-best scenario range. Green dashed line = month the advance is paid back; blue dashed line = cash break-even month."
        >
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={cashFlowData} margin={CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" ticks={yearTicks} tickFormatter={xFmt} {...AXIS_STYLE} />
              <YAxis
                tickFormatter={(v: unknown) => fmtUsd(v as number)}
                {...AXIS_STYLE}
                width={54}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: unknown, name: unknown) => [
                  fmtUsd(v as number),
                  name === "active" ? SCENARIO_LABELS[scenario]
                  : name === "base" ? "Base"
                  : String(name),
                ]}
                labelFormatter={xTooltipFmt}
              />
              {/* Confidence band (stacked: transparent floor + coloured fill) */}
              <Area dataKey="bandBottom" stackId="band" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
              <Area dataKey="bandSize"   stackId="band" stroke="none" fill="#52525b" fillOpacity={0.3} legendType="none" isAnimationActive={false} />
              {/* Base reference line — shown as dashed when a non-base scenario is active */}
              {scenario !== "base" && (
                <Line dataKey="base" stroke="#52525b" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              )}
              {/* Active scenario — solid prominent line */}
              <Line dataKey="active" stroke="#e4e4e7" strokeWidth={2} dot={false} isAnimationActive={false} />
              {/* Milestone reference lines */}
              {active.recoupmentMonth != null && (
                <ReferenceLine
                  x={active.recoupmentMonth}
                  stroke="#4ade80"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: "Paid back", position: "insideTopRight", fill: "#4ade80", fontSize: 9, dy: -2 }}
                />
              )}
              {active.breakEvenMonth != null && active.breakEvenMonth !== active.recoupmentMonth && (
                <ReferenceLine
                  x={active.breakEvenMonth}
                  stroke="#60a5fa"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: "Break-even", position: "insideTopLeft", fill: "#60a5fa", fontSize: 9, dy: 12 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <LegendLine color="#e4e4e7" /> {SCENARIO_LABELS[scenario]}
            </span>
            {scenario !== "base" && (
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                <LegendLine color="#52525b" dashed /> Base
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <LegendSwatch color="#52525b" /> Scenario range
            </span>
          </div>
        </ChartCard>

        {/* Chart 2: Cumulative revenue vs investment */}
        <ChartCard
          title="Cumulative Revenue vs. Investment"
          hint="Running total of label revenue over the deal term. The amber dashed line marks total investment (advance + marketing). Where the revenue line crosses it is the break-even point."
        >
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={cumulativeData} margin={CHART_MARGIN}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" ticks={yearTicks} tickFormatter={xFmt} {...AXIS_STYLE} />
              <YAxis
                tickFormatter={(v: unknown) => fmtUsd(v as number)}
                {...AXIS_STYLE}
                width={54}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: unknown, name: unknown) => [
                  fmtUsd(v as number),
                  name === "active" ? SCENARIO_LABELS[scenario]
                  : name === "base" ? "Base"
                  : String(name),
                ]}
                labelFormatter={xTooltipFmt}
              />
              {/* Band */}
              <Area dataKey="bandBottom" stackId="band" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
              <Area dataKey="bandSize"   stackId="band" stroke="none" fill="#52525b" fillOpacity={0.3} legendType="none" isAnimationActive={false} />
              {/* Base reference — shown as dashed when a non-base scenario is active */}
              {scenario !== "base" && (
                <Line dataKey="base" stroke="#52525b" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              )}
              {/* Active scenario — solid prominent line */}
              <Line dataKey="active" stroke="#e4e4e7" strokeWidth={2} dot={false} isAnimationActive={false} />
              {/* Investment threshold */}
              <ReferenceLine
                y={active.totalInvestment}
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value:    `Investment  ${fmtUsd(active.totalInvestment)}`,
                  position: "insideTopRight",
                  fill:     "#f59e0b",
                  fontSize: 9,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <LegendLine color="#e4e4e7" /> {SCENARIO_LABELS[scenario]}
            </span>
            {scenario !== "base" && (
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                <LegendLine color="#52525b" dashed /> Base
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <LegendLine color="#f59e0b" dashed /> Investment
            </span>
          </div>
        </ChartCard>

      </div>

      {/* Chart 3: Revenue composition — full width */}
      <ChartCard
        title="Label Revenue Composition"
        hint="Monthly label revenue split between catalog-sourced income (grey fill) and new-release-sourced income (purple fill). The purple line traces total revenue. Revenue is attributed proportionally to catalog vs. new-release stream share each month."
      >
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={compositionData} margin={CHART_MARGIN}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="month" ticks={yearTicks} tickFormatter={xFmt} {...AXIS_STYLE} />
            <YAxis
              tickFormatter={(v: unknown) => fmtUsd(v as number)}
              {...AXIS_STYLE}
              width={54}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              content={({ active, label, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as { catalogRev: number; newReleaseRev: number } | undefined
                if (!row) return null
                const cat   = row.catalogRev   ?? 0
                const rel   = row.newReleaseRev ?? 0
                const total = cat + rel
                return (
                  <div style={TOOLTIP_STYLE.contentStyle} className="px-3 py-2 space-y-1">
                    <p className="font-medium text-zinc-300 mb-1">{xTooltipFmt(label)}</p>
                    <p>Catalog : <span className="text-zinc-300">{fmtUsd(cat)}</span></p>
                    {rel > 0 && <p>New Release : <span className="text-zinc-300">{fmtUsd(rel)}</span></p>}
                    <p className="text-[#a78bfa]">Total : <span>{fmtUsd(total)}</span></p>
                  </div>
                )
              }}
            />
            <defs>
              <linearGradient id="grad-res-catalog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#71717a" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#71717a" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="grad-res-newrel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#a78bfa" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="catalogRev"
              stackId="comp"
              stroke="#71717a"
              strokeWidth={1.5}
              fill="url(#grad-res-catalog)"
              dot={false}
              isAnimationActive={false}
            />
            {params.numNewReleases > 0 && (
              <Area
                type="monotone"
                dataKey="newReleaseRev"
                stackId="comp"
                stroke="#a78bfa"
                strokeWidth={1.5}
                fill="url(#grad-res-newrel)"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <LegendSwatch color="#52525b" /> Catalog revenue
          </span>
          {params.numNewReleases > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
              <LegendLine color="#a78bfa" /> Total revenue
            </span>
          )}
        </div>
      </ChartCard>

    </div>
  )
}
