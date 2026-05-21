import { notFound } from "next/navigation";

import { getArtist }                           from "@/lib/data";
import { optimizeDeal, getAdvanceTier, DEFAULT_CONSTRAINTS } from "@/lib/optimizeDeal";
import { DEFAULT_PARAMS }                       from "@/lib/dealParams";
import { Header }                               from "@/components/Header";
import { ArtistDetailClient }                   from "@/components/ArtistDetailClient";
import type { ArtistAnchors }                   from "@/types/deal";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const artist = getArtist(id);

  if (!artist) notFound();

  // Pre-compute optimized deal structure server-side
  const anchors: ArtistAnchors = {
    avgDailyStreams:        artist.meta.trailing_12mo_avg_daily_streams,
    catalogTrajectoryPct:  artist.catalog_trajectory_pct,
    catalogStabilityScore: artist.scores.catalog_stability,
  };

  const tier = getAdvanceTier(artist.meta.trailing_12mo_avg_daily_streams);

  const constraints = {
    ...DEFAULT_CONSTRAINTS,
    minAdvanceK:    tier.minK,
    maxInvestmentK: tier.maxK + 300,
  };

  const optimizedParams = optimizeDeal(
    { ...DEFAULT_PARAMS, advanceUsd: tier.defaultK * 1_000 },
    anchors,
    constraints,
  );

  return (
    <>
      <Header />
      <main>
        <ArtistDetailClient artist={artist} optimizedParams={optimizedParams} />
      </main>
    </>
  );
}
