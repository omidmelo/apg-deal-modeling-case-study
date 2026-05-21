"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { fmtStreams, fmtTrajectory, fmtUsd } from "@/lib/format"
import { InfoTooltip } from "@/components/InfoTooltip"
import type { RosterArtist, ScoreBreakdown } from "@/types"
import type { RankedRecommendation } from "@/lib/rankRoster"
import type { InvestmentMemo as Memo } from "@/lib/generateMemo"

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey =
  | "rank"
  | "artist_name"
  | "genre"
  | "composite_score"
  | "catalog_trajectory_pct"
  | "trailing_12mo_avg_daily_streams"

type SortDir = "asc" | "desc"

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_DIMENSION_LABELS: Record<keyof ScoreBreakdown, string> = {
  catalog_trajectory: "Catalog Trajectory",
  catalog_stability:  "Catalog Stability",
  audience_health:    "Audience Health",
  new_release_perf:   "New Release Performance",
  career_runway:      "Career Runway",
  market_quality:     "Market Quality",
}

const SCORE_HINTS: Record<keyof ScoreBreakdown, string> = {
  catalog_trajectory:
    "How fast catalog streams are growing month-over-month, scored relative to the rest of the roster (0 = slowest grower, 100 = fastest). Based on a trend line fitted to the last 24 months of data. Worth 25% of the composite score.",
  catalog_stability:
    "How consistent the stream numbers are month to month, scored relative to the roster (0 = most volatile, 100 = most consistent). Stable streams mean more predictable revenue. Worth 20% of the composite score.",
  audience_health:
    "Whether the artist is attracting new listeners, not just replaying to existing fans. Combines recent listener growth rate with absolute listener level, scored relative to the roster. Worth 20% of the composite score.",
  new_release_perf:
    "How big of a streaming spike new releases generate relative to the catalog baseline, scored relative to the roster. A high score means new music significantly accelerates stream volume. Worth 15% of the composite score.",
  career_runway:
    "How early the artist is in their career, scored relative to the roster. Earlier-career artists score higher — more room to grow. Worth 10% of the composite score.",
  market_quality:
    "How lucrative the artist's primary listener market is. A US audience pays roughly 2–3× more per stream than listeners in lower-tier markets. Scored on an absolute scale (not relative to the roster). Worth 10% of the composite score.",
}

const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; hint?: string }[] = [
  { key: "rank",                            label: "#",               align: "right" },
  { key: "artist_name",                     label: "Artist",          align: "left"  },
  { key: "genre",                           label: "Genre",           align: "left"  },
  { key: "composite_score",                 label: "Score",           align: "right"  },
  {
    key:   "catalog_trajectory_pct",
    label: "Trajectory",
    align: "right",
    hint:  "How fast the artist's catalog streams are growing month-over-month, based on a trend line fitted to the last 24 months. Positive = growing on its own; negative = slowly fading. Excludes new-release spikes — this is purely organic catalog momentum.",
  },
  { key: "trailing_12mo_avg_daily_streams", label: "Avg streams/day", align: "right" },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-16 h-px bg-zinc-700 rounded-full overflow-hidden">
        <div className="h-full bg-zinc-300 rounded-full" style={{ width: `${score}%` }} />
      </div>
      <span className="tabular-nums text-zinc-300 w-7 text-right text-sm">
        {score.toFixed(0)}
      </span>
    </div>
  )
}

