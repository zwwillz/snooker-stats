"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  HISTORY_RECORD_CATEGORIES,
  historyRecordCategory,
  historyRecordItem,
  historyRecordItemsForCategory,
  type HistoryRecordCategoryKey,
  type HistoryRecordItem,
} from "@/lib/snooker/history-records";
import dataStyles from "./data.module.css";
import styles from "./data-history-records.module.css";

function itemTypeLabel(item: HistoryRecordItem) {
  if (item.kind === "leaderboard") return "历史榜单";
  if (item.kind === "timeline") return "历史时间线";
  return "历史纪录";
}

function cleanRecordsParams(url: URL) {
  url.searchParams.delete("group");
  url.searchParams.delete("record");
}

export function HistoryRecordsSection() {
  const [group, setGroup] = useState<HistoryRecordCategoryKey | null>(null);
  const [recordKey, setRecordKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") !== "data" || params.get("section") !== "records") {
        setGroup(null);
        setRecordKey(null);
        return;
      }
      const category = historyRecordCategory(params.get("group"));
      const record = historyRecordItem(params.get("record"));
      setGroup(category?.key ?? null);
      setRecordKey(record && category && record.category === category.key ? record.key : null);
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

  const category = group ? historyRecordCategory(group) : null;
  const selected = recordKey ? historyRecordItem(recordKey) : null;

  const openCategory = (key: HistoryRecordCategoryKey) => {
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

  const openRecord = (item: HistoryRecordItem) => {
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

  return <div className={styles.mountMarker}>
    <section className={`${dataStyles.card} ${styles.hubCard}`}>
      <div className={dataStyles.sectionHeader}>
        <div><small>HISTORY &amp; RECORDS</small><h2>历史与纪录</h2></div>
        <span className={styles.sectionCount}>{HISTORY_RECORD_CATEGORIES.length} 类</span>
      </div>
      <div className={styles.categoryGrid}>
        {HISTORY_RECORD_CATEGORIES.map((item) => {
          const count = historyRecordItemsForCategory(item.key).length;
          return <button type="button" className={styles.categoryCard} onClick={() => openCategory(item.key)} key={item.key}>
            <div className={styles.categoryTop}><small>{item.titleEn}</small><span>{count}</span></div>
            <strong>{item.titleZh}</strong>
            <p>{item.descriptionZh}</p>
            <div className={styles.categoryMeta}><span>{item.previewZh}</span><i>›</i></div>
          </button>;
        })}
      </div>
    </section>

    {group && category ? <div className={styles.overlay} data-history-records-overlay="true">
      <div className={styles.overlayScroll}>
        <header className={styles.mobileHeader}>
          <button type="button" onClick={selected ? backToCategory : closeRecords} aria-label="返回"><span aria-hidden="true">‹</span></button>
          <strong>{selected?.titleZh ?? category.titleZh}</strong>
          <span>DATA</span>
        </header>

        {selected ? <RecordDetail item={selected} /> : <CategoryDetail categoryKey={group} onOpenRecord={openRecord} />}
      </div>
    </div> : null}
  </div>;
}

function CategoryDetail({
  categoryKey,
  onOpenRecord,
}: {
  categoryKey: HistoryRecordCategoryKey;
  onOpenRecord: (item: HistoryRecordItem) => void;
}) {
  const category = historyRecordCategory(categoryKey)!;
  const items = historyRecordItemsForCategory(categoryKey);
  return <main className={styles.detailPage}>
    <section className={styles.desktopIntro}>
      <div><small>{category.titleEn}</small><h1>{category.titleZh}</h1><p>{category.descriptionZh}</p></div>
      <strong>{items.length} 项</strong>
    </section>
    <section className={styles.itemGrid}>
      {items.map((item) => <button type="button" className={styles.itemCard} onClick={() => onOpenRecord(item)} key={item.key}>
        <div className={styles.itemCardTop}><small>{itemTypeLabel(item)}</small><span>{item.rows[0]?.value ?? "查看"}</span></div>
        <strong>{item.titleZh}</strong>
        <em>{item.titleEn}</em>
        <p>{item.descriptionZh}</p>
        <div className={styles.itemCardFoot}><span>来源：{item.source.name}</span><i>›</i></div>
      </button>)}
    </section>
  </main>;
}

function RecordDetail({ item }: { item: HistoryRecordItem }) {
  const lead = item.rows[0] ?? null;
  return <main className={styles.detailPage}>
    <section className={styles.recordIntro}>
      <small>{item.titleEn}</small>
      <h1>{item.titleZh}</h1>
      <p>{item.descriptionZh}</p>
      {item.kind === "record" && lead ? <div className={styles.recordHero}>
        <span>{lead.meta ?? itemTypeLabel(item)}</span>
        <strong>{lead.value}</strong>
        <b>{lead.nameZh}</b>
        {lead.nameEn ? <em>{lead.nameEn}</em> : null}
      </div> : null}
    </section>

    <section className={`${dataStyles.card} ${styles.listCard}`}>
      <div className={styles.listHeader}>
        <span>{item.kind === "leaderboard" ? "排名" : "#"}</span>
        <span>球员 / 纪录</span>
        <span>数据</span>
      </div>
      <div className={styles.recordList}>
        {item.rows.map((row, index) => <article key={`${item.key}-${index}-${row.nameEn ?? row.nameZh}`}>
          <strong className={styles.rowRank}>{row.rank ?? (item.rows.length > 1 ? index + 1 : "•")}</strong>
          <div className={styles.rowMain}>
            <b>{row.nameZh}</b>
            {row.nameEn ? <small>{row.nameEn}</small> : null}
            {row.meta ? <span>{row.meta}</span> : null}
            {row.note ? <p>{row.note}</p> : null}
          </div>
          <em>{row.value}</em>
        </article>)}
      </div>
      <div className={styles.sourceBlock}>
        <div><small>统计口径</small><p>{item.methodologyZh}</p></div>
        <div><small>数据来源</small><p>{item.source.name}{item.source.updatedAt ? ` · 更新 ${item.source.updatedAt}` : ""}</p>{item.source.note ? <span>{item.source.note}</span> : null}</div>
        <a href={item.source.url} target="_blank" rel="noreferrer">查看来源 <span>↗</span></a>
      </div>
    </section>
  </main>;
}
