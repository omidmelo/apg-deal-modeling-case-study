import { getRoster }            from "@/lib/data";
import { getTopRecommendation } from "@/lib/rankRoster";
import { generateMemo }         from "@/lib/generateMemo";
import { Header }               from "@/components/Header";
import { RosterClient }         from "@/components/RosterClient";

export default function RosterPage() {
  const roster            = getRoster();
  const topRecommendation = getTopRecommendation(roster);
  const memo              = generateMemo(topRecommendation);

  return (
    <>
      <Header />
      <main className="flex-1">
        <RosterClient artists={roster} topRecommendation={topRecommendation} memo={memo} />
      </main>
    </>
  );
}
