"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { SnookerTechnicalHub, SnookerTechnicalList, SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";
import styles from "./data.module.css";
import detailStyles from "./technical-detail.module.css";

const leaderKeys: SnookerTechnicalMetricKey[] = ["centuries", "win_rate", "shot_time", "maximums"];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function playerMap(players: SnookerPlayerListItem[]) {
  return new Map(players.map((player) => [player.slug, player]));
}

function metricFor(hub: SnookerTechnicalHub, key: SnookerTechnicalMetricKey) {
  return hub.lists.find((list) => list.key === key) ?? null;
}

function formatMetricValue(list: SnookerTechnicalList, value: number) {
  if (list.unit === "percent") return `${value.toFixed(1)}%`;
  if (list.unit === "seconds") return `${value.toFixed(1)}s`;
  if (list.unit === "points") return value.toLocaleString("en-GB");
  if (list.key === "average_break") return value.toFixed(1);
  return Math.round(value).toLocaleString("en-GB");
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

function eligibilityLabel(list: SnookerTechnicalList) {
  return list.minMatches > 0 ? `至少 ${list.minMatches} 场` : null;
}

function TechnicalAvatar({ player, compact = false }: { player?: SnookerPlayerListItem; compact?: boolean }) {
  return <span className={`${styles.technicalAvatar} ${compact ? styles.technicalAvatarCompact : ""}`}>
    {player?.avatarUrl ? <img src={player.avatarUrl} alt="" loading="lazy" decoding="async" /> : <span>{initials(player?.nameEn ?? "Player")}</span>}
  </span>;
}

export function SeasonLeadersSection({
  hub,
  players,
  onOpenTechnical,
}: {
  hub: SnookerTechnicalHub;
  players: SnookerPlayerListItem[];
  onOpenTechnical: (key: SnookerTechnicalMetricKey) => void;
}) {
  const bySlug = useMemo(() => playerMap(players), [players]);

  return <section className={styles.card}>
    <div className={styles.sectionHeader}>
      <div><small>SEASON LEADERS</small><h2>{hub.seasonLabel} 本赛季领跑者</h2></div>
    </div>
    <div className={styles.seasonLeaderGrid}>
      {leaderKeys.map((key) => {
        const list = metricFor(hub, key);
        const leader = list?.rows[0];
        const player = leader ? bySlug.get(leader.playerSlug) : undefined;
        const tieCount = leader && list ? list.rows.filter((row) => row.value === leader.value).length : 0;
        return <button type="button" className={styles.seasonLeaderCard} onClick={() => onOpenTechnical(key)} key={key}>
          <div className={styles.seasonLeaderLabel}><span>{list?.shortLabelZh ?? key}</span><small>{list?.labelEn ?? ""}</small></div>
          {leader && list ? <>
            <div className={styles.seasonLeaderMain}>
              <TechnicalAvatar player={player} compact />
              <span><strong>{player?.nameZh ?? leader.playerSlug}</strong><small>{player?.nameEn ?? leader.playerSlug}</small></span>
            </div>
            <div className={styles.seasonLeaderValue}><b>{formatMetricValue(list, leader.value)}</b><span>{tieCount > 1 ? `${tieCount} 人并列` : eligibilityLabel(list) ?? "当前领先"}</span></div>
          </> : <div className={styles.seasonLeaderEmpty}>暂无数据</div>}
        </button>;
      })}
    </div>
    <button className={styles.primaryAction} type="button" onClick={() => onOpenTechnical("centuries")}>查看完整技术榜 <span>›</span></button>
  </section>;
}

export function TechnicalDetailContent({
  hub,
  players,
  selectedKey,
  onSelectKey,
  onOpenPlayer,
  onClose,
}: {
  hub: SnookerTechnicalHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerTechnicalMetricKey;
  onSelectKey: (key: SnookerTechnicalMetricKey) => void;
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
      }, {
        root: null,
        rootMargin: "-64px 0px 0px 0px",
        threshold: 0,
      });
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
      <div className={detailStyles.technicalSidebarHeading}><small>TECHNICAL</small><strong>技术榜单</strong></div>
      <div className={detailStyles.technicalMetricNav} role="tablist" aria-label="技术榜指标">
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

    {selected ? <section className={`${styles.card} ${detailStyles.technicalTablePanel}`}>
      <div ref={tableTopSentinelRef} className={detailStyles.technicalTableSentinel} aria-hidden="true" />
      <div className={`${detailStyles.technicalTableSticky} ${tablePinned ? detailStyles.technicalTableStickyPinned : ""}`}>
        <div className={detailStyles.technicalTableHeader}><span>排名</span><span>球员</span><span className={detailStyles.technicalMatchesHeader}>场次</span><span>{selected.shortLabelZh}</span><span className={detailStyles.technicalArrowHeader} aria-hidden="true" /></div>
      </div>
      <div className={detailStyles.technicalTableBody}>
        <div className={detailStyles.technicalRankingList}>
          {selected.rows.map((row) => {
            const player = bySlug.get(row.playerSlug);
            return <button type="button" onClick={() => onOpenPlayer(row.playerSlug)} key={`${selected.key}-${row.playerId}`}>
              <strong>{row.rank}</strong>
              <TechnicalAvatar player={player} compact />
              <span><b>{player?.nameZh ?? row.playerSlug}</b><small>{player?.nameEn ?? row.playerSlug}{row.matchesPlayed ? ` · ${row.matchesPlayed}场` : ""}</small></span>
              <span className={detailStyles.technicalMatches}>{row.matchesPlayed ?? "—"}</span>
              <em>{formatMetricValue(selected, row.value)}</em>
              <i>›</i>
            </button>;
          })}
          {!selected.rows.length ? <div className={styles.emptyState}>当前赛季暂无该项数据。</div> : null}
        </div>
        <div className={detailStyles.rankingFooterMeta}>
          <span>{hub.seasonLabel} · {hub.sourceName}{updated ? ` · 更新 ${updated}` : ""}</span>
          {selected.minMatches > 0 ? <span>口径：至少完成 {selected.minMatches} 场比赛</span> : <span>仅统计当前职业巡回赛球员</span>}
        </div>
      </div>
    </section> : <section className={styles.card}><div className={styles.emptyState}>暂无技术榜数据。</div></section>}
  </div>;
}

