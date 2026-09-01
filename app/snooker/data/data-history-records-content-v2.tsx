"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  CLASSIC_RECORD_ENTRY,
  CLASSIC_RECORDS,
  HISTORY_RECORD_CATEGORIES,
  historyLeaderboardItem,
  historyLeaderboardItemsForCategory,
  historyPlayerAvatar,
  historyPlayerNationality,
  historyRecordCategory,
  type HistoryRecordCategoryKey,
  type HistoryRecordItem,
} from "@/lib/snooker/history-records-v4";
import dataStyles from "./data.module.css";
import styles from "./data-history-records.module.css";
import v4Styles from "./data-history-records-v4.module.css";

type HistoryRecordsViewKey = HistoryRecordCategoryKey | "classic";
type AvatarSize = 256 | 512;

function itemTypeLabel(item: HistoryRecordItem) {
  return item.kind === "timeline" ? "历史档案" : "历史榜单";
}

function itemSizeLabel(item: HistoryRecordItem) {
  if (item.kind === "timeline") return `${item.rows.length}届`;
  if (item.rows.length >= 10) return `Top ${item.rows.length}`;
  return `${item.rows.length}条`;
}

function cleanRecordsParams(url: URL) {
  url.searchParams.delete("group");
  url.searchParams.delete("record");
}

function HistoryAvatar({ nameEn, size, className = "" }: { nameEn?: string | null; size: AvatarSize; className?: string }) {
  const src = historyPlayerAvatar(nameEn, size);
  if (!src) return null;
  return <span className={`${v4Styles.historyAvatar} ${className}`} aria-hidden="true">
    <img src={src} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.parentElement?.remove(); }} />
  </span>;
}

function splitRecordPeople(nameZh: string, nameEn?: string | null) {
  const namesZh = nameZh.split(/\s*\/\s*/).filter(Boolean);
  const namesEn = (nameEn ?? "").split(/\s*\/\s*/).filter(Boolean);
  const count = Math.max(namesZh.length, namesEn.length, 1);
  return Array.from({ length: count }, (_, index) => ({
    nameZh: namesZh[index] ?? namesZh[0] ?? nameZh,
    nameEn: namesEn[index] ?? namesEn[0] ?? nameEn ?? null,
  }));
}

function identityLine(nameEn?: string | null) {
  if (!nameEn) return null;
  const nationality = historyPlayerNationality(nameEn);
  return <small className={`${v4Styles.rowIdentity} ${v4Styles.historyUiEnglish}`}>
    <span>{nameEn}</span>
    {nationality ? <em className={v4Styles.rowNationality}>· {nationality}</em> : null}
  </small>;
}

