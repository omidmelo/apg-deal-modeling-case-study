/**
 * Server-side roster ranking by optimized deal NPV.
 *
 * For each artist:
 *   1. Build ArtistAnchors from roster data
 *   2. Derive artist-specific advance tier + constraints
 *   3. Run optimizeDeal() to find the best deal structure
 *   4. Run runDeal() on that structure to get base NPV
 *
 * The artist with the highest optimized NPV is the top recommendation.
 * Falls back to default params if no feasible optimized deal exists.
 */

import { runDeal }         from "@/lib/dealEngine"
import {
  optimizeDeal,
  getAdvanceTier,
  DEFAULT_CONSTRAINTS,
}                          from "@/lib/optimizeDeal"
import { DEFAULT_PARAMS, toEngineInputs } from "@/lib/dealParams"
import type { DealParams }                from "@/lib/dealParams"
import { computePeakRatio }               from "@/lib/peakRatio"
import { getArtist }                      from "@/lib/data"
import type { RosterArtist }              from "@/types"
import type { ArtistAnchors }             from "@/types/deal"

export interface RankedRecommendation {
  artist:          RosterArtist
  optimizedParams: DealParams
  optimizedNpv:    number
  worstNpv:        number
  bestNpv:         number
  breakEvenMonth:  number | null
  recoupmentMonth: number | null
  totalRoiPct:     number
}

export function getTopRecommendation(roster: RosterArtist[]): RankedRecommendation {
  let best: RankedRecommendation | null = null

  for (const artist of roster) {
    const anchors: ArtistAnchors = {
      avgDailyStreams:        artist.trailing_12mo_avg_daily_streams,
      catalogTrajectoryPct:  artist.catalog_trajectory_pct,
      catalogStabilityScore: artist.scores.catalog_stability,
    }

    const tier = getAdvanceTier(artist.trailing_12mo_avg_daily_streams)

    const constraints = {
      ...DEFAULT_CONSTRAINTS,
      minAdvanceK:    tier.minK,
      maxInvestmentK: tier.maxK + 300,
    }

    // Use each artist's observed peak-release / avg-catalog ratio instead of
    // the global hardcoded default.  Falls back gracefully if detail is missing.
    const detail         = getArtist(artist.artist_id)
    const peakMultiplier = detail ? computePeakRatio(detail.monthly_history) : DEFAULT_PARAMS.peakMultiplier

    const seedParams = { ...DEFAULT_PARAMS, advanceUsd: tier.defaultK * 1_000, peakMultiplier }
    const optimized  = optimizeDeal(seedParams, anchors, constraints)
    const params     = optimized ?? seedParams

    const projection = runDeal(toEngineInputs(params), anchors)
    const npv        = projection.base.npv

    if (best === null || npv > best.optimizedNpv) {
      best = {
        artist,
        optimizedParams: params,
        optimizedNpv:    npv,
        worstNpv:        projection.worst.npv,
        bestNpv:         projection.best.npv,
        breakEvenMonth:  projection.base.breakEvenMonth,
        recoupmentMonth: projection.base.recoupmentMonth,
        totalRoiPct:     projection.base.totalROIPct,
      }
    }
  }

  // Fallback: should never be reached with a non-empty roster
  if (!best) {
    const artist  = roster[0]
    const anchors: ArtistAnchors = {
      avgDailyStreams:        artist.trailing_12mo_avg_daily_streams,
      catalogTrajectoryPct:  artist.catalog_trajectory_pct,
      catalogStabilityScore: artist.scores.catalog_stability,
    }
    const detail         = getArtist(artist.artist_id)
    const peakMultiplier = detail ? computePeakRatio(detail.monthly_history) : DEFAULT_PARAMS.peakMultiplier
    const params         = { ...DEFAULT_PARAMS, peakMultiplier }
    const projection     = runDeal(toEngineInputs(params), anchors)
    best = {
      artist,
      optimizedParams: params,
      optimizedNpv:    projection.base.npv,
      worstNpv:        projection.worst.npv,
      bestNpv:         projection.best.npv,
      breakEvenMonth:  projection.base.breakEvenMonth,
      recoupmentMonth: projection.base.recoupmentMonth,
      totalRoiPct:     projection.base.totalROIPct,
    }
  }

  return best
}
