/**
 * Investment memo generator.
 *
 * Pure function — takes a RankedRecommendation and returns a structured
 * InvestmentMemo object ready for rendering.  No side effects, no UI imports.
 */

import type { RosterArtist, ScoreBreakdown } from "@/types"
import type { RankedRecommendation }         from "@/lib/rankRoster"

// ─── Output types ─────────────────────────────────────────────────────────────

export interface MemoPoint {
  key:        keyof ScoreBreakdown
  label:      string
  score:      number
  scoreLabel: string
  insight:    string
}

export interface InvestmentMemo {
  thesis:    string
  strengths: MemoPoint[]
  risks:     MemoPoint[]
  deal: {
    termYears:         number
    advanceK:          number
    marketingK:        number
    totalInvestmentK:  number
    labelSharePrePct:  number
    labelSharePostPct: number
    recoupmentRatePct: number
  }
  returns: {
    baseNpv:        number
    worstNpv:       number
    bestNpv:        number
    breakEvenMonth: number | null
    recoupmentMonth: number | null
    totalRoiPct:    number
  }
}

// ─── Dimension labels ─────────────────────────────────────────────────────────

const DIM_LABELS: Record<keyof ScoreBreakdown, string> = {
  catalog_trajectory: "Catalog Trajectory",
  catalog_stability:  "Catalog Stability",
  audience_health:    "Audience Health",
  new_release_perf:   "New Release Performance",
  career_runway:      "Career Runway",
  market_quality:     "Market Quality",
}

// ─── Per-dimension insights ───────────────────────────────────────────────────

function dimInsight(
  key:    keyof ScoreBreakdown,
  score:  number,
  artist: RosterArtist,
): string {
  const traj = artist.catalog_trajectory_pct

  switch (key) {
    case "catalog_trajectory":
      if (score >= 70)
        return `Existing songs are getting more plays every month (+${traj.toFixed(1)}%/mo) without any new releases — the fanbase is still growing on its own.`
      if (score >= 40)
        return `Streams are holding steady with modest growth (${traj.toFixed(1)}%/mo) — not accelerating, but not declining either.`
      if (traj >= 0)
        return `Streams have plateaued (${traj.toFixed(1)}%/mo) — growth has stalled without new music to drive it.`
      return `Streams are slowly declining (${traj.toFixed(1)}%/mo) — the catalog needs new releases to maintain momentum.`

    case "catalog_stability":
      if (score >= 70)
        return "Stream numbers are very consistent month to month — easy to forecast and low financial risk for the label."
      if (score >= 40)
        return "Stream numbers fluctuate somewhat — projections are reasonable but there's some uncertainty."
      return "Stream numbers are unpredictable month to month — the deal carries more risk than the average looks."

    case "audience_health":
      if (score >= 70)
        return "The artist is attracting new listeners, not just replaying to existing fans — the audience is genuinely growing."
      if (score >= 40)
        return "The audience is stable but not really growing — existing fans are loyal, but new discovery has slowed."
      return "The listener base is shrinking — the artist may be losing relevance and needs new music to re-engage fans."

    case "new_release_perf":
      if (score >= 70)
        return "When this artist drops new music, streams spike sharply — strong release momentum that speeds up deal payback."
      if (score >= 40)
        return "New releases get a moderate bump in streams — a decent uplift, but nothing dramatic."
      return "New releases barely move the needle compared to the existing catalog — limited upside from frontline releases in the deal."

    case "career_runway":
      if (score >= 70)
        return "Early in their career — lots of room left to grow, which means the deal benefits from compounding upside over time."
      if (score >= 40)
        return "Mid-career — some growth still ahead, but also a proven track record to anchor projections."
      return "Well-established career — growth ceiling is lower, but the stream floor is proven and reliable."

    case "market_quality":
      if (score >= 70)
        return "Most of this artist's listeners are in high-paying markets like the US or UK, where streaming royalties are the highest globally."
      if (score >= 40)
        return "The artist's audience is spread across mid-tier markets — royalty rates are decent but not top of the range."
      return "Most listeners are in markets where streaming pays lower royalties — the same stream count generates less revenue than it would from a US audience."

    default:
      return ""
  }
}

// ─── Thesis ───────────────────────────────────────────────────────────────────

function buildThesis(
  artist:    RosterArtist,
  strengths: MemoPoint[],
  risks:     MemoPoint[],
  returns:   InvestmentMemo["returns"],
): string {
  const traj = artist.catalog_trajectory_pct
  const trajPhrase =
    traj >= 1.5  ? `a ${traj.toFixed(1)}%/month accelerating catalog` :
    traj >= 0.3  ? `a steady ${traj.toFixed(1)}%/month catalog trajectory` :
    traj >= -0.3 ? "a near-flat catalog trajectory" :
                   `a softening catalog (${traj.toFixed(1)}%/month)`

  const top1 = strengths[0]
  const top2 = strengths[1]
  const strengthPhrase = top1
    ? ` backed by strong ${top1.label.toLowerCase()}${top2 ? ` and ${top2.label.toLowerCase()}` : ""}`
    : ""

  const bePhrase =
    returns.breakEvenMonth === null              ? "recoupment outside the base-case window" :
    returns.breakEvenMonth <= 18                 ? `fast recoupment (month ${returns.breakEvenMonth})` :
    returns.breakEvenMonth <= 36                 ? `a manageable break-even at month ${returns.breakEvenMonth}` :
                                                   `a longer break-even horizon (month ${returns.breakEvenMonth})`

  const riskClause = risks.length > 0
    ? ` The primary risk factor is ${risks[0].label.toLowerCase()} — ${risks[0].insight.toLowerCase()}`
    : ""

  return (
    `${artist.artist_name} presents ${trajPhrase}${strengthPhrase}. ` +
    `The optimizer structures a deal targeting ${bePhrase} at a 12% hurdle rate.` +
    riskClause
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateMemo(rec: RankedRecommendation): InvestmentMemo {
  const { artist, optimizedParams } = rec

  const points = (Object.keys(artist.scores) as (keyof ScoreBreakdown)[]).map((key) => ({
    key,
    label:      DIM_LABELS[key],
    score:      artist.scores[key],
    scoreLabel: artist.score_labels[key],
    insight:    dimInsight(key, artist.scores[key], artist),
  }))

  const strengths = points.filter((p) => p.score >= 65).sort((a, b) => b.score - a.score)
  const risks     = points.filter((p) => p.score <  40).sort((a, b) => a.score - b.score)

  const deal = {
    termYears:         optimizedParams.contractTermYears,
    advanceK:          Math.round(optimizedParams.advanceUsd / 1_000),
    marketingK:        Math.round(optimizedParams.marketingBudgetUsd / 1_000),
    totalInvestmentK:  Math.round((optimizedParams.advanceUsd + optimizedParams.marketingBudgetUsd) / 1_000),
    labelSharePrePct:  optimizedParams.labelSharePreRecoupPct,
    labelSharePostPct: optimizedParams.labelSharePostRecoupPct,
    recoupmentRatePct: optimizedParams.recoupmentRatePct,
  }

  const returns = {
    baseNpv:         rec.optimizedNpv,
    worstNpv:        rec.worstNpv,
    bestNpv:         rec.bestNpv,
    breakEvenMonth:  rec.breakEvenMonth,
    recoupmentMonth: rec.recoupmentMonth,
    totalRoiPct:     rec.totalRoiPct,
  }

  return {
    thesis:    buildThesis(artist, strengths, risks, returns),
    strengths,
    risks,
    deal,
    returns,
  }
}
