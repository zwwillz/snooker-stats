"use client";

import type { HomeLeaderItem, HomeLeaderMetricKey, HomeLeadersPayload } from "@/lib/snooker/home-leaders";
import styles from "./home-season-leaders.module.css";

function formatValue(leader: HomeLeaderItem) {
  if (leader.value === null) return "—";
  if (leader.unit === "percent") return `${leader.value.toFixed(1)}%`;
  if (leader.unit === "seconds") return `${leader.value.toFixed(1)}s`;
  return Math.round(leader.value).toLocaleString("en-GB");
}

function captionFor(key: HomeLeaderMetricKey) {
  switch (key) {
    case "maximums": return "本赛季147";
    case "centuries": return "本赛季破百";
    case "win_rate": return "比赛胜率";
    case "shot_time": return "平均出杆时间";
  }
}

export default function HomeSeasonLeaders({
  initialPayload,
  onOpenMetric,
}: {
  initialPayload: HomeLeadersPayload;
  onOpenMetric: (key: HomeLeaderMetricKey) => void;
}) {
  return <section className={styles.card} aria-label="本赛季数据榜">
    <div className={styles.header}>
      <div><small>SEASON LEADERS</small><h2>本赛季数据榜</h2></div>
      <span>{initialPayload.seasonLabel || "当前赛季"}</span>
    </div>
    <div className={styles.grid}>
      {initialPayload.leaders.map((leader) => <button
        type="button"
        className={styles.item}
        onClick={() => leader.available && onOpenMetric(leader.key)}
        disabled={!leader.available}
        key={leader.key}
      >
        <div className={styles.copy}>
          <span className={styles.metric}>{leader.labelZh}</span>
          <div className={styles.player}>
            <strong>{leader.player?.nameZh ?? "暂无数据"}</strong>
            <small>{leader.player?.nameEn ?? leader.labelEn}</small>
          </div>
          <b className={styles.value}>{formatValue(leader)}</b>
          <small className={styles.caption}>{captionFor(leader.key)}</small>
        </div>
        {leader.player?.avatarUrl ? <img className={styles.portrait} src={leader.player.avatarUrl} alt="" loading="lazy" decoding="async" /> : null}
      </button>)}
    </div>
    <button className={styles.action} type="button" onClick={() => onOpenMetric("centuries")}>查看完整数据榜</button>
  </section>;
}