export function HistoryRecordsSection() {
  const [group, setGroup] = useState<HistoryRecordsViewKey | null>(null);
  const [recordKey, setRecordKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") !== "data" || params.get("section") !== "records") {
        setGroup(null);
        setRecordKey(null);
        return;
      }

      const groupParam = params.get("group");
      if (groupParam === "classic") {
        setGroup("classic");
        setRecordKey(null);
        return;
      }

      const category = historyRecordCategory(groupParam);
      const recordParam = params.get("record");
      const leaderboard = historyLeaderboardItem(recordParam);
      const legacyClassic = CLASSIC_RECORDS.find((item) => item.key === recordParam);

      if (legacyClassic) {
        setGroup("classic");
        setRecordKey(null);
        return;
      }

      setGroup(category?.key ?? null);
      setRecordKey(leaderboard && category && leaderboard.category === category.key ? leaderboard.key : null);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("snooker:root-navigation", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("snooker:root-navigation", syncFromUrl);
    };
  }, []);

  useEffect(() => {
    if (!group) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [group]);

  const category = group && group !== "classic" ? historyRecordCategory(group) : null;
  const selected = recordKey ? historyLeaderboardItem(recordKey) : null;

  const openGroup = (key: HistoryRecordsViewKey) => {
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
    setGroup(key);
    setRecordKey(null);
  };

  const openLeaderboard = (item: HistoryRecordItem) => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.set("section", "records");
    url.searchParams.set("group", item.category);
    url.searchParams.set("record", item.key);
    window.history.pushState({ ...(window.history.state ?? {}), snookerHistoryRecords: "record" }, "", url.pathname + url.search + url.hash);
    setGroup(item.category);
    setRecordKey(item.key);
  };

  const closeRecords = () => {
    const state = window.history.state as { snookerHistoryRecords?: string } | null;
    if (state?.snookerHistoryRecords && window.history.length > 1) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", "data");
    url.searchParams.delete("section");
    cleanRecordsParams(url);
    window.history.replaceState({ ...(window.history.state ?? {}), snookerView: "data" }, "", url.pathname + url.search + url.hash);
    setGroup(null);
    setRecordKey(null);
  };

  const backToCategory = () => {
    const state = window.history.state as { snookerHistoryRecords?: string } | null;
    if (state?.snookerHistoryRecords === "record" && window.history.length > 1) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("record");
    window.history.replaceState({ ...(window.history.state ?? {}), snookerHistoryRecords: "group" }, "", url.pathname + url.search + url.hash);
    setRecordKey(null);
  };

  const overlayTitle = selected?.titleZh ?? (group === "classic" ? CLASSIC_RECORD_ENTRY.titleZh : category?.titleZh ?? "历史与纪录");

  return <>
    <section className={`${dataStyles.card} ${styles.hubCard}`}>
      <div className={dataStyles.sectionHeader}>
        <div><small>HISTORY &amp; RECORDS</small><h2>历史与纪录</h2></div>
        <span className={styles.sectionCount}>5 个入口</span>
      </div>
      <div className={styles.categoryGrid}>
        {HISTORY_RECORD_CATEGORIES.map((item) => {
          const count = historyLeaderboardItemsForCategory(item.key).length;
          return <button type="button" className={styles.categoryCard} onClick={() => openGroup(item.key)} key={item.key}>
            <div className={styles.categoryText}>
              <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
              <strong>{item.titleZh}</strong>
              <p>{item.previewZh}</p>
            </div>
            <div className={styles.categoryAside}><span>{count}项</span><i>›</i></div>
          </button>;
        })}
        <button type="button" className={`${styles.categoryCard} ${styles.classicEntry}`} onClick={() => openGroup("classic")}>
          <div className={styles.categoryText}>
            <small className={v4Styles.historyUiEnglish}>{CLASSIC_RECORD_ENTRY.titleEn}</small>
            <strong>{CLASSIC_RECORD_ENTRY.titleZh}</strong>
            <p>{CLASSIC_RECORD_ENTRY.previewZh}</p>
          </div>
          <div className={styles.categoryAside}><span>{CLASSIC_RECORDS.length}项</span><i>›</i></div>
        </button>
      </div>
    </section>

    {group ? <div className={styles.overlay} data-history-records-overlay="true">
      <div className={styles.overlayScroll}>
        <header className={styles.mobileHeader}>
          <button type="button" onClick={selected ? backToCategory : closeRecords} aria-label="返回"><span aria-hidden="true">‹</span></button>
          <strong>{overlayTitle}</strong>
          <span>DATA</span>
        </header>

        {selected ? <LeaderboardDetail item={selected} /> : group === "classic" ? <ClassicRecordsPage /> : category ? <CategoryDetail categoryKey={category.key} onOpenLeaderboard={openLeaderboard} /> : null}
      </div>
    </div> : null}
  </>;
}

function CategoryDetail({
  categoryKey,
  onOpenLeaderboard,
}: {
  categoryKey: HistoryRecordCategoryKey;
  onOpenLeaderboard: (item: HistoryRecordItem) => void;
}) {
  const category = historyRecordCategory(categoryKey)!;
  const items = historyLeaderboardItemsForCategory(categoryKey);

  return <main className={styles.detailPage}>
    <section className={styles.desktopIntro}>
      <div><small className={v4Styles.historyUiEnglish}>{category.titleEn}</small><h1>{category.titleZh}</h1><p>{category.descriptionZh}</p></div>
      <strong>{items.length} 项</strong>
    </section>
    <section className={`${styles.itemGrid} ${items.length === 1 ? styles.itemGridSingle : ""}`}>
      {items.map((item) => <button type="button" className={styles.itemCard} onClick={() => onOpenLeaderboard(item)} key={item.key}>
        <div className={styles.itemCardText}>
          <small>{itemTypeLabel(item)}</small>
          <strong>{item.titleZh}</strong>
          <em className={v4Styles.historyUiEnglish}>{item.titleEn}</em>
          <p>{item.descriptionZh}</p>
        </div>
        <div className={styles.itemCardAside}><span>{itemSizeLabel(item)}</span><i>›</i></div>
      </button>)}
    </section>
  </main>;
}