export function TechnicalDetailPage({
  hub,
  players,
  selectedKey,
  onSelectKey,
  onOpenPlayer,
  onClose,
}: {
  hub: SnookerTechnicalHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerTechnicalMetricKey;
  onSelectKey: (key: SnookerTechnicalMetricKey) => void;
  onOpenPlayer: (slug: string) => void;
  onClose: () => void;
}) {
  return <section className={detailStyles.technicalPage} data-data-detail="true" data-technical-detail="true" aria-label="本赛季球员技术榜">
    <header className={detailStyles.technicalMobileHeader}>
      <button type="button" onClick={onClose} aria-label="返回数据"><span aria-hidden="true">‹</span></button>
      <strong>本赛季球员技术榜</strong>
      <span>STATS</span>
    </header>
    <header className={detailStyles.technicalDesktopIntro}>
      <div><small>TECHNICAL LEADERBOARD</small><h1>本赛季球员技术榜</h1><p>本赛季球员技术表现与比赛效率排名。</p></div>
      <strong>{hub.seasonLabel}</strong>
    </header>
    <TechnicalDetailContent hub={hub} players={players} selectedKey={selectedKey} onSelectKey={onSelectKey} onOpenPlayer={onOpenPlayer} onClose={onClose} />
  </section>;
}

export function TechnicalDetailLoadingPage({ onClose }: { onClose: () => void }) {
  return <section className={detailStyles.technicalPage} data-data-detail="true" data-technical-detail="true" aria-label="正在加载本赛季球员技术榜">
    <header className={detailStyles.technicalMobileHeader}>
      <button type="button" onClick={onClose} aria-label="返回数据"><span aria-hidden="true">‹</span></button>
      <strong>本赛季球员技术榜</strong>
      <span>STATS</span>
    </header>
    <header className={detailStyles.technicalDesktopIntro}>
      <div><small>TECHNICAL LEADERBOARD</small><h1>本赛季球员技术榜</h1><p>本赛季球员技术表现与比赛效率排名。</p></div>
    </header>
    <section className={`${styles.card} ${detailStyles.technicalLoadingCard}`}><div className={styles.technicalLoading}>正在加载技术榜数据…</div></section>
  </section>;
}
