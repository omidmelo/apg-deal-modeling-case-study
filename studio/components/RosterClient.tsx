"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { fmtStreams, fmtTrajectory } from "@/lib/format"
import type { RosterArtist, ScoreBreakdown } from "@/types"

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

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "rank",                            label: "#",           align: "right" },
  { key: "artist_name",                     label: "Artist",      align: "left"  },
  { key: "genre",                           label: "Genre",       align: "left"  },
  { key: "composite_score",                 label: "Score",       align: "right" },
  { key: "catalog_trajectory_pct",          label: "Trajectory",  align: "right" },
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

function TopRecommendationCard({ artist }: { artist: RosterArtist }) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 mb-8">
      <div className="flex items-start justify-between gap-6">

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

        {/* Right: composite score */}
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-500 mb-1">Composite Score</p>
          <p className="text-5xl font-bold text-zinc-100 tabular-nums leading-none">
            {artist.composite_score.toFixed(0)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">out of 100</p>
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
                  <div className="relative group">
                    <span className="text-zinc-500 hover:text-zinc-300 cursor-help text-xs leading-none select-none">ⓘ</span>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-72 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-300 leading-relaxed shadow-xl">
                      {hint}
                    </div>
                  </div>
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
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-6 text-sm text-zinc-500">
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

        <button
          onClick={() => router.push(`/artist/${artist.artist_id}`)}
          className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors"
        >
          View Artist →
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RosterClient({ artists }: { artists: RosterArtist[] }) {
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
    <div className="max-w-7xl mx-auto px-6 py-8">

      <TopRecommendationCard artist={artists[0]} />

      {/* Controls */}
      <div className="flex items-center justify-between mb-3 gap-4">
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
            className="w-44 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
          >
            {genres.map((g) => (
              <option key={g} value={g}>{g === "all" ? "All genres" : g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
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
                  {col.label}
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
  )
}
