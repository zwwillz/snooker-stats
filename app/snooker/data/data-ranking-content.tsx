"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type { PlayerCompareSnapshot } from "@/lib/snooker/player-compare";
import type {
  SnookerCurrentRankingKey,
  SnookerRankingHub,
  SnookerRankingSection,
} from "@/lib/snooker/ranking-hub";
import { technicalMetricKey, type SnookerTechnicalHub, type SnookerTechnicalMetricKey } from "@/lib/snooker/technical-hub";
import { honoursMetricKey, type SnookerHonoursHub, type SnookerHonoursMetricKey } from "@/lib/snooker/honours-hub";
import { CLASSIC_RECORDS, historyLeaderboardItem, historyRecordCategory, type HistoryRecordItem } from "@/lib/snooker/history-records-v4";
import { SeasonLeadersSection, TechnicalDetailLoadingPage, TechnicalDetailPage } from "./data-technical-content";
import { HonoursDetailLoadingPage, HonoursDetailPage, HonoursLeadersSection } from "./data-honours-content";
import { HistoryRecordsDetailPage, HistoryRecordsSection, type HistoryRecordsViewKey } from "./data-history-records-content-v2";
import PlayerCompareTeaser from "../compare/player-compare-teaser";
import styles from "./data.module.css";

const currentKeyOrder: SnookerCurrentRankingKey[] = [
  "world_official",
  "one_year",
  "provisional_seeding",
  "provisional_eos",
];

const shortLabels: Record<SnookerCurrentRankingKey, string> = {
  world_official: "世界排名",
  one_year: "单赛季",
  provisional_seeding: "临时排名",
  provisional_eos: "赛季末预测",
};

const shortEnglishLabels: Record<SnookerCurrentRankingKey, string> = {
  world_official: "WORLD",
  one_year: "ONE-YEAR",
  provisional_seeding: "PROVISIONAL",
  provisional_eos: "SEASON-END",
};

const sectionTabs: Array<{ id: SnookerRankingSection; label: string }> = [
  { id: "current", label: "当前排名" },
  { id: "qualification", label: "资格竞争" },
  { id: "history", label: "历史排名" },
];

type DeferredHubPayload<T> = { hub: T; players: SnookerPlayerListItem[] };

let technicalCache: DeferredHubPayload<SnookerTechnicalHub> | null = null;
let technicalInflight: Promise<DeferredHubPayload<SnookerTechnicalHub> | null> | null = null;
let honoursCache: DeferredHubPayload<SnookerHonoursHub> | null = null;
let honoursInflight: Promise<DeferredHubPayload<SnookerHonoursHub> | null> | null = null;

async function loadTechnicalHubClient() {
  if (technicalCache) return technicalCache;
  if (technicalInflight) return technicalInflight;
  technicalInflight = fetch("/api/snooker/v1/technical", { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { hub?: SnookerTechnicalHub; players?: SnookerPlayerListItem[] };
      if (!data.hub) return null;
      const payload = { hub: data.hub, players: data.players ?? [] };
      if (data.hub.online) technicalCache = payload;
      return payload;
    })
    .catch(() => null)
    .finally(() => { technicalInflight = null; });
  return technicalInflight;
}

