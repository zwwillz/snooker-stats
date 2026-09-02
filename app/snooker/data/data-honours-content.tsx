"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { SnookerHonoursHub, SnookerHonoursList, SnookerHonoursMetricKey } from "@/lib/snooker/honours-hub";
import styles from "./data.module.css";
import detailStyles from "./technical-detail.module.css";

const leaderKeys: SnookerHonoursMetricKey[] = ["ranking_titles", "triple_crown_titles", "world_championship_titles", "career_147s"];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function playerMap(players: SnookerPlayerListItem[]) {
  return new Map(players.map((player) => [player.slug, player]));
}

function metricFor(hub: SnookerHonoursHub, key: SnookerHonoursMetricKey) {
  return hub.lists.find((list) => list.key === key) ?? null;
}

function formatHonoursValue(list: SnookerHonoursList, value: number) {
  const suffix = list.key === "ranking_finals" ? "次" : list.key === "career_147s" ? "杆" : "冠";
  return `${Math.round(value).toLocaleString("en-GB")}${suffix}`;
}

function capturedLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function HonoursAvatar({ player, compact = false }: { player?: SnookerPlayerListItem; compact?: boolean }) {
  return <span className={`${styles.technicalAvatar} ${compact ? styles.technicalAvatarCompact : ""}`}>
    {player?.avatarUrl ? <img src={player.avatarUrl} alt="" loading="lazy" decoding="async" /> : <span>{initials(player?.nameEn ?? "Player")}</span>}
  </span>;
}

export function HonoursLeadersSection({
  hub,
  players,
  onOpenHonours,
}: {
  hub: SnookerHonoursHub;
  players: SnookerPlayerListItem[];
  onOpenHonours: (key: SnookerHonoursMetricKey) => void;
}) {
  const bySlug = useMemo(() => playerMap(players), [players]);

  return <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <div><small>CAREER HONOURS</small><h2>荣誉榜</h2></div>
    </div>
    <div className={styles.seasonLeaderGrid}>
      {leaderKeys.map((key) => {
        const list = metricFor(hub, key);
        const leader = list?.rows[0];
        const player = leader ? bySlug.get(leader.playerSlug) : undefined;
        const tieCount = leader && list ? list.rows.filter((row) => row.value === leader.value).length : 0;
        return <button type="button" className={styles.seasonLeaderCard} onClick={() => onOpenHonours(key)} key={key}>
          <div className={styles.seasonLeaderLabel}><span>{list?.shortLabelZh ?? key}</span><small>{list?.labelEn ?? ""}</small></div>
          {leader && list ? <>
            <div className={styles.seasonLeaderMain}>
              <HonoursAvatar player={player} compact />
              <span><strong>{player?.nameZh ?? leader.playerSlug}</strong><small>{player?.nameEn ?? leader.playerSlug}</small></span>
            </div>
            <div className={styles.seasonLeaderValue}><b>{formatHonoursValue(list, leader.value)}</b><span>{tieCount > 1 ? `${tieCount} 人并列` : "当前领先"}</span></div>
          </> : <div className={styles.seasonLeaderEmpty}>数据准备中</div>}
        </button>;
      })}
    </div>
    <button className={styles.primaryAction} type="button" onClick={() => onOpenHonours("ranking_titles")}>查看完整荣誉榜 <span>›</span></button>
  </section>;
}

