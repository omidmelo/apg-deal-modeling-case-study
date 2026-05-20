/** Format a large stream count to a short string: 1_200_000 → "1.2M", 130_000_000 → "130M" */
export function fmtStreams(n: number): string {
  if (n >= 100_000_000) return `${Math.round(n / 1_000_000)}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

/** Format a trajectory % with sign: 2.1 → "+2.10%" */
export function fmtTrajectory(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
}

/** Format a USD amount: 500000 → "$500K" */
export function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