function TrajectoryCell({ pct }: { pct: number }) {
  const positive = pct >= 0.5
  const negative = pct <= -0.5
  const color = positive ? "text-green-400" : negative ? "text-red-400" : "text-zinc-500"
  const icon  = positive ? "↑" : negative ? "↓" : "→"
  return (
    <span className={`${color} tabular-nums text-sm`}>
      {icon} {fmtTrajectory(pct)}/mo
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-zinc-700 ml-1 text-xs">↕</span>
  return <span className="text-zinc-300 ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>
}

// ─── Top Recommendation Card ──────────────────────────────────────────────────

function ScorePip({ score }: { score: number }) {
  const color = score >= 65 ? "bg-green-400" : score >= 40 ? "bg-zinc-400" : "bg-red-400"
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0 mt-1`} />
}

function fmtMonth(m: number | null) {
  return m === null ? "—" : `Month ${m}`
}

function TopRecommendationCard({
  artist,
  optimizedNpv,
  memo,
}: RankedRecommendation & { memo: Memo }) {
  const router          = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">

        {/* Left: identity */}
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">
            Top Recommendation
          </p>
          <h2 className="text-2xl font-bold text-zinc-100 mb-1">{artist.artist_name}</h2>
          <p className="text-zinc-400 text-sm">
            {artist.genre} &middot; {artist.primary_country} &middot; {artist.catalog_size} tracks
          </p>
        </div>

        {/* Right: scores */}
        <div className="flex gap-6 sm:shrink-0 sm:text-right">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Optimized NPV</p>
            <p className="text-4xl sm:text-5xl font-bold text-green-400 tabular-nums leading-none">
              {fmtUsd(optimizedNpv)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">at 12% cost of capital</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Score</p>
            <p className="text-4xl sm:text-5xl font-bold text-zinc-100 tabular-nums leading-none">
              {artist.composite_score.toFixed(0)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">out of 100</p>
          </div>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-4 border-t border-zinc-800 pt-5">
        {(Object.keys(SCORE_DIMENSION_LABELS) as (keyof ScoreBreakdown)[]).map((key) => {
          const val   = artist.scores[key]
          const label = artist.score_labels[key]
          const hint  = SCORE_HINTS[key]
          return (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="flex items-center gap-1 text-xs text-zinc-400">
                  {SCORE_DIMENSION_LABELS[key]}
                  <InfoTooltip content={hint} />
                </span>
                <span className="text-xs text-zinc-400 tabular-nums ml-3">
                  {val.toFixed(0)}
                  <span className="text-zinc-600"> · {label}</span>
                </span>
              </div>
              <div className="h-px bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-500 rounded-full" style={{ width: `${val}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-zinc-500">
          <span>
            Trajectory <TrajectoryCell pct={artist.catalog_trajectory_pct} />
            <span className="text-zinc-600 ml-1">· {artist.trajectory_label}</span>
          </span>
          <span>
            Streams/day{" "}
            <span className="text-zinc-300 font-medium">
              {fmtStreams(artist.trailing_12mo_avg_daily_streams)}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => router.push(`/artist/${artist.artist_id}`)}
            className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors"
          >
            View Artist →
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            title={open ? "Hide investment memo" : "Show investment memo"}
            className="px-3 py-2 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 text-xs transition-colors"
          >
            {open ? "▲" : "▼"} Memo
          </button>
        </div>
      </div>

      {/* ── Investment memo — collapsible ─────────────────────────────────── */}
      {open && (
        <div className="mt-5 border-t border-zinc-800 pt-5 space-y-5">

          {/* Thesis */}
          <p className="text-sm text-zinc-300 leading-relaxed">{memo.thesis}</p>

          {/* Strengths + Risks */}
          {(memo.strengths.length > 0 || memo.risks.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memo.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                    Key Strengths
                  </p>
                  <ul className="space-y-2.5">
                    {memo.strengths.map((s) => (
                      <li key={s.key} className="flex gap-2">
                        <ScorePip score={s.score} />
                        <div>
                          <span className="text-xs font-medium text-zinc-300">{s.label}</span>
                          <span className="text-xs text-zinc-600 ml-1.5 tabular-nums">{s.score.toFixed(0)}</span>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{s.insight}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {memo.risks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                    Risk Factors
                  </p>
                  <ul className="space-y-2.5">
                    {memo.risks.map((r) => (
                      <li key={r.key} className="flex gap-2">
                        <ScorePip score={r.score} />
                        <div>
                          <span className="text-xs font-medium text-zinc-300">{r.label}</span>
                          <span className="text-xs text-zinc-600 ml-1.5 tabular-nums">{r.score.toFixed(0)}</span>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{r.insight}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommended terms */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Recommended Terms
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Term",       value: `${memo.deal.termYears}yr`                                         },
                { label: "Advance",    value: fmtUsd(memo.deal.advanceK * 1_000)                                  },
                { label: "Marketing",  value: fmtUsd(memo.deal.marketingK * 1_000)                               },
                { label: "Investment", value: `${fmtUsd(memo.deal.totalInvestmentK * 1_000)} total`              },
                { label: "Split",      value: `${memo.deal.labelSharePrePct}/${memo.deal.labelSharePostPct}`      },
                { label: "Payback Rate", value: `${memo.deal.recoupmentRatePct}%`                               },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col px-3 py-2 rounded-md bg-zinc-800/60 border border-zinc-700/40">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</span>
                  <span className="text-xs font-semibold text-zinc-200 tabular-nums mt-0.5">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-2">Split = label's % of royalties — first number applies until the advance is paid back, second number applies after.</p>
          </div>

          {/* Projected returns */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
              Projected Returns
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {([
                { scenario: "Worst", npv: memo.returns.worstNpv },
                { scenario: "Base",  npv: memo.returns.baseNpv  },
                { scenario: "Best",  npv: memo.returns.bestNpv  },
              ] as const).map(({ scenario, npv }) => {
                const color = npv > 0 ? "text-green-400" : npv < 0 ? "text-red-400" : "text-zinc-100"
                return (
                <div key={scenario} className="flex flex-col items-center py-3 rounded-md bg-zinc-800/60 border border-zinc-700/40">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{scenario}</span>
                  <span className={`text-lg font-bold tabular-nums ${color}`}>{fmtUsd(npv)}</span>
                  <span className="text-[10px] text-zinc-600 mt-0.5">NPV</span>
                </div>
              )})}
            </div>
            <div className="flex gap-6 text-xs text-zinc-500">
              <span>Break-even <span className="text-zinc-300 font-medium">{fmtMonth(memo.returns.breakEvenMonth)}</span></span>
              <span>Advance paid back <span className="text-zinc-300 font-medium">{fmtMonth(memo.returns.recoupmentMonth)}</span></span>
              <span>ROI <span className="text-zinc-300 font-medium">{memo.returns.totalRoiPct.toFixed(0)}%</span></span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RosterClient({
  artists,
  topRecommendation,
  memo,
}: {
  artists:           RosterArtist[]
  topRecommendation: RankedRecommendation
  memo:              Memo
}) {
  const router = useRouter()

  const [search,      setSearch]      = useState("")
  const [genreFilter, setGenreFilter] = useState("all")
  const [sortKey,     setSortKey]     = useState<SortKey>("rank")
  const [sortDir,     setSortDir]     = useState<SortDir>("asc")

  const genres = useMemo(
    () => ["all", ...Array.from(new Set(artists.map((a) => a.genre))).sort()],
    [artists],
  )

  const filtered = useMemo(() => {
    let result = [...artists]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.artist_name.toLowerCase().includes(q))
    }
    if (genreFilter !== "all") {
      result = result.filter((a) => a.genre === genreFilter)
    }
    result.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return result
  }, [artists, search, genreFilter, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "rank" || key === "artist_name" || key === "genre" ? "asc" : "desc")
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

      <TopRecommendationCard {...topRecommendation} memo={memo} />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">Full Roster</h2>
          <p className="text-xs text-zinc-600 mt-0.5">{filtered.length} of {artists.length} artists</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search artist…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:w-44 min-w-0 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="shrink-0 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          >
            {genres.map((g) => (
              <option key={g} value={g}>{g === "all" ? "All genres" : g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={[
                    "px-4 py-3 text-xs font-medium uppercase tracking-wider",
                    "cursor-pointer select-none transition-colors hover:text-zinc-200",
                    col.align === "right" ? "text-right" : "text-left",
                    sortKey === col.key ? "text-zinc-200" : "text-zinc-500",
                  ].join(" ")}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.hint && <InfoTooltip content={col.hint} direction="down" />}
                  </span>
                  <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-left">
                Country
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr className="bg-zinc-950">
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-600 text-sm">
                  No artists match your filters.
                </td>
              </tr>
            )}
            {filtered.map((artist) => (
              <tr
                key={artist.artist_id}
                onClick={() => router.push(`/artist/${artist.artist_id}`)}
                className="border-b border-zinc-800/50 cursor-pointer bg-zinc-950 hover:bg-zinc-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-right tabular-nums text-zinc-500 w-10">
                  {artist.rank}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {artist.artist_name}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {artist.genre}
                </td>
                <td className="px-4 py-3">
                  <ScoreBar score={artist.composite_score} />
                </td>
                <td className="px-4 py-3 text-right">
                  <TrajectoryCell pct={artist.catalog_trajectory_pct} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-400">
                  {fmtStreams(artist.trailing_12mo_avg_daily_streams)}
                </td>
                <td className="px-4 py-3 text-zinc-500 text-sm">
                  {artist.primary_country}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
