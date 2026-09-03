"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SnookerPlayerListItem } from "@/lib/snooker/player-data";
import type {
  PlayerCompareH2H,
  PlayerComparePlayer,
  PlayerCompareSeason,
  PlayerCompareSnapshot,
} from "@/lib/snooker/player-compare";
import PublicSiteHeader from "../public-site-header";
import styles from "./player-compare.module.css";

type CompareTab = "season" | "career" | "h2h" | "honours";
type SelectorSide = "left" | "right" | null;
type PlayerFilter = "all" | "top16" | "china";
type Trend = "higher" | "lower" | "neutral";

type MetricRowProps = {
  label: string;
  left: number | null | undefined;
  right: number | null | undefined;
  format?: (value: number | null | undefined) => string;
  trend?: Trend;
  hint?: string;
};

const fmtInt = (value: number | null | undefined) => value === null || value === undefined ? "—" : Math.round(value).toLocaleString("zh-CN");
const fmtOne = (value: number | null | undefined) => value === null || value === undefined ? "—" : value.toFixed(1);
const fmtPercent = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
const fmtRank = (value: number | null | undefined) => value === null || value === undefined || value <= 0 ? "—" : `#${Math.round(value)}`;
const fmtSeconds = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${value.toFixed(1)}秒`;
const fmtEfficiency = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${value.toFixed(1)}局/次`;

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function displayDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function displayUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间待确认";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function PlayerAvatar({ player, large = false }: { player: PlayerComparePlayer | SnookerPlayerListItem; large?: boolean }) {
  return <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`}>
    {player.avatarUrl ? <img src={player.avatarUrl} alt="" loading={large ? "eager" : "lazy"} decoding="async" /> : <span>{initials(player.nameEn)}</span>}
  </span>;
}

function compareSide(left: number | null | undefined, right: number | null | undefined, trend: Trend) {
  if (trend === "neutral" || left === null || left === undefined || right === null || right === undefined || left === right) return null;
  if (trend === "higher") return left > right ? "left" : "right";
  return left < right ? "left" : "right";
}

function MetricRow({ label, left, right, format = fmtInt, trend = "higher", hint }: MetricRowProps) {
  const leader = compareSide(left, right, trend);
  return <div className={styles.metricRow}>
    <strong className={leader === "left" ? styles.metricLeader : ""}>{format(left)}</strong>
    <span><b>{label}</b>{hint ? <small>{hint}</small> : null}</span>
    <strong className={leader === "right" ? styles.metricLeader : ""}>{format(right)}</strong>
  </div>;
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className={styles.sectionCard}>
    <header className={styles.sectionHeader}><small>{eyebrow}</small><h2>{title}</h2></header>
    <div className={styles.metricList}>{children}</div>
  </section>;
}

function seasonRanking(data: PlayerCompareSnapshot, stat: PlayerCompareSeason | null, player: PlayerComparePlayer) {
  const currentSeason = data.availableSeasons[0] ?? data.season;
  return data.season === currentSeason ? player.currentRank : stat?.ranking ?? null;
}

function leadCount(data: PlayerCompareSnapshot) {
  const [left, right] = data.seasonStats;
  const players = data.players;
  if (!left || !right) return { left: 0, right: 0, ties: 0 };
  const values: Array<[number | null | undefined, number | null | undefined, Trend]> = [
    [seasonRanking(data, left, players[0]), seasonRanking(data, right, players[1]), "lower"],
    [left.matchWinRate, right.matchWinRate, "higher"],
    [left.frameWinRate, right.frameWinRate, "higher"],
    [left.breaks50Plus, right.breaks50Plus, "higher"],
    [left.breaks100Plus, right.breaks100Plus, "higher"],
    [left.framesPerCentury, right.framesPerCentury, "lower"],
    [left.highestBreak, right.highestBreak, "higher"],
    [left.titlesTotal, right.titlesTotal, "higher"],
    [left.finals, right.finals, "higher"],
  ];
  return values.reduce((acc, [a, b, trend]) => {
    if (a === null || a === undefined || b === null || b === undefined || a === b) acc.ties += 1;
    else if (compareSide(a, b, trend) === "left") acc.left += 1;
    else acc.right += 1;
    return acc;
  }, { left: 0, right: 0, ties: 0 });
}

function SeasonSummary({ data }: { data: PlayerCompareSnapshot }) {
  const [left, right] = data.seasonStats;
  const [leftPlayer, rightPlayer] = data.players;
  const leads = leadCount(data);
  return <section className={styles.summaryCard}>
    <div className={styles.summaryHead}>
      <div><small>SEASON SNAPSHOT</small><h2>{data.season} 赛季表现</h2></div>
      <div className={styles.leadBadge}><span>{leftPlayer.shortNameZh || leftPlayer.nameZh} {leads.left}项</span><i>领先指标</i><span>{rightPlayer.shortNameZh || rightPlayer.nameZh} {leads.right}项</span></div>
    </div>
    <div className={styles.summaryMetrics}>
      <MetricRow label="世界排名" left={seasonRanking(data, left, leftPlayer)} right={seasonRanking(data, right, rightPlayer)} format={fmtRank} trend="lower" />
      <MetricRow label="比赛胜率" left={left?.matchWinRate} right={right?.matchWinRate} format={fmtPercent} />
      <MetricRow label="局胜率" left={left?.frameWinRate} right={right?.frameWinRate} format={fmtPercent} />
      <MetricRow label="破百" left={left?.breaks100Plus} right={right?.breaks100Plus} />
      <MetricRow label="破百效率" left={left?.framesPerCentury} right={right?.framesPerCentury} format={fmtEfficiency} trend="lower" />
      <MetricRow label="赛事冠军" left={left?.titlesTotal} right={right?.titlesTotal} />
    </div>
    <p className={styles.summaryText}>
      {left && right
        ? leads.left === leads.right
          ? `两人在当前核心指标中整体接近；可继续查看比赛、进攻效率和直接交手数据。`
          : `${leads.left > leads.right ? leftPlayer.nameZh : rightPlayer.nameZh}在当前核心赛季指标中领先更多项目；这只是逐项比较，不生成主观综合评分。`
        : "该赛季部分球员统计尚未完整入库，缺失项以“—”显示，不按 0 处理。"}
    </p>
  </section>;
}

function SeasonTab({ data }: { data: PlayerCompareSnapshot }) {
  const [left, right] = data.seasonStats;
  const [leftPlayer, rightPlayer] = data.players;
  return <div className={styles.tabContent}>
    <SeasonSummary data={data} />
    <div className={styles.twoColumnSections}>
      <Section eyebrow="MATCH PERFORMANCE" title="比赛表现">
        <MetricRow label="参赛赛事" left={left?.eventsPlayed} right={right?.eventsPlayed} trend="neutral" />
        <MetricRow label="比赛场次" left={left?.matchesPlayed} right={right?.matchesPlayed} trend="neutral" />
        <MetricRow label="获胜场次" left={left?.matchesWon} right={right?.matchesWon} />
        <MetricRow label="负场" left={left?.matchesLost} right={right?.matchesLost} trend="lower" />
        <MetricRow label="平局" left={left?.matchesDrawn} right={right?.matchesDrawn} trend="neutral" />
        <MetricRow label="比赛胜率" left={left?.matchWinRate} right={right?.matchWinRate} format={fmtPercent} />
        <MetricRow label="赢局" left={left?.framesWon} right={right?.framesWon} />
        <MetricRow label="输局" left={left?.framesLost} right={right?.framesLost} trend="lower" />
        <MetricRow label="局胜率" left={left?.frameWinRate} right={right?.frameWinRate} format={fmtPercent} />
      </Section>
      <Section eyebrow="SCORING" title="得分与进攻">
        <MetricRow label="赛季总得分" left={left?.pointsScored} right={right?.pointsScored} />
        <MetricRow label="50+" left={left?.breaks50Plus} right={right?.breaks50Plus} />
        <MetricRow label="破百" left={left?.breaks100Plus} right={right?.breaks100Plus} />
        <MetricRow label="50+效率" left={left?.framesPer50} right={right?.framesPer50} format={fmtEfficiency} trend="lower" hint="基于有逐局数据的比赛" />
        <MetricRow label="破百效率" left={left?.framesPerCentury} right={right?.framesPerCentury} format={fmtEfficiency} trend="lower" hint="基于有逐局数据的比赛" />
        <MetricRow label="单杆最高" left={left?.highestBreak} right={right?.highestBreak} />
        <MetricRow label="147" left={left?.maximums} right={right?.maximums} />
        <MetricRow label="平均单杆" left={left?.averageBreak} right={right?.averageBreak} format={fmtOne} />
        <MetricRow label="平均出杆" left={left?.averageShotTime} right={right?.averageShotTime} format={fmtSeconds} trend="neutral" hint="风格指标，不判定优劣" />
      </Section>
      <Section eyebrow="TOURNAMENT RESULTS" title="赛事成绩">
        <MetricRow label="冠军" left={left?.titlesTotal} right={right?.titlesTotal} />
        <MetricRow label="决赛" left={left?.finals} right={right?.finals} />
        <MetricRow label="排名赛冠军" left={left?.rankingTitles} right={right?.rankingTitles} />
        <MetricRow label="排名赛决赛" left={left?.rankingFinals} right={right?.rankingFinals} />
        <MetricRow label="三大赛冠军" left={left?.tripleCrownTitles} right={right?.tripleCrownTitles} />
      </Section>
      <Section eyebrow="DATA COVERAGE" title="数据完整度">
        <MetricRow label="逐局数据覆盖" left={left?.frameCoveragePct} right={right?.frameCoveragePct} format={fmtPercent} trend="neutral" />
        <MetricRow label="退赛获胜" left={left?.walkoversWon} right={right?.walkoversWon} trend="neutral" />
        <MetricRow label="退赛失利" left={left?.walkoversLost} right={right?.walkoversLost} trend="neutral" />
        <div className={styles.coverageNote}>“—”代表该项数据尚无可靠覆盖，不等同于 0。逐局效率只在已入库的局数据基础上计算。</div>
      </Section>
    </div>
    <div className={styles.inlineNames}><span>{leftPlayer.nameZh}</span><i>VS</i><span>{rightPlayer.nameZh}</span></div>
  </div>;
}

function CareerTab({ data }: { data: PlayerCompareSnapshot }) {
  const [left, right] = data.careerStats;
  return <div className={styles.tabContent}>
    <div className={styles.twoColumnSections}>
      <Section eyebrow="CAREER RECORD" title="职业生涯">
        <MetricRow label="职业赛季" left={left?.seasonsPlayed} right={right?.seasonsPlayed} />
        <MetricRow label="比赛场次" left={left?.matchesPlayed} right={right?.matchesPlayed} trend="neutral" />
        <MetricRow label="获胜场次" left={left?.matchesWon} right={right?.matchesWon} />
        <MetricRow label="比赛胜率" left={left?.matchWinRate} right={right?.matchWinRate} format={fmtPercent} />
        <MetricRow label="局胜率" left={left?.frameWinRate} right={right?.frameWinRate} format={fmtPercent} />
        <MetricRow label="历史最高排名" left={left?.highestRanking} right={right?.highestRanking} format={fmtRank} trend="lower" />
      </Section>
      <Section eyebrow="CAREER BREAKS" title="生涯单杆">
        <MetricRow label="50+" left={left?.breaks50Plus} right={right?.breaks50Plus} />
        <MetricRow label="破百" left={left?.breaks100Plus} right={right?.breaks100Plus} />
        <MetricRow label="147" left={left?.maximums} right={right?.maximums} />
        <MetricRow label="单杆最高" left={left?.highestBreak} right={right?.highestBreak} />
        <MetricRow label="逐局覆盖" left={left?.frameCoveragePct} right={right?.frameCoveragePct} format={fmtPercent} trend="neutral" />
      </Section>
      <Section eyebrow="CAREER RESULTS" title="生涯成绩">
        <MetricRow label="赛事冠军" left={left?.titlesTotal} right={right?.titlesTotal} />
        <MetricRow label="赛事决赛" left={left?.finals} right={right?.finals} />
        <MetricRow label="排名赛冠军" left={left?.rankingTitles} right={right?.rankingTitles} />
        <MetricRow label="排名赛决赛" left={left?.rankingFinals} right={right?.rankingFinals} />
        <MetricRow label="三大赛冠军" left={left?.tripleCrownTitles} right={right?.tripleCrownTitles} />
      </Section>
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}><small>COVERAGE</small><h2>职业数据范围</h2></header>
        <div className={styles.careerCoverage}>
          <div><strong>{left?.warehouseStartSeason ?? left?.firstSeason ?? "—"}</strong><span>至</span><strong>{left?.warehouseEndSeason ?? left?.lastSeason ?? "—"}</strong><small>{left?.isCareerComplete ? "完整职业生涯覆盖" : "当前数据库覆盖范围"}</small></div>
          <i>VS</i>
          <div><strong>{right?.warehouseStartSeason ?? right?.firstSeason ?? "—"}</strong><span>至</span><strong>{right?.warehouseEndSeason ?? right?.lastSeason ?? "—"}</strong><small>{right?.isCareerComplete ? "完整职业生涯覆盖" : "当前数据库覆盖范围"}</small></div>
        </div>
      </section>
    </div>
  </div>;
}

function H2HScore({ h2h, players }: { h2h: PlayerCompareH2H; players: [PlayerComparePlayer, PlayerComparePlayer] }) {
  return <section className={styles.h2hHero}>
    <div><small>{players[0].shortNameZh || players[0].nameZh}</small><strong>{h2h.leftWins}</strong><span>胜</span></div>
    <div className={styles.h2hMiddle}><small>历史交手</small><strong>{h2h.matchRecords} 场</strong><span>{h2h.draws ? `${h2h.draws} 平 · ` : ""}历史局分 {h2h.leftFrames} : {h2h.rightFrames}</span></div>
    <div><small>{players[1].shortNameZh || players[1].nameZh}</small><strong>{h2h.rightWins}</strong><span>胜</span></div>
  </section>;
}

function H2HTab({ data }: { data: PlayerCompareSnapshot }) {
  const { h2h } = data;
  return <div className={styles.tabContent}>
    <H2HScore h2h={h2h} players={data.players} />
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}><small>HEAD TO HEAD</small><h2>交手概览</h2></header>
      <div className={styles.metricList}>
        <MetricRow label="胜场" left={h2h.leftWins} right={h2h.rightWins} />
        <MetricRow label="历史赢局" left={h2h.leftFrames} right={h2h.rightFrames} />
        <MetricRow label="退赛获胜" left={h2h.leftWalkovers} right={h2h.rightWalkovers} trend="neutral" />
      </div>
      {h2h.draws || h2h.leftWalkovers || h2h.rightWalkovers ? <p className={styles.h2hNote}>交手统计包含官方比赛结果；退赛可计入比赛结果，但不会用伪造局分补齐逐局统计。{h2h.draws ? ` 当前有 ${h2h.draws} 场平局。` : ""}</p> : null}
    </section>
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}><small>MEETING HISTORY</small><h2>历史交手</h2></header>
      {h2h.recentMeetings.length ? <div className={styles.meetingList}>
        {h2h.recentMeetings.map((meeting) => <article key={meeting.id}>
          <time>{displayDate(meeting.scheduledAt)}</time>
          <div><small>{meeting.eventNameZh} · {meeting.roundLabelZh}</small><strong>{data.players[0].shortNameZh || data.players[0].nameZh} {meeting.leftScore ?? "—"} : {meeting.rightScore ?? "—"} {data.players[1].shortNameZh || data.players[1].nameZh}</strong>{meeting.isWalkover || meeting.note ? <span>{meeting.note ?? "退赛结果"}</span> : null}</div>
          <em className={meeting.winnerSide === "left" ? styles.leftWin : meeting.winnerSide === "right" ? styles.rightWin : ""}>{meeting.winnerSide === "left" ? "左胜" : meeting.winnerSide === "right" ? "右胜" : "平"}</em>
        </article>)}
      </div> : <div className={styles.emptyState}>当前数据库没有识别到两名球员的正式交手记录。</div>}
    </section>
  </div>;
}

function HonourTile({ title, left, right, label }: { title: string; left: number | null | undefined; right: number | null | undefined; label?: string }) {
  const leader = compareSide(left, right, "higher");
  return <article className={styles.honourTile}>
    <small>{title}</small>
    <div><strong className={leader === "left" ? styles.metricLeader : ""}>{fmtInt(left)}</strong><i>:</i><strong className={leader === "right" ? styles.metricLeader : ""}>{fmtInt(right)}</strong></div>
    {label ? <span>{label}</span> : null}
  </article>;
}

function HonoursTab({ data }: { data: PlayerCompareSnapshot }) {
  const [left, right] = data.careerStats;
  return <div className={styles.tabContent}>
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}><small>HONOURS</small><h2>荣誉对比</h2></header>
      <div className={styles.honourGrid}>
        <HonourTile title="世界锦标赛" left={left?.worldChampionshipTitles} right={right?.worldChampionshipTitles} label="世锦赛冠军" />
        <HonourTile title="英国锦标赛" left={left?.ukChampionshipTitles} right={right?.ukChampionshipTitles} label="英锦赛冠军" />
        <HonourTile title="大师赛" left={left?.mastersTitles} right={right?.mastersTitles} label="大师赛冠军" />
        <HonourTile title="三大赛" left={left?.tripleCrownTitles} right={right?.tripleCrownTitles} label="三大赛冠军合计" />
        <HonourTile title="排名赛" left={left?.rankingTitles} right={right?.rankingTitles} label="排名赛冠军" />
        <HonourTile title="职业赛事" left={left?.titlesTotal} right={right?.titlesTotal} label="本站聚合冠军" />
      </div>
      <p className={styles.h2hNote}>冠军统计以赛事最终冠军为口径；多阶段赛事不会把中间阶段重复计为冠军。</p>
    </section>
  </div>;
}

function PlayerSelector({
  side,
  players,
  selectedSlugs,
  onClose,
  onSelect,
}: {
  side: Exclude<SelectorSide, null>;
  players: SnookerPlayerListItem[];
  selectedSlugs: [string, string];
  onClose: () => void;
  onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlayerFilter>("all");
  const otherSlug = side === "left" ? selectedSlugs[1] : selectedSlugs[0];
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return players.filter((player) => {
      if (!player.isCurrentTour) return false;
      if (filter === "top16" && (player.currentRank === null || player.currentRank > 16)) return false;
      if (filter === "china" && !["CN", "CHN"].includes(player.countryCode ?? "")) return false;
      if (!keyword) return true;
      return [player.nameZh, player.nameEn, player.shortNameZh ?? "", player.nationalityZh ?? ""].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [filter, players, query]);

  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className={styles.selectorModal} role="dialog" aria-modal="true" aria-label={`选择${side === "left" ? "左侧" : "右侧"}球员`}>
      <header><div><small>PLAYER SELECTOR</small><h2>选择职业球员</h2></div><button type="button" onClick={onClose} aria-label="关闭">×</button></header>
      <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索中文名 / 英文名" />
      <div className={styles.selectorFilters}>
        <button className={filter === "all" ? styles.filterActive : ""} onClick={() => setFilter("all")}>全部</button>
        <button className={filter === "top16" ? styles.filterActive : ""} onClick={() => setFilter("top16")}>TOP 16</button>
        <button className={filter === "china" ? styles.filterActive : ""} onClick={() => setFilter("china")}>中国球员</button>
      </div>
      <div className={styles.selectorList}>
        {filtered.map((player) => <button type="button" disabled={player.slug === otherSlug} onClick={() => onSelect(player.slug)} key={player.id}>
          <b>{player.currentRank ?? "—"}</b><PlayerAvatar player={player} /><span><strong>{player.nameZh}</strong><small>{player.nameEn} · {player.nationalityZh ?? ""}</small></span><em>{player.slug === otherSlug ? "已选择" : "选择"}</em>
        </button>)}
      </div>
    </section>
  </div>;
}

export default function PlayerCompareClient({
  players,
  initialCompare,
}: {
  players: SnookerPlayerListItem[];
  initialCompare: PlayerCompareSnapshot | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<PlayerCompareSnapshot | null>(initialCompare);
  const [selected, setSelected] = useState<[string, string]>(() => initialCompare ? [initialCompare.players[0].slug, initialCompare.players[1].slug] : [players[0]?.slug ?? "", players[1]?.slug ?? ""]);
  const [tab, setTab] = useState<CompareTab>("season");
  const [selectorSide, setSelectorSide] = useState<SelectorSide>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPlayers: [string, string], season?: string) => {
    if (!nextPlayers[0] || !nextPlayers[1] || nextPlayers[0] === nextPlayers[1]) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ player1: nextPlayers[0], player2: nextPlayers[1] });
      if (season) params.set("season", season);
      const response = await fetch(`/api/snooker/v1/player-compare?${params.toString()}`, { headers: { Accept: "application/json" } });
      const body = await response.json() as { ok?: boolean; compare?: PlayerCompareSnapshot; error?: string };
      if (!response.ok || !body.compare) throw new Error(body.error || "球员对比数据加载失败");
      setData(body.compare);
      setSelected([body.compare.players[0].slug, body.compare.players[1].slug]);
      const url = `/snooker/compare?player1=${encodeURIComponent(body.compare.players[0].slug)}&player2=${encodeURIComponent(body.compare.players[1].slug)}&season=${encodeURIComponent(body.compare.season)}`;
      router.replace(url, { scroll: false });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "球员对比数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  const choosePlayer = (slug: string) => {
    if (!selectorSide) return;
    const next: [string, string] = selectorSide === "left" ? [slug, selected[1]] : [selected[0], slug];
    setSelectorSide(null);
    void load(next, data?.season);
  };

  const swapPlayers = () => {
    const next: [string, string] = [selected[1], selected[0]];
    void load(next, data?.season);
  };

  const goBack = () => {
    try {
      const returnUrl = window.sessionStorage.getItem("snooker-compare-return");
      if (returnUrl) {
        const target = new URL(returnUrl);
        if (target.origin === window.location.origin) {
          window.sessionStorage.removeItem("snooker-compare-return");
          window.sessionStorage.setItem("snooker-compare-restore", target.href);
          if (window.history.length > 1) {
            window.history.back();
            return;
          }
          router.replace(`${target.pathname}${target.search}${target.hash}`, { scroll: false });
          return;
        }
      }
    } catch {
      // Fall through to the lightweight data-center route.
    }
    router.replace("/?view=data", { scroll: false });
  };

  const [leftPlayer, rightPlayer] = data?.players ?? [players.find((player) => player.slug === selected[0]), players.find((player) => player.slug === selected[1])];

  return <main className={styles.page}>
    <PublicSiteHeader active="players" />
    <header className={`${styles.topbar} ${styles.mobileTopbar}`}>
      <button type="button" className={styles.backLink} onClick={goBack} aria-label="返回上一页">‹</button>
      <strong className={styles.mobileHeaderTitle}>球员对比</strong>
      <span className={styles.mobileHeaderEyebrow}>PLAYER</span>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroTitle}><small>PLAYER COMPARE</small><h1>球员对比</h1><p>赛季表现 × 职业生涯 × 直接交手 × 荣誉成就</p></div>
      <div className={styles.playersHero}>
        <button type="button" className={styles.playerHero} onClick={() => setSelectorSide("left")}>
          {leftPlayer ? <PlayerAvatar player={leftPlayer} large /> : null}
          <div><strong>{leftPlayer?.nameZh ?? "选择球员"}</strong><small>{leftPlayer?.nameEn ?? ""}</small><span>{leftPlayer?.currentRank ? `世界 #${leftPlayer.currentRank}` : "排名待同步"} · {leftPlayer?.nationalityZh ?? ""}</span></div>
          <em>更换球员</em>
        </button>
        <div className={styles.vsControl}><button className={styles.swapButton} type="button" onClick={swapPlayers} aria-label="交换球员">⇄<span>VS</span></button><small>{loading ? "同步中…" : data ? `更新 ${displayUpdated(data.updatedAt)}` : "数据加载中"}</small></div>
        <button type="button" className={`${styles.playerHero} ${styles.playerHeroRight}`} onClick={() => setSelectorSide("right")}>
          {rightPlayer ? <PlayerAvatar player={rightPlayer} large /> : null}
          <div><strong>{rightPlayer?.nameZh ?? "选择球员"}</strong><small>{rightPlayer?.nameEn ?? ""}</small><span>{rightPlayer?.currentRank ? `世界 #${rightPlayer.currentRank}` : "排名待同步"} · {rightPlayer?.nationalityZh ?? ""}</span></div>
          <em>更换球员</em>
        </button>
      </div>

    </section>

    <nav className={styles.tabs} aria-label="球员对比维度">
      {([['season', '赛季表现', 'SEASON'], ['career', '职业生涯', 'CAREER'], ['h2h', '交手记录', 'H2H'], ['honours', '荣誉对比', 'HONOURS']] as Array<[CompareTab, string, string]>).map(([key, label, en]) => <button type="button" className={tab === key ? styles.tabActive : ""} onClick={() => setTab(key)} key={key}><span>{label}</span><small>{en}</small></button>)}
    </nav>

    {tab === "season" ? <div className={styles.seasonToolbar}><label><span>赛季</span><select value={data?.season ?? ""} disabled={!data || loading} onChange={(event) => void load(selected, event.target.value)}>{data?.availableSeasons.map((season) => <option value={season} key={season}>{season}</option>)}</select></label><small>仅影响赛季表现数据</small></div> : null}

    {error ? <div className={styles.errorBox}>{error}<button type="button" onClick={() => void load(selected, data?.season)}>重试</button></div> : null}
    {!data ? <div className={styles.emptyState}>暂无可用的球员对比数据。</div> : <>
      {tab === "season" ? <SeasonTab data={data} /> : null}
      {tab === "career" ? <CareerTab data={data} /> : null}
      {tab === "h2h" ? <H2HTab data={data} /> : null}
      {tab === "honours" ? <HonoursTab data={data} /> : null}
      <footer className={styles.dataFooter}>
        <strong>数据说明</strong>
        <p>当前第一阶段仅开放职业巡回赛球员。赛季聚合、比赛与逐局数据来自147数据局现有数据仓库及官方同步链路；缺失数据统一显示“—”，不会当作 0。</p>
        <span>当前赛季逐局覆盖：{data.coverage.leftFramePct === null ? "—" : `${data.coverage.leftFramePct.toFixed(1)}%`} / {data.coverage.rightFramePct === null ? "—" : `${data.coverage.rightFramePct.toFixed(1)}%`} · 更新 {displayUpdated(data.updatedAt)}</span>
      </footer>
    </>}

    {selectorSide ? <PlayerSelector side={selectorSide} players={players} selectedSlugs={selected} onClose={() => setSelectorSide(null)} onSelect={choosePlayer} /> : null}
  </main>;
}