export function HonoursDetailContent({
  hub,
  players,
  selectedKey,
  onSelectKey,
  onOpenPlayer,
  onClose,
}: {
  hub: SnookerHonoursHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerHonoursMetricKey;
  onSelectKey: (key: SnookerHonoursMetricKey) => void;
  onOpenPlayer: (slug: string) => void;
  onClose: () => void;
}) {
  const bySlug = useMemo(() => playerMap(players), [players]);
  const selected = metricFor(hub, selectedKey) ?? hub.lists[0] ?? null;
  const updated = capturedLabel(hub.capturedAt);
  const tableTopSentinelRef = useRef<HTMLDivElement>(null);
  const [tablePinned, setTablePinned] = useState(false);

  useEffect(() => {
    const sentinel = tableTopSentinelRef.current;
    if (!sentinel) return;
    const desktop = window.matchMedia("(min-width:1024px)");
    let observer: IntersectionObserver | null = null;
    const syncObserver = () => {
      observer?.disconnect();
      observer = null;
      setTablePinned(false);
      if (!desktop.matches) return;
      observer = new IntersectionObserver(([entry]) => {
        setTablePinned(entry.boundingClientRect.top <= 64);
      }, { root: null, rootMargin: "-64px 0px 0px 0px", threshold: 0 });
      observer.observe(sentinel);
    };
    syncObserver();
    desktop.addEventListener("change", syncObserver);
    return () => {
      observer?.disconnect();
      desktop.removeEventListener("change", syncObserver);
    };
  }, []);

  return <div className={detailStyles.detailContent}>
    <aside className={detailStyles.technicalSidebar}>
      <div className={detailStyles.technicalSidebarHeading}><small>HONOURS FILTER</small><strong>荣誉榜单</strong></div>
      <div className={detailStyles.technicalMetricNav} role="tablist" aria-label="荣誉榜指标">
        {hub.lists.map((list) => <button
          type="button"
          role="tab"
          aria-selected={selected?.key === list.key}
          className={selected?.key === list.key ? detailStyles.technicalMetricActive : ""}
          onClick={() => onSelectKey(list.key)}
          key={list.key}
        ><span>{list.shortLabelZh}</span><small>{list.labelEn}</small></button>)}
      </div>
      <button className={detailStyles.technicalDesktopBack} type="button" onClick={onClose}><span aria-hidden="true">‹</span> 返回</button>
    </aside>

    {selected ? <section className={`${styles.card} ${detailStyles.technicalTablePanel} ${detailStyles.honoursTablePanel}`}>
      <div ref={tableTopSentinelRef} className={detailStyles.technicalTableSentinel} aria-hidden="true" />
      <div className={`${detailStyles.technicalTableSticky} ${tablePinned ? detailStyles.technicalTableStickyPinned : ""}`}>
        <div className={`${detailStyles.technicalTableHeader} ${detailStyles.honoursTableHeader}`}><span>排名</span><span>球员</span><span>{selected.shortLabelZh}</span><span className={detailStyles.technicalArrowHeader} aria-hidden="true" /></div>
      </div>
      <div className={detailStyles.technicalTableBody}>
      <div className={`${detailStyles.technicalRankingList} ${detailStyles.honoursRankingList}`}>
        {selected.rows.map((row) => {
          const player = bySlug.get(row.playerSlug);
          return <button type="button" onClick={() => onOpenPlayer(row.playerSlug)} key={`${selected.key}-${row.playerId}`}>
            <strong>{row.rank}</strong>
            <HonoursAvatar player={player} compact />
            <span><b>{player?.nameZh ?? row.playerSlug}</b><small>{player?.nameEn ?? row.playerSlug}</small></span>
            <em>{formatHonoursValue(selected, row.value)}</em>
            <i>›</i>
          </button>;
        })}
        {!selected.rows.length ? <div className={styles.emptyState}>当前数据库暂无该项荣誉数据。</div> : null}
      </div>
      <div className={detailStyles.rankingFooterMeta}>
        <span>来源：{hub.sourceName}{updated ? ` · 更新 ${updated}` : ""}</span>
        <span>口径：本站已入库职业生涯统计</span>
      </div>
      </div>
    </section> : <section className={styles.card}><div className={styles.emptyState}>荣誉榜数据正在准备中。</div></section>}
  </div>;
}

export function HonoursDetailPage({
  hub,
  players,
  selectedKey,
  onSelectKey,
  onOpenPlayer,
  onClose,
}: {
  hub: SnookerHonoursHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerHonoursMetricKey;
  onSelectKey: (key: SnookerHonoursMetricKey) => void;
  onOpenPlayer: (slug: string) => void;
  onClose: () => void;
}) {
  return <section className={detailStyles.technicalPage} data-data-detail="true" aria-label="球员职业生涯荣誉榜">
    <header className={detailStyles.technicalMobileHeader}>
      <button type="button" onClick={onClose} aria-label="返回数据"><span aria-hidden="true">‹</span></button>
      <strong>球员荣誉榜</strong>
      <span>DATA</span>
    </header>
    <header className={detailStyles.technicalDesktopIntro}>
      <div><small>CAREER HONOURS</small><h1>球员荣誉榜</h1><p>职业生涯冠军、决赛与单杆 147 等历史荣誉数据。</p></div>
      <strong>职业生涯</strong>
    </header>
    <HonoursDetailContent hub={hub} players={players} selectedKey={selectedKey} onSelectKey={onSelectKey} onOpenPlayer={onOpenPlayer} onClose={onClose} />
  </section>;
}

export function HonoursDetailLoadingPage({ onClose }: { onClose: () => void }) {
  return <section className={detailStyles.technicalPage} data-data-detail="true" aria-label="正在加载球员荣誉榜">
    <header className={detailStyles.technicalMobileHeader}>
      <button type="button" onClick={onClose} aria-label="返回数据"><span aria-hidden="true">‹</span></button>
      <strong>球员荣誉榜</strong>
      <span>DATA</span>
    </header>
    <header className={detailStyles.technicalDesktopIntro}>
      <div><small>CAREER HONOURS</small><h1>球员荣誉榜</h1><p>职业生涯冠军、决赛与单杆 147 等历史荣誉数据。</p></div>
    </header>
    <section className={`${styles.card} ${detailStyles.technicalLoadingCard}`}><div className={styles.technicalLoading}>正在加载荣誉榜数据…</div></section>
  </section>;
}

// Kept as a named compatibility export for callers that still preload the former overlay module.
export const HonoursDetailOverlay = HonoursDetailPage;
