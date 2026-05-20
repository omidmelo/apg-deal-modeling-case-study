"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { fmtStreams, fmtTrajectory } from "@/lib/format"
import type { ArtistDetail, ScoreBreakdown } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  catalog_trajectory: "Catalog Trajectory",
  catalog_stability:  "Catalog Stability",
  audience_health:    "Audience Health",
  new_release_perf:   "New Release Performance",
  career_runway:      "Career Runway",
  market_quality:     "Market Quality",
}

const SCORE_HINTS: Record<keyof ScoreBreakdown, string> = {
  catalog_trajectory:
    "Percentile rank (0–100) across the roster. Raw metric: % change per month in catalog streams, derived from a linear regression on the 30-day rolling mean over the last 24 months. Weight: 25% of composite score.",
  catalog_stability:
    "Percentile rank (0–100) across the roster. Raw metric: inverse coefficient of variation of monthly catalog streams over 24 months — low variance = high stability = predictable royalty cash flow. Weight: 20%.",
  audience_health:
    "Percentile rank (0–100) across the roster. Average of two sub-ranks: (1) growth rate of monthly listeners over the last 12 months (first half vs second half), and (2) absolute listener level. Weight: 20%.",
  new_release_perf:
    "Percentile rank (0–100) across the roster. Raw metric: peak 30-day average of new-release streams divided by average catalog streams over 24 months — measures how strongly new releases spike relative to the catalog baseline. Weight: 15%.",
  career_runway:
    "Percentile rank (0–100) across the roster. Raw metric: 1 / (1 + career years since debut). Newer artists rank higher — more growth runway ahead. Weight: 10%.",
  market_quality:
    "Absolute tier score (not a percentile). Based on the artist's primary market country and its DSP royalty yield (US = 100, UK = 90, Germany = 85 … Nigeria = 50). Not relative to the roster. Weight: 10%.",
}

// ─── Shared chart config ───────────────────────────────────────────────────────

const CHART_MARGIN = { top: 4, right: 4, left: 0, bottom: 0 }

const AXIS_STYLE = {
  fontSize: 11,
  fill: "#52525b", // zinc-600
  tickLine: false,
  axisLine: false,
}