async function loadHonoursHubClient() {
  if (honoursCache) return honoursCache;
  if (honoursInflight) return honoursInflight;
  honoursInflight = fetch("/api/snooker/v1/honours", { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { hub?: SnookerHonoursHub; players?: SnookerPlayerListItem[] };
      if (!data.hub) return null;
      const payload = { hub: data.hub, players: data.players ?? [] };
      if (data.hub.online) honoursCache = payload;
      return payload;
    })
    .catch(() => null)
    .finally(() => { honoursInflight = null; });
  return honoursInflight;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function rankingMoney(value: number) {
  return `£${value.toLocaleString("en-GB")}`;
}

function capturedLabel(value: string | null) {
  if (!value) return "更新时间待同步";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间待同步";
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

function playerBySlugMap(players: SnookerPlayerListItem[]) {
  return new Map(players.map((player) => [player.slug, player]));
}

function playerByUuidMap(players: SnookerPlayerListItem[]) {
  return new Map(players.map((player) => [player.id, player]));
}

function mergePlayers(...groups: SnookerPlayerListItem[][]) {
  const byId = new Map<string, SnookerPlayerListItem>();
  for (const group of groups) {
    for (const player of group) byId.set(player.id, { ...(byId.get(player.id) ?? {}), ...player } as SnookerPlayerListItem);
  }
  return [...byId.values()];
}

function rankingPlayer(
  row: { playerUuid: string; playerSlug: string | null },
  playerByUuid: Map<string, SnookerPlayerListItem>,
  playerBySlug: Map<string, SnookerPlayerListItem>,
) {
  return playerByUuid.get(row.playerUuid) ?? (row.playerSlug ? playerBySlug.get(row.playerSlug) : undefined);
}

function RankingAvatar({ player }: { player?: SnookerPlayerListItem }) {
  return <span className={styles.avatar}>{player?.avatarUrl ? <img src={player.avatarUrl} alt="" loading="lazy" decoding="async" /> : <span>{initials(player?.nameEn ?? "Player")}</span>}</span>;
}

function listFor(hub: SnookerRankingHub, key: SnookerCurrentRankingKey) {
  return hub.lists.find((list) => list.key === key) ?? null;
}

function RankingListTabs({
  selectedKey,
  onSelectKey,
  compact = false,
}: {
  selectedKey: SnookerCurrentRankingKey;
  onSelectKey: (key: SnookerCurrentRankingKey) => void;
  compact?: boolean;
}) {
  return <div className={`${styles.rankingTabs} ${compact ? styles.rankingTabsCompact : ""}`} role="tablist" aria-label="排名类型">
    {currentKeyOrder.map((key) => {
      return <button
        type="button"
        role="tab"
        aria-selected={selectedKey === key}
        className={selectedKey === key ? styles.tabActive : ""}
        onClick={() => onSelectKey(key)}
        key={key}
      >
        <span>{shortLabels[key]}</span>
        {!compact ? <small>{shortEnglishLabels[key]}</small> : null}
      </button>;
    })}
  </div>;
}

function RankingInfoModal({ hub, onClose }: { hub: SnookerRankingHub; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
    if (event.currentTarget === event.target) onClose();
  }}>
    <section className={styles.infoModal} role="dialog" aria-modal="true" aria-labelledby="ranking-info-title">
      <div className={styles.infoModalHeader}>
        <div><small>RANKING GUIDE</small><h2 id="ranking-info-title">排名说明</h2></div>
        <button type="button" onClick={onClose} aria-label="关闭排名说明">×</button>
      </div>
      <div className={styles.infoList}>
        {currentKeyOrder.map((key) => {
          const list = listFor(hub, key);
          return <article key={key}>
            <strong>{shortLabels[key]}</strong>
            <p>{list?.descriptionZh ?? "说明待同步。"}</p>
          </article>;
        })}
      </div>
    </section>
  </div>;
}

export function DataHubContent({
  hub,
  players,
  selectedKey,
  onSelectKey,
  onOpenRankings,
  onOpenPlayer,
  initialPlayerCompare,
  initialTechnicalMetric = null,
}: {
  hub: SnookerRankingHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerCurrentRankingKey;
  onSelectKey: (key: SnookerCurrentRankingKey) => void;
  onOpenRankings: (key: SnookerCurrentRankingKey) => void;
  onOpenPlayer: (slug: string) => void;
  initialPlayerCompare?: PlayerCompareSnapshot | null;
  initialTechnicalMetric?: SnookerTechnicalMetricKey | null;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [technicalHub, setTechnicalHub] = useState<SnookerTechnicalHub | null>(() => technicalCache?.hub ?? null);
  const [technicalKey, setTechnicalKey] = useState<SnookerTechnicalMetricKey | null>(() => initialTechnicalMetric);
  const [honoursHub, setHonoursHub] = useState<SnookerHonoursHub | null>(() => honoursCache?.hub ?? null);
  const [deferredPlayers, setDeferredPlayers] = useState<SnookerPlayerListItem[]>(() => mergePlayers(
    technicalCache?.players ?? [],
    honoursCache?.players ?? [],
  ));
  const [honoursKey, setHonoursKey] = useState<SnookerHonoursMetricKey | null>(null);
  const [historyGroup, setHistoryGroup] = useState<HistoryRecordsViewKey | null>(null);
  const [historyRecordKey, setHistoryRecordKey] = useState<string | null>(null);
  const technicalSectionRef = useRef<HTMLDivElement | null>(null);
  const honoursSectionRef = useRef<HTMLDivElement | null>(null);
  const resolvedPlayers = useMemo(() => mergePlayers(players, deferredPlayers), [players, deferredPlayers]);
  const playerBySlug = useMemo(() => playerBySlugMap(resolvedPlayers), [resolvedPlayers]);
  const playerByUuid = useMemo(() => playerByUuidMap(resolvedPlayers), [resolvedPlayers]);
  const selected = listFor(hub, selectedKey);
  const top = selected?.rows.slice(0, 3) ?? [];

  useEffect(() => {
    if (!technicalKey) return;
    let cancelled = false;
    void loadTechnicalHubClient().then((payload) => {
      if (!cancelled && payload) {
        setTechnicalHub(payload.hub);
        setDeferredPlayers((current) => mergePlayers(current, payload.players));
      }
    });
    return () => { cancelled = true; };
  }, [technicalKey]);

  useEffect(() => {
    if (!honoursKey) return;
    let cancelled = false;
    void loadHonoursHubClient().then((payload) => {
      if (!cancelled && payload) {
        setHonoursHub(payload.hub);
        setDeferredPlayers((current) => mergePlayers(current, payload.players));
      }
    });
    return () => { cancelled = true; };
  }, [honoursKey]);

  useEffect(() => {
    const technicalNode = technicalSectionRef.current;
    const honoursNode = honoursSectionRef.current;
    if (!technicalNode || !honoursNode) return;

    const loadTechnical = () => { void loadTechnicalHubClient().then((payload) => {
      if (!payload) return;
      setTechnicalHub(payload.hub);
      setDeferredPlayers((current) => mergePlayers(current, payload.players));
    }); };
    const loadHonours = () => { void loadHonoursHubClient().then((payload) => {
      if (!payload) return;
      setHonoursHub(payload.hub);
      setDeferredPlayers((current) => mergePlayers(current, payload.players));
    }); };
    if (typeof IntersectionObserver === "undefined") {
      loadTechnical();
      loadHonours();
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.target === technicalNode) loadTechnical();
        if (entry.target === honoursNode) loadHonours();
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "480px 0px", threshold: 0.01 });
    observer.observe(technicalNode);
    observer.observe(honoursNode);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const syncTechnicalFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setTechnicalKey(params.get("view") === "data" && params.get("section") === "technical" ? technicalMetricKey(params.get("metric")) : null);
    };
    syncTechnicalFromUrl();
    window.addEventListener("popstate", syncTechnicalFromUrl);
    window.addEventListener("snooker:root-navigation", syncTechnicalFromUrl);
    return () => {
      window.removeEventListener("popstate", syncTechnicalFromUrl);
      window.removeEventListener("snooker:root-navigation", syncTechnicalFromUrl);
    };
  }, []);

  useLayoutEffect(() => {
    const syncHistoryFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") !== "data" || params.get("section") !== "records") {
        setHistoryGroup(null);
        setHistoryRecordKey(null);
        return;
      }
      const groupParam = params.get("group");
      const recordParam = params.get("record");
      const category = historyRecordCategory(groupParam);
      const leaderboard = historyLeaderboardItem(recordParam);
      if (groupParam === "classic" || CLASSIC_RECORDS.some((item) => item.key === recordParam)) {
        setHistoryGroup("classic");
        setHistoryRecordKey(null);
        return;
      }
      setHistoryGroup(category?.key ?? null);
      setHistoryRecordKey(leaderboard && category && leaderboard.category === category.key ? leaderboard.key : null);
    };
    syncHistoryFromUrl();
    window.addEventListener("popstate", syncHistoryFromUrl);
    window.addEventListener("snooker:root-navigation", syncHistoryFromUrl);
    return () => {
      window.removeEventListener("popstate", syncHistoryFromUrl);
      window.removeEventListener("snooker:root-navigation", syncHistoryFromUrl);
    };
  }, []);

  useLayoutEffect(() => {
    const syncHonoursFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setHonoursKey(params.get("view") === "data" && params.get("section") === "honours" ? honoursMetricKey(params.get("honour")) : null);
    };
    syncHonoursFromUrl();
    window.addEventListener("popstate", syncHonoursFromUrl);
    window.addEventListener("snooker:root-navigation", syncHonoursFromUrl);
    return () => {
      window.removeEventListener("popstate", syncHonoursFromUrl);
      window.removeEventListener("snooker:root-navigation", syncHonoursFromUrl);
    };
  }, []);

  const openTechnical = (key: SnookerTechnicalMetricKey) => {
    const currentState = { ...(window.history.state ?? {}), snookerTechnicalReturn: true };
    window.history.replaceState(currentState, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "technical");
    url.searchParams.set("metric", key);
    url.searchParams.delete("honour");
    url.searchParams.delete("list");
    url.searchParams.delete("group");
    window.history.pushState({ ...currentState, snookerTechnicalDetail: key }, "", url.pathname + url.search + url.hash);
    setTechnicalKey(key);
  };

  const selectTechnical = (key: SnookerTechnicalMetricKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.set("section", "technical");
    url.searchParams.set("metric", key);
    window.history.replaceState({ ...(window.history.state ?? {}), snookerTechnicalDetail: key }, "", url.pathname + url.search + url.hash);
    setTechnicalKey(key);
  };

  const closeTechnical = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    url.searchParams.delete("metric");
    window.history.replaceState({ snookerView: "data" }, "", url.pathname + url.search + url.hash);
    setTechnicalKey(null);
  };

  const openHonours = (key: SnookerHonoursMetricKey) => {
    const currentState = { ...(window.history.state ?? {}), snookerHonoursReturn: true };
    window.history.replaceState(currentState, "", window.location.href);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "honours");
    url.searchParams.set("honour", key);
    url.searchParams.delete("metric");
    url.searchParams.delete("list");
    url.searchParams.delete("group");
    window.history.pushState({ ...currentState, snookerHonoursDetail: key }, "", url.pathname + url.search + url.hash);
    setHonoursKey(key);
  };

  const selectHonours = (key: SnookerHonoursMetricKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.set("section", "honours");
    url.searchParams.set("honour", key);
    window.history.replaceState({ ...(window.history.state ?? {}), snookerHonoursDetail: key }, "", url.pathname + url.search + url.hash);
    setHonoursKey(key);
  };

  const closeHonours = () => {
    const state = window.history.state as { snookerHonoursDetail?: string } | null;
    if (state?.snookerHonoursDetail && window.history.length > 1) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    url.searchParams.delete("honour");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setHonoursKey(null);
  };

  const openHistoryGroup = (key: HistoryRecordsViewKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("player");
    url.searchParams.set("section", "records");
    url.searchParams.set("group", key);
    url.searchParams.delete("record");
    url.searchParams.delete("metric");
    url.searchParams.delete("honour");
    url.searchParams.delete("list");
    window.history.pushState({ ...(window.history.state ?? {}), snookerHistoryRecords: "group" }, "", url.pathname + url.search + url.hash);
    setHistoryGroup(key);
    setHistoryRecordKey(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const openHistoryRecord = (item: HistoryRecordItem) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.set("section", "records");
    url.searchParams.set("group", item.category);
    url.searchParams.set("record", item.key);
    window.history.pushState({ ...(window.history.state ?? {}), snookerHistoryRecords: "record" }, "", url.pathname + url.search + url.hash);
    setHistoryGroup(item.category);
    setHistoryRecordKey(item.key);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const backHistory = () => {
    if (historyRecordKey) {
      const url = new URL(window.location.href);
      url.searchParams.delete("record");
      window.history.replaceState({ ...(window.history.state ?? {}), snookerHistoryRecords: "group" }, "", url.pathname + url.search + url.hash);
      setHistoryRecordKey(null);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    url.searchParams.delete("group");
    url.searchParams.delete("record");
    window.history.replaceState({ ...(window.history.state ?? {}), snookerView: "data" }, "", url.pathname + url.search + url.hash);
    setHistoryGroup(null);
    setHistoryRecordKey(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  if (historyGroup) {
    return <HistoryRecordsDetailPage group={historyGroup} recordKey={historyRecordKey} onSelectGroup={openHistoryGroup} onSelectRecord={openHistoryRecord} onBack={backHistory} />;
  }

  if (technicalKey && !technicalHub?.online) {
    return <TechnicalDetailLoadingPage onClose={closeTechnical} />;
  }

  if (honoursKey && !honoursHub?.online) {
    return <HonoursDetailLoadingPage onClose={closeHonours} />;
  }

  if (technicalHub?.online && technicalKey) {
    return <TechnicalDetailPage hub={technicalHub} players={resolvedPlayers} selectedKey={technicalKey} onSelectKey={selectTechnical} onOpenPlayer={onOpenPlayer} onClose={closeTechnical} />;
  }

  if (honoursHub?.online && honoursKey) {
    return <HonoursDetailPage hub={honoursHub} players={resolvedPlayers} selectedKey={honoursKey} onSelectKey={selectHonours} onOpenPlayer={onOpenPlayer} onClose={closeHonours} />;
  }

  return <>
    <section className={styles.pageIntro}>
      <small>DATA CENTER</small>
      <h1>数据</h1>
      <p>世界斯诺克排名、赛季表现与历史纪录的数据入口。排名、技术与荣誉数据按统一结构逐步扩展。</p>
    </section>

    <div className={styles.dataDashboard}>
    <div className={styles.dataCompareSlot}><PlayerCompareTeaser players={resolvedPlayers} variant="data" initialData={initialPlayerCompare} actionClassName={styles.primaryAction} headerClassName={styles.sectionHeader} /></div>

    <section className={`${styles.card} ${styles.rankingCard} ${styles.dataRankingSlot}`}>
      <div className={styles.sectionHeader}>
        <div>
          <small>RANKINGS</small>
          <div className={styles.titleWithInfo}><h2>排名中心</h2><button type="button" className={styles.infoButton} onClick={() => setInfoOpen(true)} aria-label="查看四种排名说明">i</button></div>
        </div>
      </div>
      <RankingListTabs selectedKey={selectedKey} onSelectKey={onSelectKey} />

      {selected ? <>
        <div className={styles.topRankingList}>
          {top.map((row) => {
            const player = rankingPlayer(row, playerByUuid, playerBySlug);
            const playerSlug = player?.slug ?? row.playerSlug;
            return <button type="button" onClick={() => playerSlug && onOpenPlayer(playerSlug)} disabled={!playerSlug} key={`${selected.key}-${row.rank}`}>
              <strong className={row.rank <= 3 ? styles.medalRank : ""}>{row.rank}</strong>
              <RankingAvatar player={player} />
              <span><b>{player?.nameZh ?? row.sourcePlayerName}</b><small>{player?.nameEn ?? row.sourcePlayerName}</small></span>
              <em>{rankingMoney(row.money)}</em>
            </button>;
          })}
        </div>
        <button className={styles.primaryAction} type="button" onClick={() => onOpenRankings(selected.key)}>查看完整排名 <span>›</span></button>
      </> : <div className={styles.emptyState}>排名数据正在准备中。</div>}
    </section>

    <div className={styles.dataTechnicalSlot} ref={technicalSectionRef}>{technicalHub?.online ? <SeasonLeadersSection hub={technicalHub} players={resolvedPlayers} onOpenTechnical={openTechnical} /> : <section className={styles.card}>
      <div className={styles.sectionHeader}><div><small>SEASON LEADERS</small><h2>本赛季领跑者</h2></div></div>
      <div className={styles.technicalLoading}>正在加载赛季技术数据…</div>
    </section>}</div>

    <div className={styles.dataHonoursSlot} ref={honoursSectionRef}>{honoursHub?.online ? <HonoursLeadersSection hub={honoursHub} players={resolvedPlayers} onOpenHonours={openHonours} /> : <section className={styles.card}>
      <div className={styles.sectionHeader}><div><small>CAREER HONOURS</small><h2>荣誉榜</h2></div></div>
      <div className={styles.technicalLoading}>正在加载职业生涯荣誉数据…</div>
    </section>}</div>

    <div className={styles.dataHistorySlot}><HistoryRecordsSection onOpenGroup={openHistoryGroup} /></div>
    </div>

    {infoOpen ? <RankingInfoModal hub={hub} onClose={() => setInfoOpen(false)} /> : null}
  </>;
}

export function RankingDetailContent({
  hub,
  players,
  selectedKey,
  section,
  onSelectKey,
  onSelectSection,
  onOpenPlayer,
}: {
  hub: SnookerRankingHub;
  players: SnookerPlayerListItem[];
  selectedKey: SnookerCurrentRankingKey;
  section: SnookerRankingSection;
  onSelectKey: (key: SnookerCurrentRankingKey) => void;
  onSelectSection: (section: SnookerRankingSection) => void;
  onOpenPlayer: (slug: string) => void;
}) {
  const playerBySlug = useMemo(() => playerBySlugMap(players), [players]);
  const playerByUuid = useMemo(() => playerByUuidMap(players), [players]);
  const selected = listFor(hub, selectedKey);
  const rows = selected?.rows ?? [];
  const rankingTableSentinelRef = useRef<HTMLDivElement>(null);
  const [rankingTablePinned, setRankingTablePinned] = useState(false);

  useEffect(() => {
    const sentinel = rankingTableSentinelRef.current;
    if (!sentinel) return;
    const desktop = window.matchMedia("(min-width:1024px)");
    let observer: IntersectionObserver | null = null;
    const syncObserver = () => {
      observer?.disconnect();
      observer = null;
      setRankingTablePinned(false);
      if (!desktop.matches) return;
      observer = new IntersectionObserver(([entry]) => {
        setRankingTablePinned(entry.boundingClientRect.top <= 64);
      }, { root: null, rootMargin: "-64px 0px 0px 0px", threshold: 0 });
      observer.observe(sentinel);
    };
    syncObserver();
    desktop.addEventListener("change", syncObserver);
    return () => { observer?.disconnect(); desktop.removeEventListener("change", syncObserver); };
  }, []);

  return <div className={styles.detailContent}>
    <header className={styles.rankingDesktopIntro}>
      <div><small>RANKING CENTER</small><h1>世界排名</h1><p>查看当前排名、资格竞争与历史排名数据。</p></div>
      <strong>{rows.length ? `${rows.length} 位球员` : "数据中心"}</strong>
    </header>
    <div className={styles.detailNavStack}>
      <div className={styles.dataSidebarHeading}><small>RANKING FILTER</small><strong>排名筛选</strong></div>
      <div className={styles.sectionTabs} role="tablist" aria-label="排名栏目">
        {sectionTabs.map((item) => <button type="button" role="tab" aria-selected={section === item.id} className={section === item.id ? styles.sectionActive : ""} onClick={() => onSelectSection(item.id)} key={item.id}>{item.label}</button>)}
      </div>
      {section === "current" ? <RankingListTabs selectedKey={selectedKey} onSelectKey={onSelectKey} compact /> : null}
    </div>

    {section === "current" ? selected ? <section className={`${styles.card} ${styles.rankingTableCard}`}>
      <div ref={rankingTableSentinelRef} className={styles.rankingTableSentinel} aria-hidden="true" />
      <div className={`${styles.rankingTableHeader} ${rankingTablePinned ? styles.rankingTableHeaderPinned : ""}`}><span>排名</span><span>球员</span><span>排名金额</span></div>
      <div className={styles.fullRankingList}>
        {rows.map((row) => {
          const player = rankingPlayer(row, playerByUuid, playerBySlug);
          const playerSlug = player?.slug ?? row.playerSlug;
          return <button type="button" onClick={() => playerSlug && onOpenPlayer(playerSlug)} disabled={!playerSlug} key={`${selected.key}-${row.rank}-${row.playerUuid}`}>
            <strong>{row.rank}</strong>
            <RankingAvatar player={player} />
            <span><b>{player?.nameZh ?? row.sourcePlayerName}</b><small>{player?.nameEn ?? row.sourcePlayerName}{player?.nationalityZh ? ` · ${player.nationalityZh}` : ""}</small></span>
            <em>{rankingMoney(row.money)}</em>
            <i>›</i>
          </button>;
        })}
      </div>
      <div className={styles.rankingFooterMeta}>
        <span>来源：{selected.sourceName || "WPBSA"}</span>
        <span>更新：{capturedLabel(selected.capturedAt)}</span>
      </div>
    </section> : <section className={styles.card}><div className={styles.emptyState}>当前排名数据暂不可用。</div></section> : <section className={`${styles.card} ${styles.reservedCard}`}>
      <small>{section === "qualification" ? "QUALIFICATION RACES" : "HISTORICAL RANKINGS"}</small>
      <h2>{section === "qualification" ? "资格竞争" : "历史排名"}</h2>
      <p>{section === "qualification" ? "这里已为大师赛、世锦赛、球员锦标赛和巡回锦标赛资格排名预留统一入口。下一阶段接入资格线、距离差和 Cut-off 信息。" : "这里已为赛季末排名、历史排名节点和球员排名走势预留入口。历史数据补齐后直接沿用当前排名的列表框架。"}</p>
      <span>Phase 1A · 框架已就绪</span>
    </section>}
  </div>;
}
