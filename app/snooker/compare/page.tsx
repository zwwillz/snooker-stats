import type { Metadata } from "next";
import { getSnookerPlayerDirectory } from "@/lib/snooker/player-data";
import { loadPlayerCompare } from "@/lib/snooker/player-compare";
import PlayerCompareClient from "./player-compare-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "球员对比｜147数据局",
  description: "对比斯诺克职业球员的赛季表现、职业生涯、交手记录与荣誉数据。",
};

export default async function PlayerComparePage({
  searchParams,
}: {
  searchParams: Promise<{ player1?: string; player2?: string; season?: string }>;
}) {
  const [directory, query] = await Promise.all([getSnookerPlayerDirectory(), searchParams]);
  const currentTour = directory.filter((player) => player.isCurrentTour);
  const fallback1 = currentTour[0]?.slug ?? "judd-trump";
  const fallback2 = currentTour.find((player) => player.slug !== fallback1)?.slug ?? "neil-robertson";
  const player1 = currentTour.some((player) => player.slug === query.player1) ? query.player1! : fallback1;
  const player2Candidate = currentTour.some((player) => player.slug === query.player2) ? query.player2! : fallback2;
  const player2 = player2Candidate === player1
    ? currentTour.find((player) => player.slug !== player1)?.slug ?? fallback2
    : player2Candidate;
  const initialCompare = await loadPlayerCompare(player1, player2, query.season ?? null);

  return <PlayerCompareClient players={currentTour} initialCompare={initialCompare} />;
}
