import fs from "fs";
import path from "path";

import type { ArtistDetail, RosterArtist } from "@/types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

/**
 * Returns all 100 artists from roster.json, sorted by composite score.
 * Called from server components only.
 */
export function getRoster(): RosterArtist[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, "roster.json"), "utf-8");
  return JSON.parse(raw) as RosterArtist[];
}

/**
 * Returns the full detail payload for a single artist.
 * Called from server components only.
 */
export function getArtist(id: string): ArtistDetail | null {
  const filePath = path.join(DATA_DIR, "artists", `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ArtistDetail;
}

