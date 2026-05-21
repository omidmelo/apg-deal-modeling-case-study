/**
 * Computes an artist-specific peak multiplier from their streaming history.
 *
 * The deal engine models new-release spikes as:
 *   peakMonthlyStreams = catalogAtRelease × peakMultiplier
 *
 * This helper derives peakMultiplier from observed data:
 *   peak(new_release_streams across all history)
 *   ─────────────────────────────────────────────
 *   avg(catalog_streams over last 24 months)
 *
 * Clamped to [0.05, 8.0] to keep projections grounded:
 *   - Floor of 0.05 handles artists with no observable release history.
 *   - Ceiling of 8.0 prevents one-off viral outliers from dominating projections.
 *
 * Falls back to 0.5 if the catalog average is zero or history is empty.
 */

import type { MonthlyDataPoint } from "@/types"

const RATIO_FLOOR   = 0.05
const RATIO_CEILING = 8.0
const FALLBACK      = 0.5

export function computePeakRatio(history: MonthlyDataPoint[]): number {
  if (!history || history.length === 0) return FALLBACK

  // Catalog baseline: average over the most recent 24 months (or all if fewer)
  const window     = history.slice(-24)
  const avgCatalog = window.reduce((sum, m) => sum + m.catalog_streams, 0) / window.length

  if (avgCatalog <= 0) return FALLBACK

  // Peak release month across entire history (not just the window)
  const peakRelease = Math.max(...history.map((m) => m.new_release_streams))

  if (peakRelease <= 0) return FALLBACK   // Artist has no observable release spikes

  const ratio = peakRelease / avgCatalog
  return Math.min(Math.max(ratio, RATIO_FLOOR), RATIO_CEILING)
}
