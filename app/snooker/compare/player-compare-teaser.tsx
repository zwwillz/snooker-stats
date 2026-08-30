"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
  const pair = useMemo(() => {
    if (initialData) {
      const bySlug = new Map(players.map((player) => [player.slug, player]));
      const fromInitial = initialData.players.map((player) => bySlug.get(player.slug)).filter((player): player is SnookerPlayerListItem => Boolean(player));
      if (fromInitial.length === 2) return fromInitial;
    }
    return players.filter((player) => player.isCurrentTour).slice(0, 2);
  }, [initialData, players]);
  if (pair.length < 2) return null;

  const [left, right] = pair;
  const matchesInitialPair = Boolean(initialData && initialData.players[0].slug === left.slug && initialData.players[1].slug === right.slug);
  const data = matchesInitialPair ? initialData : null;
  const [leftStats, rightStats] = data?.seasonStats ?? [null, null];
  const compareHref = `/snooker/compare?player1=${encodeURIComponent(left.slug)}&player2=${encodeURIComponent(right.slug)}${data?.season ? `&season=${encodeURIComponent(data.season)}` : ""}`;

  const warmCompare = () => router.prefetch(compareHref);
  const rememberReturn = () => {
    try {
      const returnUrl = new URL(window.location.href);
      if (variant === "data") returnUrl.searchParams.set("view", "data");
      else returnUrl.searchParams.delete("view");
      window.sessionStorage.setItem("snooker-compare-return", returnUrl.href);
      if (data) window.sessionStorage.setItem("snooker-compare-teaser", JSON.stringify(data));
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
      <div><strong>{data ? percent(leftStats?.matchWinRate) : "—"}</strong><span>比赛胜率</span><strong>{data ? percent(rightStats?.matchWinRate) : "—"}</strong></div>
      <div><strong>{data ? percent(leftStats?.frameWinRate) : "—"}</strong><span>局胜率</span><strong>{data ? percent(rightStats?.frameWinRate) : "—"}</strong></div>
      <div><strong>{data ? integer(leftStats?.breaks100Plus) : "—"}</strong><span>破百</span><strong>{data ? integer(rightStats?.breaks100Plus) : "—"}</strong></div>
      <div><strong>{data ? integer(data.h2h.leftWins) : "—"}</strong><span>历史交手胜场</span><strong>{data ? integer(data.h2h.rightWins) : "—"}</strong></div>
    </div>
    <div className={styles.actionFrame}>
      <Link
        className={actionClassName ? `${styles.actionReset} ${actionClassName}` : styles.action}
        href={compareHref}
        prefetch={false}
        onPointerEnter={warmCompare}
        onFocus={warmCompare}
        onClick={rememberReturn}
      >
        {variant === "data" ? <>开始球员对比 <span>›</span></> : "查看完整球员对比"}
      </Link>
    </div>
  </section>;
}
