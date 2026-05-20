#!/usr/bin/env python3
"""
APG Deal Modeling Tool — Data Preprocessing Script

Run this once, locally, against the raw CSVs.
Outputs roster.json and per-artist JSON files for the Next.js frontend.

Usage:
    pip install -r requirements.txt
    python preprocess.py

Output (copy to your Next.js project):
    processed/data/roster.json
    processed/data/artists/A001.json ... A100.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

# ── Config ─────────────────────────────────────────────────────────────────────

DATA_DIR   = Path(__file__).parent / "data"
OUTPUT_DIR = Path(__file__).parent / "processed" / "data"

ROYALTY_RATE = 0.0035  # $ per stream

# Composite score weights — must sum to 1.0
SCORE_WEIGHTS = {
    "catalog_trajectory": 0.25,  # growing catalog = growing label income
    "catalog_stability":  0.20,  # predictable cash flow
    "audience_health":    0.20,  # fan base size and trajectory
    "new_release_perf":   0.15,  # frontline revenue potential
    "career_runway":      0.10,  # how much upside remains
    "market_quality":     0.10,  # royalty market size
}

# Streaming market tier by primary country (0–100)
# Based on DSP market size and average royalty yield
MARKET_TIER = {
    "US":          100,
    "UK":           90,
    "Germany":      85,
    "France":       82,
    "Australia":    80,
    "Canada":       78,
    "Sweden":       75,
    "Brazil":       70,
    "South Korea":  68,
    "Japan":        65,
    "Mexico":       60,
    "Spain":        58,
    "Nigeria":      50,
}

# ── Scoring helpers ────────────────────────────────────────────────────────────

def percentile_scores(values: list) -> list:
    """
    Converts a list of raw metric values into 0–100 scores
    using percentile rank across the roster.
    More robust than min-max: one outlier won't compress everyone else.
    """
    arr = np.array(values, dtype=float)
    n   = len(arr)
    return [round(float(np.sum(arr <= v)) / n * 100, 1) for v in arr]


def score_label(score: float) -> str:
    if score >= 80: return "Strong"
    if score >= 60: return "Moderate"
    if score >= 40: return "Developing"
    return "Weak"


def trajectory_label(pct: float) -> str:
    if pct >= 2.0:  return "Accelerating"
    if pct >= 0.5:  return "Growing"
    if pct >= -0.5: return "Stable"
    if pct >= -2.0: return "Declining"
    return "Falling"


# ── Per-artist metric computations ─────────────────────────────────────────────

def compute_catalog_trajectory(df: pd.DataFrame) -> float:
    """
    Catalog trajectory as % change per month.

    Method:
      1. Filter to last 24 months of daily data.
      2. Apply 30-day rolling mean to catalog_streams (removes day-of-week noise).
      3. Fit a linear regression (numpy polyfit) to get slope in streams/day.
      4. Convert: (slope * 30 / mean_streams) * 100  → % per month.
    """
    max_date = df["date"].max()
    cutoff   = max_date - pd.DateOffset(months=24)
    recent   = df[df["date"] >= cutoff].sort_values("date")

    rolling = (
        recent["catalog_streams"]
        .rolling(window=30, min_periods=15)
        .mean()
        .dropna()
        .values
    )

    if len(rolling) < 30:
        return 0.0

    x    = np.arange(len(rolling), dtype=float)
    slope = np.polyfit(x, rolling, 1)[0]  # streams per day
    mean  = rolling.mean()

    if mean <= 0:
        return 0.0

    return round(float(slope * 30 / mean * 100), 3)


def compute_raw_metrics(artist: pd.Series, df: pd.DataFrame) -> dict:
    """Compute un-normalized raw metrics for a single artist."""
    max_date    = df["date"].max()
    cutoff_24mo = max_date - pd.DateOffset(months=24)
    cutoff_12mo = max_date - pd.DateOffset(months=12)

    r24 = df[df["date"] >= cutoff_24mo]
    r12 = df[df["date"] >= cutoff_12mo]

    # Catalog trajectory %/month
    traj_pct = compute_catalog_trajectory(df)

    # Catalog stability: inverse coefficient of variation of monthly catalog streams
    # Low CV = consistent income = high stability
    monthly_cat = r24.set_index("date").resample("ME")["catalog_streams"].sum()
    cv           = (monthly_cat.std() / monthly_cat.mean()) if monthly_cat.mean() > 0 else 1.0
    stability    = 1.0 / (1.0 + float(cv))

    # Audience health: blend of listeners growth rate + absolute listener level
    if len(r12) >= 60:
        mid      = len(r12) // 2
        first_h  = r12.iloc[:mid]["monthly_listeners"].mean()
        second_h = r12.iloc[mid:]["monthly_listeners"].mean()
        growth   = float((second_h - first_h) / first_h) if first_h > 0 else 0.0
    else:
        growth = 0.0
    avg_listeners = float(r12["monthly_listeners"].mean())

    # New release performance: peak 30-day avg of new_release_streams / avg catalog_streams
    # Captures how strongly new releases spike relative to the catalog baseline
    peak_new = float(
        r24["new_release_streams"]
        .rolling(30, min_periods=7)
        .mean()
        .max()
    )
    avg_catalog   = float(r24["catalog_streams"].mean())
    new_rel_ratio = peak_new / (avg_catalog + 1)

    # Career runway: newer debut = more growth potential ahead
    career_years = (max_date - pd.Timestamp(artist["debut_date"])).days / 365.25
    runway       = 1.0 / (1.0 + career_years)

    # Market quality: tier score from primary country
    market = MARKET_TIER.get(str(artist["primary_country"]), 55) / 100.0

    # Trailing 12-month average daily streams (for roster table display)
    trailing_streams = float(r12["streams"].mean())

    return {
        "traj_pct":        traj_pct,
        "stability":       stability,
        "health_growth":   growth,
        "health_level":    avg_listeners,
        "new_rel_ratio":   new_rel_ratio,
        "runway":          runway,
        "market":          market,
        "trailing_streams": round(trailing_streams),
    }


def compute_monthly_history(df: pd.DataFrame) -> list:
    """
    Aggregate daily data to monthly for the full 10-year history.
    Used for the streaming history charts (120 data points vs 3,650).

    Excludes the current (partial) month so the last bar on every chart
    reflects a full calendar month rather than a mid-month partial sum.
    """
    # Drop days in the current (incomplete) month
    current_month_start = pd.Timestamp.today().normalize().replace(day=1)
    df = df[df["date"] < current_month_start]

    monthly = (
        df.set_index("date")
        .resample("ME")
        .agg(
            streams             =("streams",             "sum"),
            catalog_streams     =("catalog_streams",     "sum"),
            new_release_streams =("new_release_streams", "sum"),
            monthly_listeners   =("monthly_listeners",   "mean"),
            followers           =("followers",           "last"),
        )
        .round(0)
        .reset_index()
    )
    return [
        {
            "month":               row["date"].strftime("%Y-%m"),
            "streams":             int(row["streams"]),
            "catalog_streams":     int(row["catalog_streams"]),
            "new_release_streams": int(row["new_release_streams"]),
            "monthly_listeners":   int(row["monthly_listeners"]),
            "followers":           int(row["followers"]),
        }
        for _, row in monthly.iterrows()
    ]


def compute_recent_daily(df: pd.DataFrame) -> list:
    """
    Last 24 months of daily data (~730 rows).
    Includes a pre-computed 30-day rolling mean of catalog_streams
    so the frontend can plot the trajectory chart without any math.
    """
    max_date = df["date"].max()
    cutoff   = max_date - pd.DateOffset(months=24)
    recent   = df[df["date"] >= cutoff].sort_values("date").copy()

    recent["catalog_rolling_30d"] = (
        recent["catalog_streams"]
        .rolling(window=30, min_periods=15)
        .mean()
        .round(0)
    )

    return [
        {
            "date":                row["date"].strftime("%Y-%m-%d"),
            "streams":             int(row["streams"]),
            "catalog_streams":     int(row["catalog_streams"]),
            "new_release_streams": int(row["new_release_streams"]),
            "monthly_listeners":   int(row["monthly_listeners"]),
            "followers":           int(row["followers"]),
            "catalog_rolling_30d": (
                None if pd.isna(row["catalog_rolling_30d"])
                else int(row["catalog_rolling_30d"])
            ),
        }
        for _, row in recent.iterrows()
    ]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # Create output directories
    artists_dir = OUTPUT_DIR / "artists"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    artists_dir.mkdir(exist_ok=True)

    # ── Load CSVs ──────────────────────────────────────────────────────────────
    print("Loading artists.csv...")
    artists_df = pd.read_csv(DATA_DIR / "artists.csv", parse_dates=["debut_date"])

    print("Loading streaming_data.csv (~22 MB)...")
    streaming_df = pd.read_csv(DATA_DIR / "streaming_data.csv", parse_dates=["date"])
    print(f"  {len(streaming_df):,} rows loaded\n")

    grouped = streaming_df.groupby("artist_id")

    # ── Pass 1: compute raw metrics for every artist ───────────────────────────
    print("Pass 1/2 — computing raw metrics...")
    raw_list = []

    for i, (_, artist) in enumerate(artists_df.iterrows(), 1):
        aid = artist["artist_id"]
        if aid not in grouped.groups:
            print(f"  WARNING: no streaming data for {aid}, skipping")
            continue
        raw = compute_raw_metrics(artist, grouped.get_group(aid))
        raw["artist_id"] = aid
        raw_list.append(raw)
        if i % 25 == 0:
            print(f"  {i}/100")

    # ── Pass 2: normalise to 0–100 scores across full roster ──────────────────
    print("\nPass 2/2 — normalising scores across roster...")

    traj_scores  = percentile_scores([m["traj_pct"]      for m in raw_list])
    stab_scores  = percentile_scores([m["stability"]     for m in raw_list])
    hg_scores    = percentile_scores([m["health_growth"] for m in raw_list])
    hl_scores    = percentile_scores([m["health_level"]  for m in raw_list])
    nr_scores    = percentile_scores([m["new_rel_ratio"] for m in raw_list])
    run_scores   = percentile_scores([m["runway"]        for m in raw_list])
    # Market quality: absolute tier (not relative — US is always a better market than Nigeria)
    mkt_scores   = [round(m["market"] * 100, 1) for m in raw_list]
    # Audience health: average of growth rate rank and absolute listener rank
    health_scores = [round((g + l) / 2, 1) for g, l in zip(hg_scores, hl_scores)]

    scored_list = []
    for i, m in enumerate(raw_list):
        s = {
            "catalog_trajectory": traj_scores[i],
            "catalog_stability":  stab_scores[i],
            "audience_health":    health_scores[i],
            "new_release_perf":   nr_scores[i],
            "career_runway":      run_scores[i],
            "market_quality":     mkt_scores[i],
        }
        composite = round(sum(s[k] * SCORE_WEIGHTS[k] for k in SCORE_WEIGHTS), 1)
        scored_list.append({**m, "scores": s, "composite_score": composite})

    scored_by_id = {m["artist_id"]: m for m in scored_list}

    # ── Build roster.json ──────────────────────────────────────────────────────
    print("\nBuilding roster.json...")
    roster = []
    for _, artist in artists_df.iterrows():
        aid = artist["artist_id"]
        if aid not in scored_by_id:
            continue
        m = scored_by_id[aid]
        roster.append({
            "artist_id":                       aid,
            "artist_name":                     str(artist["artist_name"]),
            "genre":                           str(artist["genre"]),
            "primary_country":                 str(artist["primary_country"]),
            "catalog_size":                    int(artist["catalog_size"]),
            "debut_date":                      artist["debut_date"].strftime("%Y-%m-%d"),
            "trailing_12mo_avg_daily_streams": int(m["trailing_streams"]),
            "composite_score":                 m["composite_score"],
            "catalog_trajectory_pct":          m["traj_pct"],
            "trajectory_label":                trajectory_label(m["traj_pct"]),
            "scores":                          m["scores"],
            "score_labels":                    {k: score_label(v) for k, v in m["scores"].items()},
        })

    # Sort by composite score, assign rank
    roster.sort(key=lambda x: x["composite_score"], reverse=True)
    for rank, a in enumerate(roster, 1):
        a["rank"] = rank

    with open(OUTPUT_DIR / "roster.json", "w") as f:
        json.dump(roster, f, indent=2)
    print(f"  Saved → {OUTPUT_DIR}/roster.json  ({len(roster)} artists)")

    # ── Build per-artist JSON files ────────────────────────────────────────────
    print("\nBuilding per-artist JSON files...")
    for i, (_, artist) in enumerate(artists_df.iterrows(), 1):
        aid = artist["artist_id"]
        if aid not in scored_by_id or aid not in grouped.groups:
            continue

        m         = scored_by_id[aid]
        artist_df = grouped.get_group(aid)
        rank      = next((a["rank"] for a in roster if a["artist_id"] == aid), None)

        payload = {
            "meta": {
                "artist_id":                       aid,
                "artist_name":                     str(artist["artist_name"]),
                "genre":                           str(artist["genre"]),
                "primary_country":                 str(artist["primary_country"]),
                "catalog_size":                    int(artist["catalog_size"]),
                "debut_date":                      artist["debut_date"].strftime("%Y-%m-%d"),
                "trailing_12mo_avg_daily_streams": int(m["trailing_streams"]),
                "rank":                            rank,
            },
            "composite_score":        m["composite_score"],
            "catalog_trajectory_pct": m["traj_pct"],
            "trajectory_label":       trajectory_label(m["traj_pct"]),
            "scores":                 m["scores"],
            "score_labels":           {k: score_label(v) for k, v in m["scores"].items()},
            "monthly_history":        compute_monthly_history(artist_df),
            "recent_daily":           compute_recent_daily(artist_df),
        }

        with open(artists_dir / f"{aid}.json", "w") as f:
            json.dump(payload, f, separators=(",", ":"))  # compact — smaller file size

        if i % 25 == 0:
            print(f"  {i}/100 files written...")

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print("✅  Preprocessing complete!")
    print(f"{'─' * 60}")
    print(f"  roster.json      → {OUTPUT_DIR}/roster.json")
    print(f"  Per-artist files → {OUTPUT_DIR}/artists/  ({len(roster)} files)")
    print(f"\n  Next step: copy processed/data/ into your Next.js public/ folder")
    print(f"{'─' * 60}")
    print("\n  Top 10 recommended artists:\n")
    print(f"  {'#':<4} {'Artist':<22} {'Score':>6}  {'Trajectory':>12}  {'Streams/day':>12}  {'Genre':<12}")
    print(f"  {'─'*4} {'─'*22} {'─'*6}  {'─'*12}  {'─'*12}  {'─'*12}")
    for a in roster[:10]:
        print(
            f"  #{a['rank']:<3} {a['artist_name']:<22} "
            f"{a['composite_score']:>6.1f}  "
            f"{a['catalog_trajectory_pct']:>+10.2f}%/mo  "
            f"{a['trailing_12mo_avg_daily_streams']:>12,}  "
            f"{a['genre']:<12}"
        )


if __name__ == "__main__":
    main()
