"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";
import styles from "./player-compare-teaser.module.css";

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ player }: { player: SnookerPlayerListItem }) {
  return <span className={styles.avatar}>{player.avatarUrl ? <img src={player.avatarUrl} alt="" loading="lazy" decoding="async" /> : initials(player.nameEn)}</span>;
}

function percent(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

function integer(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : Math.round(value).toString();
}

export default function PlayerCompareTeaser({
  players,
  variant = "home",
  initialData = null,
  actionClassName,
  headerClassName,
}: {
  players: SnookerPlayerListItem[];
  variant?: "home" | "data";
  initialData?: PlayerCompareSnapshot | null;
  actionClassName?: string;
  headerClassName: string;
}) {
  const router = useRouter();
  const pair = useMemo(() => players.filter((player) => player.isCurrentTour).slice(0, 2), [players]);
  const initialMatchesPair = Boolean(initialData && pair.length === 2 && initialData.players[0].slug === pair[0].slug && initialData.players[1].slug === pair[1].slug);
  const [data, setData] = useState<PlayerCompareSnapshot | null>(() => initialMatchesPair ? initialData : null);
  const compareHref = pair.length === 2
    ? `/snooker/compare?player1=${encodeURIComponent(pair[0].slug)}&player2=${encodeURIComponent(pair[1].slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`
    : "/snooker/compare";

  useEffect(() => {
    if (variant !== "data" || pair.length < 2 || (initialMatchesPair && initialData)) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ player1: pair[0].slug, player2: pair[1].slug });
    void fetch(`/api/snooker/v1/player-compare?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as { compare?: PlayerCompareSnapshot };
        return body.compare ?? null;
      })
      .then((compare) => { if (compare) setData(compare); })
      .catch(() => null);
    return () => controller.abort();
  }, [initialData, initialMatchesPair, pair, variant]);

  if (pair.length < 2) return null;
  const [left, right] = pair;
  const [leftStats, rightStats] = data?.seasonStats ?? [null, null];
  const warmCompare = () => router.prefetch(compareHref);
  const rememberReturn = () => {
    try {
      const returnUrl = new URL(window.location.href);
      if (variant === "data") returnUrl.searchParams.set("view", "data");
      else returnUrl.searchParams.delete("view");
      window.sessionStorage.setItem("snooker-compare-return", returnUrl.href);
    } catch {
      // Browser history remains the fallback.
    }
  };

  return <section className={`${styles.card} ${variant === "data" ? styles.dataVariant : ""}`}>
    <div className={styles.headerFrame}>
      <header className={`${styles.header} ${headerClassName}`}>
        <div><small>PLAYER COMPARE</small><h2>球员对比</h2><p>{variant === "data" ? "赛季表现、职业生涯、直接交手与荣誉，一页比较。" : "谁的赛季表现更强？"}</p></div>
        <span>{data?.season ?? "当前赛季"}</span>
      </header>
    </div>
    <div className={styles.players}>
      <div><Avatar player={left} /><strong>{left.nameZh}</strong><small>世界 #{left.currentRank ?? "—"}</small></div>
      <b>VS</b>
      <div><Avatar player={right} /><strong>{right.nameZh}</strong><small>世界 #{right.currentRank ?? "—"}</small></div>
    </div>
    <div className={styles.metrics}>
      <div><strong>{percent(leftStats?.matchWinRate)}</strong><span>比赛胜率</span><strong>{percent(rightStats?.matchWinRate)}</strong></div>
      <div><strong>{percent(leftStats?.frameWinRate)}</strong><span>局胜率</span><strong>{percent(rightStats?.frameWinRate)}</strong></div>
      <div><strong>{integer(leftStats?.breaks100Plus)}</strong><span>破百</span><strong>{integer(rightStats?.breaks100Plus)}</strong></div>
      <div><strong>{integer(data?.h2h.leftWins)}</strong><span>历史交手胜场</span><strong>{integer(data?.h2h.rightWins)}</strong></div>
    </div>
    <div className={styles.actionFrame}>
      <Link
        className={actionClassName ? `${styles.actionReset} ${actionClassName}` : styles.action}
        href={compareHref}
        prefetch
        onPointerEnter={warmCompare}
        onPointerDown={warmCompare}
        onFocus={warmCompare}
        onClick={rememberReturn}
      >
        {variant === "data" ? <>开始球员对比 <span>›</span></> : "查看完整球员对比"}
      </Link>
    </div>
  </section>;
}
