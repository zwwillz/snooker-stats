"use client";

import { useEffect, useState } from "react";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";
import PlayerCompareClient from "./player-compare-client";
import PlayerCompareLoadingShell from "./player-compare-loading-shell";

export default function PlayerCompareDeferred({
  players,
  player1,
  player2,
  season,
}: {
  players: SnookerPlayerListItem[];
  player1: string;
  player2: string;
  season?: string | null;
}) {
  const [data, setData] = useState<PlayerCompareSnapshot | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ player1, player2 });
    if (season) params.set("season", season);
    void fetch(`/api/snooker/v1/player-compare?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("PLAYER_COMPARE_UNAVAILABLE");
        const body = await response.json() as { compare?: PlayerCompareSnapshot };
        if (!body.compare) throw new Error("PLAYER_COMPARE_EMPTY");
        setData(body.compare);
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(true);
      });
    return () => controller.abort();
  }, [attempt, player1, player2, season]);

  const retry = () => {
    setError(false);
    setAttempt((value) => value + 1);
  };

  if (data) return <PlayerCompareClient players={players} initialCompare={data} />;
  if (error) return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f5f7f6", padding: 24 }}><div style={{ textAlign: "center" }}><strong>球员对比数据暂时没有加载成功</strong><br /><button type="button" onClick={retry} style={{ marginTop: 14, padding: "10px 18px", border: 0, borderRadius: 12 }}>重新加载</button></div></main>;
  return <PlayerCompareLoadingShell />;
}
