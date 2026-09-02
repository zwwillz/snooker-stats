"use client";

import { useEffect, useRef, useState } from "react";
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

export type HistoryRecordsViewKey = HistoryRecordCategoryKey | "classic";
type AvatarSize = 256 | 512;

function itemTypeLabel(item: HistoryRecordItem) {
  return item.kind === "timeline" ? "历史档案" : "历史榜单";
}

function itemSizeLabel(item: HistoryRecordItem) {
  if (item.kind === "timeline") return `${item.rows.length}届`;
  if (item.rows.length >= 10) return `Top ${item.rows.length}`;
  return `${item.rows.length}条`;
}

function HistorySilhouette() {
  return <svg viewBox="0 0 120 160" aria-hidden="true">
    <circle cx="60" cy="43" r="28" fill="currentColor" />
    <path d="M17 150c3-39 17-63 43-63s40 24 43 63H17Z" fill="currentColor" />
  </svg>;
}

function HistoryAvatar({ nameEn, size, className = "" }: { nameEn?: string | null; size: AvatarSize; className?: string }) {
  const src = historyPlayerAvatar(nameEn, size);
  const [failed, setFailed] = useState(false);
  return <span className={`${v4Styles.historyAvatar} ${className}`} aria-hidden="true">
    {src && !failed
      ? <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <HistorySilhouette />}
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

export function HistoryRecordsSection({ onOpenGroup }: { onOpenGroup: (key: HistoryRecordsViewKey) => void }) {
  return <section className={`${dataStyles.card} ${styles.hubCard}`}>
      <div className={dataStyles.sectionHeader}>
        <div><small>HISTORY &amp; RECORDS</small><h2>历史与纪录</h2></div>
        <span className={styles.sectionCount}>5 个入口</span>
      </div>
      <div className={styles.categoryGrid}>
        {HISTORY_RECORD_CATEGORIES.map((item) => {
          const count = historyLeaderboardItemsForCategory(item.key).length;
          return <button type="button" className={styles.categoryCard} onClick={() => onOpenGroup(item.key)} key={item.key}>
            <div className={styles.categoryText}>
              <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
              <strong>{item.titleZh}</strong>
              <p>{item.previewZh}</p>
            </div>
            <div className={styles.categoryAside}><span>{count}项</span><i>›</i></div>
          </button>;
        })}
        <button type="button" className={`${styles.categoryCard} ${styles.classicEntry}`} onClick={() => onOpenGroup("classic")}>
          <div className={styles.categoryText}>
            <small className={v4Styles.historyUiEnglish}>{CLASSIC_RECORD_ENTRY.titleEn}</small>
            <strong>{CLASSIC_RECORD_ENTRY.titleZh}</strong>
            <p>{CLASSIC_RECORD_ENTRY.previewZh}</p>
          </div>
          <div className={styles.categoryAside}><span>{CLASSIC_RECORDS.length}项</span><i>›</i></div>
        </button>
      </div>
    </section>;
}

export function HistoryRecordsDetailPage({ group, recordKey, onSelectGroup, onSelectRecord, onBack }: {
  group: HistoryRecordsViewKey;
  recordKey: string | null;
  onSelectGroup: (key: HistoryRecordsViewKey) => void;
  onSelectRecord: (item: HistoryRecordItem) => void;
  onBack: () => void;
}) {
  const category = group !== "classic" ? historyRecordCategory(group) : null;
  const selected = recordKey ? historyLeaderboardItem(recordKey) : null;
  const overlayTitle = selected?.titleZh ?? (group === "classic" ? CLASSIC_RECORD_ENTRY.titleZh : category?.titleZh ?? "历史与纪录");

  return <div className={styles.overlay} data-history-records-page="true" data-data-detail="true">
      <div className={styles.overlayScroll}>
        <header className={styles.mobileHeader}>
          <button type="button" onClick={onBack} aria-label="返回"><span aria-hidden="true">‹</span></button>
          <strong>{overlayTitle}</strong>
          <span>STATS</span>
        </header>
        <div className={styles.historyDesktopLayout}>
          <aside className={styles.historySidebar} aria-label="历史与纪录分类">
            <div className={styles.historySidebarHeading}><small>HISTORY &amp; RECORDS</small><strong>历史与纪录</strong></div>
            <div className={styles.historyCategoryNav}>
              {HISTORY_RECORD_CATEGORIES.map((item) => <div className={styles.historyNavGroup} key={item.key}>
                <button type="button" className={group === item.key ? styles.historyNavActive : ""} onClick={() => onSelectGroup(item.key)}>{item.titleZh}</button>
                {group === item.key ? <div className={styles.historyRecordNav}>
                  {historyLeaderboardItemsForCategory(item.key).map((record) => <button type="button" className={recordKey === record.key ? styles.historyRecordActive : ""} onClick={() => onSelectRecord(record)} key={record.key}>{record.titleZh}</button>)}
                </div> : null}
              </div>)}
              <div className={styles.historyNavGroup}><button type="button" className={group === "classic" ? styles.historyNavActive : ""} onClick={() => onSelectGroup("classic")}>{CLASSIC_RECORD_ENTRY.titleZh}</button></div>
            </div>
          </aside>
          <div className={styles.historyDetailMain}>
            {selected ? <LeaderboardDetail item={selected} /> : group === "classic" ? <ClassicRecordsPage /> : category ? <CategoryDetail categoryKey={category.key} onOpenLeaderboard={onSelectRecord} /> : null}
          </div>
        </div>
      </div>
    </div>;
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(false);
  const lead = item.rows[0] ?? null;
  const leadNationality = historyPlayerNationality(lead?.nameEn);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top <= 64), { rootMargin: "-64px 0px 0px", threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.key]);

  return <main className={styles.detailPage}>
    <section className={styles.recordIntro}>
      <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
      <h1>{item.titleZh}</h1>
      <p>{item.descriptionZh}</p>
      {lead ? <div className={`${styles.recordHero} ${v4Styles.recordHeroWithAvatar}`}>
        <div className={v4Styles.heroCopy}>
          <span>{item.kind === "timeline" ? "最新一届" : "历史第一"}</span>
          <strong>{lead.value}</strong>
          <b>{lead.nameZh}</b>
          {lead.nameEn ? <em className={v4Styles.historyUiEnglish}>{lead.nameEn}{leadNationality ? ` · ${leadNationality}` : ""}</em> : leadNationality ? <em>{leadNationality}</em> : null}
          {lead.meta ? <small>{lead.meta}</small> : null}
        </div>
        <HistoryAvatar nameEn={lead.nameEn} size={512} className={v4Styles.heroAvatar} />
      </div> : null}
    </section>

    <section className={`${dataStyles.card} ${styles.listCard}`}>
      <div ref={sentinelRef} className={styles.listHeaderSentinel} aria-hidden="true" />
      <div className={`${styles.listHeaderSticky} ${pinned ? styles.listHeaderPinned : ""}`}>
        <div className={styles.listHeader}>
          <span>{item.kind === "timeline" ? "#" : "排名"}</span>
          <span>球员 / 纪录</span>
          <span>{item.kind === "timeline" ? "年份" : "数据"}</span>
        </div>
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
        const people = splitRecordPeople(row.nameZh, row.nameEn).slice(0, 2);
        const nationalities = people.map((person) => historyPlayerNationality(person.nameEn)).filter((value): value is string => Boolean(value));
        return <article className={`${styles.classicCard} ${v4Styles.classicCardWithAvatar}`} key={item.key}>
          <div className={v4Styles.classicCopy}>
            <small className={v4Styles.historyUiEnglish}>{item.titleEn}</small>
            <h2>{item.titleZh}</h2>
            <strong>{row.value}</strong>
            <b>{row.nameZh}</b>
            {row.nameEn ? <em className={v4Styles.historyUiEnglish}>{row.nameEn}</em> : null}
            {nationalities.length ? <span className={v4Styles.classicNationality}>{nationalities.join(" / ")}</span> : null}
            {row.meta ? <p>{row.meta}</p> : null}
          </div>
          <div className={v4Styles.classicAvatars} aria-hidden="true">
            {people.map((person, index) => <HistoryAvatar nameEn={person.nameEn} size={256} className={v4Styles.classicAvatar} key={`${item.key}-${person.nameEn ?? person.nameZh}-${index}`} />)}
          </div>
        </article>;
      })}
    </section>
    <section className={styles.classicMeta}>
      <div><small>数据说明</small><p>本页为固定静态历史快照，不会在用户访问时请求外部网站或数据库。有现成透明头像时显示真实头像，没有头像时统一显示人物剪影。</p></div>
      <div><small>数据来源</small><p>{sourceNames}</p></div>
    </section>
  </main>;
}
