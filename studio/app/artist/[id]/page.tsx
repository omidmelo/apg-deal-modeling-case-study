import { notFound } from "next/navigation";

import { getArtist } from "@/lib/data";
import { Header } from "@/components/Header";
import { ArtistDetailClient } from "@/components/ArtistDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const artist = getArtist(id);

  if (!artist) notFound();

  return (
    <>
      <Header />
      <main>
        <ArtistDetailClient artist={artist} />
      </main>
    </>
  );
}