function LeaderboardDetail({ item }: { item: HistoryRecordItem }) {
  const lead = item.rows[0] ?? null;
  const leadNationality = historyPlayerNationality(lead?.nameEn);
  const leadAvatar = historyPlayerAvatar(lead?.nameEn, 512);

  return <main className={styles.detailPage}>
    <section className={styles.recordIntro}>
      <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
      <h1>{item.titleZh}</h1>
      <p>{item.descriptionZh}</p>
      {lead ? <div className={`${styles.recordHero} ${leadAvatar ? v4Styles.recordHeroWithAvatar : ""}`}>
        <div className={v4Styles.heroCopy}>
          <span>{item.kind === "timeline" ? "最新一届" : "历史第一"}</span>
          <strong>{lead.value}</strong>
          <b>{lead.nameZh}</b>
          {lead.nameEn ? <em className={v4Styles.historyUiEnglish}>{lead.nameEn}{leadNationality ? ` · ${leadNationality}` : ""}</em> : leadNationality ? <em>{leadNationality}</em> : null}
          {lead.meta ? <small>{lead.meta}</small> : null}
        </div>
        {leadAvatar ? <HistoryAvatar nameEn={lead.nameEn} size={512} className={v4Styles.heroAvatar} /> : null}
      </div> : null}
    </section>

    <section className={`${dataStyles.card} ${styles.listCard}`}>
      <div className={styles.listHeader}>
        <span>{item.kind === "timeline" ? "#" : "排名"}</span>
        <span>球员 / 纪录</span>
        <span>{item.kind === "timeline" ? "年份" : "数据"}</span>
      </div>
      <div className={styles.recordList}>
        {item.rows.map((row, index) => <article key={`${item.key}-${index}-${row.nameEn ?? row.nameZh}`}>
          <strong className={styles.rowRank}>{row.rank ?? index + 1}</strong>
          <div className={styles.rowMain}>
            <b>{row.nameZh}</b>
            {identityLine(row.nameEn)}
            {row.meta ? <span>{row.meta}</span> : null}
            {row.note ? <p>{row.note}</p> : null}
          </div>
          <em>{row.value}</em>
        </article>)}
      </div>
      <div className={styles.sourceBlock}>
        <div><small>统计口径</small><p>{item.methodologyZh}</p></div>
        <div><small>数据来源</small><p>{item.source.name}{item.source.updatedAt ? ` · 更新 ${item.source.updatedAt}` : ""}</p>{item.source.note ? <span>{item.source.note}</span> : null}</div>
      </div>
    </section>
  </main>;
}

function ClassicRecordsPage() {
  const sourceNames = [...new Set(CLASSIC_RECORDS.map((item) => item.source.name))].join(" · ");

  return <main className={styles.detailPage}>
    <section className={styles.desktopIntro}>
      <div><small className={v4Styles.historyUiEnglish}>{CLASSIC_RECORD_ENTRY.titleEn}</small><h1>{CLASSIC_RECORD_ENTRY.titleZh}</h1><p>{CLASSIC_RECORD_ENTRY.descriptionZh}</p></div>
      <strong>{CLASSIC_RECORDS.length} 项</strong>
    </section>
    <section className={`${styles.classicGrid} ${v4Styles.classicGridSingle}`}>
      {CLASSIC_RECORDS.map((item) => {
        const row = item.rows[0];
        if (!row) return null;
        const people = splitRecordPeople(row.nameZh, row.nameEn);
        const visiblePeople = people.slice(0, 2).filter((person) => Boolean(historyPlayerAvatar(person.nameEn, 256)));
        const nationalities = people.map((person) => historyPlayerNationality(person.nameEn)).filter((value): value is string => Boolean(value));
        return <article className={`${styles.classicCard} ${visiblePeople.length ? v4Styles.classicCardWithAvatar : ""}`} key={item.key}>
          <div className={v4Styles.classicCopy}>
            <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
            <h2>{item.titleZh}</h2>
            <strong>{row.value}</strong>
            <b>{row.nameZh}</b>
            {row.nameEn ? <em className={v4Styles.historyUiEnglish}>{row.nameEn}</em> : null}
            {nationalities.length ? <span className={v4Styles.classicNationality}>{nationalities.join(" / ")}</span> : null}
            {row.meta ? <p>{row.meta}</p> : null}
          </div>
          {visiblePeople.length ? <div className={v4Styles.classicAvatars} aria-hidden="true">
            {visiblePeople.map((person, index) => <HistoryAvatar nameEn={person.nameEn} size={256} className={v4Styles.classicAvatar} key={`${item.key}-${person.nameEn ?? person.nameZh}-${index}`} />)}
          </div> : null}
        </article>;
      })}
    </section>
    <section className={styles.classicMeta}>
      <div><small>数据说明</small><p>本页为固定静态历史快照，不会在用户访问时请求外部网站或数据库。有现成透明头像的纪录显示头像，没有头像的纪录保持纯文字卡片。</p></div>
      <div><small>数据来源</small><p>{sourceNames}</p></div>
    </section>
  </main>;
}
