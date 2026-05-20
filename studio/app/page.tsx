import { getRoster } from "@/lib/data";
import { Header } from "@/components/Header";
import { RosterClient } from "@/components/RosterClient";

export default function RosterPage() {
  const roster = getRoster();

  return (
    <>
      <Header />
      <main className="flex-1">
        <RosterClient artists={roster} />
      </main>
    </>
  );
}
