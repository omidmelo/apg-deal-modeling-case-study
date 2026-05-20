// ─── Score types ──────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  catalog_trajectory: number
  catalog_stability: number
  audience_health: number
  new_release_perf: number
  career_runway: number
  market_quality: number
}

export interface ScoreLabels {
  catalog_trajectory: string
  catalog_stability: string
  audience_health: string
  new_release_perf: string
  career_runway: string
  market_quality: string
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export interface RosterArtist {
  artist_id: string
  artist_name: string
  genre: string
  primary_country: string
  catalog_size: number
  debut_date: string
  trailing_12mo_avg_daily_streams: number
  composite_score: number
  catalog_trajectory_pct: number
  trajectory_label: string
  scores: ScoreBreakdown
  score_labels: ScoreLabels
  rank: number
}

// ─── Artist detail ────────────────────────────────────────────────────────────

export interface ArtistMeta {
  artist_id: string
  artist_name: string
  genre: string
  primary_country: string
  catalog_size: number
  debut_date: string
  trailing_12mo_avg_daily_streams: number
  rank: number | null
}

export interface MonthlyDataPoint {
  month: string                 // "YYYY-MM"
  streams: number
  catalog_streams: number
  new_release_streams: number
  monthly_listeners: number
  followers: number
}

export interface DailyDataPoint {
  date: string                  // "YYYY-MM-DD"
  streams: number
  catalog_streams: number
  new_release_streams: number
  monthly_listeners: number
  followers: number
  catalog_rolling_30d: number | null  // pre-computed 30-day rolling mean
}

export interface ArtistDetail {
  meta: ArtistMeta
  composite_score: number
  catalog_trajectory_pct: number
  trajectory_label: string
  scores: ScoreBreakdown
  score_labels: ScoreLabels
  monthly_history: MonthlyDataPoint[]
  recent_daily: DailyDataPoint[]
}