const GRID_PROPS = {
  stroke: "#27272a", // zinc-800
  strokeDasharray: "0",
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Show "YYYY" only for January ticks on monthly X axis */
function monthTickFmt(value: string) {
  return value.endsWith("-01") ? value.slice(0, 4) : ""
}

/** Format daily tick as "MMM 'YY" — used with interval={90} so only ~8 labels show */
function dailyTickFmt(value: string) {
  const d = new Date(value)
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
}

/** Short month/year for tooltip labels */
function monthLabelFmt(value: string) {
  const [y, mo] = value.split("-")
  const d = new Date(Number(y), Number(mo) - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        {hint && (
          <div className="relative group">
            <span className="text-zinc-700 hover:text-zinc-500 cursor-help text-xs leading-none select-none">
              ⓘ
            </span>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20
                            w-60 rounded-md bg-zinc-800 border border-zinc-700
                            px-3 py-2 text-xs text-zinc-300 leading-relaxed shadow-xl">
              {hint}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const TooltipStyle = {
  contentStyle: {
    background: "#18181b",
    border: "1px solid #3f3f46",
    borderRadius: 6,
    fontSize: 12,
    color: "#e4e4e7",
  },
  itemStyle: { color: "#a1a1aa" },
  labelStyle: { color: "#71717a", marginBottom: 4 },
  cursor: { stroke: "#52525b" },
}

/**
 * Custom tooltip for the Catalog vs New Release stacked chart.
 * stackOffset="expand" normalises rendered areas to 0–1 but the generic
 * formatter still receives raw stream counts — so we compute % ourselves.
 */
function CatalogSplitTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  const catalog = payload.find((p) => p.dataKey === "catalog_streams")?.value ?? 0
  const newRel  = payload.find((p) => p.dataKey === "new_release_streams")?.value ?? 0
  const total   = catalog + newRel
  const catPct  = total > 0 ? ((catalog / total) * 100).toFixed(1) : "—"
  const newPct  = total > 0 ? ((newRel  / total) * 100).toFixed(1) : "—"
  return (
    <div style={TooltipStyle.contentStyle}>
      <p style={{ color: "#71717a", marginBottom: 6 }}>{monthLabelFmt(label)}</p>
      <p style={{ color: "#a1a1aa", marginBottom: 2 }}>
        Catalog{" "}
        <span style={{ color: "#e4e4e7", fontVariantNumeric: "tabular-nums" }}>{catPct}%</span>
      </p>
      <p style={{ color: "#a1a1aa" }}>
        New Release{" "}
        <span style={{ color: "#e4e4e7", fontVariantNumeric: "tabular-nums" }}>{newPct}%</span>
      </p>
    </div>
  )
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreDimension({
  label,
  score,
  scoreLabel,
  hint,
}: {
  label: string
  score: number
  scoreLabel: string
  hint?: string
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          {label}
          {hint && (
            <div className="relative group">
              <span className="text-zinc-700 hover:text-zinc-500 cursor-help text-xs leading-none select-none">ⓘ</span>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-72 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 leading-relaxed shadow-xl">
                {hint}
              </div>
            </div>
          )}
        </span>
        <span className="text-xs tabular-nums text-zinc-400">
          {score.toFixed(0)}
          <span className="text-zinc-600"> · {scoreLabel}</span>
        </span>
      </div>
      <div className="h-px bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-500 rounded-full"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArtistDetailClient({ artist }: { artist: ArtistDetail }) {
  const {
    meta,
    composite_score,
    catalog_trajectory_pct,
    trajectory_label,
    scores,
    score_labels,
    monthly_history,
    recent_daily,
  } = artist

  // Debut year from ISO date string
  const debutYear = meta.debut_date ? meta.debut_date.slice(0, 4) : "—"

  // Build trajectory chart data with computed linear trend line
  const trajectoryData = useMemo(() => {
    const valid = recent_daily.filter((d) => d.catalog_rolling_30d != null)
    if (valid.length < 2) return recent_daily.map((d) => ({ ...d, trend: null as number | null }))

    const n = valid.length
    const yVals = valid.map((d) => d.catalog_rolling_30d as number)
    const meanX = (n - 1) / 2
    const meanY = yVals.reduce((s, y) => s + y, 0) / n
    const sumXX = yVals.reduce((_, __, i) => (i - meanX) ** 2, 0)
    // proper sum
    let sxx = 0
    let sxy = 0
    for (let i = 0; i < n; i++) {
      sxx += (i - meanX) ** 2
      sxy += (i - meanX) * (yVals[i] - meanY)
    }
    const slope = sxy / sxx
    const intercept = meanY - slope * meanX

    let vi = 0
    return recent_daily.map((d) => {
      if (d.catalog_rolling_30d == null) return { ...d, trend: null as number | null }
      const trend = intercept + slope * vi
      vi++
      return { ...d, trend }
    })
  }, [recent_daily])

  const trajectoryColor =
    catalog_trajectory_pct >= 0.5
      ? "#4ade80" // green-400
      : catalog_trajectory_pct <= -0.5
      ? "#f87171" // red-400
      : "#e4e4e7"  // zinc-200 — light enough to read on dark bg

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Back link */}
      <Link
        href="/"
        className="text-zinc-600 hover:text-zinc-300 text-sm transition-colors inline-flex items-center gap-1 mb-6"
      >
        ← Roster
      </Link>

      {/* Artist header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">{meta.artist_name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{meta.genre}</span>
            <span className="text-zinc-700">·</span>
            <span>{meta.primary_country}</span>
            <span className="text-zinc-700">·</span>
            <span>Since {debutYear}</span>
            <span className="text-zinc-700">·</span>
            <span>{meta.catalog_size} tracks</span>
            {meta.rank != null && (
              <>
                <span className="text-zinc-700">·</span>
                <span>Rank #{meta.rank}</span>
              </>
            )}
          </div>
        </div>

        {/* Key stats */}
        <div className="shrink-0 flex gap-6 text-right">
          <div>
            <p className="text-xs text-zinc-600 mb-0.5">Composite Score</p>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums leading-none">
              {composite_score.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-600 mb-0.5">Trajectory</p>
            <p
              className="text-xl font-bold tabular-nums leading-none"
              style={{ color: trajectoryColor }}
            >
              {fmtTrajectory(catalog_trajectory_pct)}/mo
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{trajectory_label}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-600 mb-0.5">Streams / day</p>
            <p className="text-xl font-bold text-zinc-100 tabular-nums leading-none">
              {fmtStreams(meta.trailing_12mo_avg_daily_streams)}
            </p>
          </div>
        </div>
      </div>

      {/* Body: charts left, deal placeholder right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* 2×2 chart grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* 1. Total streams */}
            <ChartCard
              title="Total Streams (monthly)"
              hint="Every play of every track, summed per calendar month. Includes both catalog and new-release streams. One listener playing the same song 50× counts as 50 streams."
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly_history} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthTickFmt}
                    {...AXIS_STYLE}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={fmtStreams}
                    {...AXIS_STYLE}
                    width={50}
                  />
                  <Tooltip
                    {...TooltipStyle}
                    formatter={(v: unknown) => [fmtStreams(v as number), "Streams"]}
                    labelFormatter={(v: unknown) => monthLabelFmt(v as string)}
                  />
                  <defs>
                    <linearGradient id="grad-streams" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="streams"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    fill="url(#grad-streams)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#e4e4e7" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Monthly listeners */}
            <ChartCard
              title="Monthly Listeners"
              hint="Unique listeners who played at least one track that month — a reach metric, not volume. 1,000 streams from 10 super-fans vs. 1,000 casual listeners look identical on the streams chart but very different here."
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly_history} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthTickFmt}
                    {...AXIS_STYLE}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={fmtStreams}
                    {...AXIS_STYLE}
                    width={50}
                  />
                  <Tooltip
                    {...TooltipStyle}
                    formatter={(v: unknown) => [fmtStreams(v as number), "Listeners"]}
                    labelFormatter={(v: unknown) => monthLabelFmt(v as string)}
                  />
                  <defs>
                    <linearGradient id="grad-listeners" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="monthly_listeners"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    fill="url(#grad-listeners)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#e4e4e7" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Catalog vs New Release */}
            <ChartCard
              title="Catalog vs. New Release"
              hint="Each point is the total streams for that calendar month. Catalog = tracks older than ~6 months at time of measurement. New Release = tracks released in the trailing ~6 months (frontline). Both series share the same zero baseline — values are not stacked."
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly_history} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthTickFmt}
                    {...AXIS_STYLE}
                    interval={11}
                  />
                  <YAxis
                    tickFormatter={(v: unknown) => fmtStreams(v as number)}
                    {...AXIS_STYLE}
                    width={50}
                  />
                  <Tooltip
                    {...TooltipStyle}
                    formatter={(v: unknown, name: unknown) => [
                      fmtStreams(v as number),
                      name === "catalog_streams" ? "Catalog" : "New Release",
                    ]}
                    labelFormatter={(v: unknown) => monthLabelFmt(v as string)}
                  />
                  <defs>
                    <linearGradient id="grad-catalog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#71717a" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#71717a" stopOpacity={0.25} />
                    </linearGradient>
                    <linearGradient id="grad-newrel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="catalog_streams"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    fill="url(#grad-catalog)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="new_release_streams"
                    stroke="#a78bfa"
                    strokeWidth={1.5}
                    fill="url(#grad-newrel)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <span className="w-2 h-2 rounded-sm bg-zinc-600 inline-block" />
                  Catalog
                </span>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#a78bfa" }} />
                  New Release
                </span>
              </div>
            </ChartCard>

            {/* 4. Follower growth */}
            <ChartCard
              title="Follower Growth"
              hint="Cumulative platform followers over time. A leading indicator of audience loyalty — followers are more likely to stream new releases on day one, which drives recoupment speed in a deal model."
            >
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly_history} margin={CHART_MARGIN}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthTickFmt}
                    {...AXIS_STYLE}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={fmtStreams}
                    {...AXIS_STYLE}
                    width={50}
                  />
                  <Tooltip
                    {...TooltipStyle}
                    formatter={(v: unknown) => [fmtStreams(v as number), "Followers"]}
                    labelFormatter={(v: unknown) => monthLabelFmt(v as string)}
                  />
                  <defs>
                    <linearGradient id="grad-followers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="#a1a1aa"
                    strokeWidth={1.5}
                    fill="url(#grad-followers)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#e4e4e7" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* 5. Catalog trajectory — full width */}
          <ChartCard
            title="Catalog Trajectory — 30-day rolling mean (last 24 months)"
            hint="Daily catalog streams smoothed with a 30-day rolling mean to remove weekday/weekend noise. The dashed line is a linear regression fit — its slope converted to %/month is the Trajectory figure shown in the header."
          >
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={trajectoryData} margin={CHART_MARGIN}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="date"
                  tickFormatter={dailyTickFmt}
                  {...AXIS_STYLE}
                  interval={90}
                />
                <YAxis
                  tickFormatter={fmtStreams}
                  {...AXIS_STYLE}
                  width={50}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  {...TooltipStyle}
                  formatter={(v: unknown, name: unknown) => [
                    fmtStreams(v as number),
                    name === "catalog_rolling_30d" ? "30d Rolling Mean" : "Trend",
                  ]}
                  labelFormatter={(v: unknown) => {
                    const s = v as string
                    return new Date(s).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  }}
                />
                <defs>
                  <linearGradient id="grad-traj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="catalog_rolling_30d"
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                  fill="url(#grad-traj)"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="linear"
                  dataKey="trend"
                  stroke={trajectoryColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <span className="w-4 border-t border-zinc-400 inline-block" />
                Rolling mean
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <span
                  className="w-4 border-t border-dashed inline-block"
                  style={{ borderColor: trajectoryColor }}
                />
                Trend
              </span>
            </div>
          </ChartCard>

          {/* ── Scores panel ───────────────────────────────────────── */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Dimension Scores
              </p>
              <div className="text-right">
                <span className="text-xs text-zinc-600">Composite</span>
                <span className="ml-2 text-lg font-bold text-zinc-100 tabular-nums">
                  {composite_score.toFixed(0)}
                </span>
                <span className="text-xs text-zinc-600"> / 100</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {(Object.keys(SCORE_LABELS) as (keyof ScoreBreakdown)[]).map((key) => (
                <ScoreDimension
                  key={key}
                  label={SCORE_LABELS[key]}
                  score={scores[key]}
                  scoreLabel={score_labels[key]}
                  hint={SCORE_HINTS[key]}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ── Right column: deal configurator placeholder ───────────── */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 h-fit sticky top-20">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Deal Configurator
          </p>
          <p className="text-xs text-zinc-600 mb-6">Phase 2 — coming next</p>

          <div className="space-y-3">
            {[
              "Deal multiple (NPS)",
              "Recoup rate",
              "Label share",
              "Advance amount",
              "Deal term (years)",
              "Growth assumption",
            ].map((label) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                <span className="text-xs text-zinc-600">{label}</span>
                <span className="text-xs text-zinc-800 font-mono">— —</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md bg-zinc-800/40 p-3 text-center">
            <p className="text-xs text-zinc-700">Projected NPV · IRR · Break-even</p>
            <p className="text-xs text-zinc-800 mt-1">available in Phase 2</p>
          </div>
        </div>

      </div>
    </div>
  )
}
