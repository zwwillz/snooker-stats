import {
  HISTORY_RECORD_ITEMS as BASE_HISTORY_RECORD_ITEMS,
  type HistoryRecordCategory,
  type HistoryRecordCategoryKey,
  type HistoryRecordItem,
} from "./history-records";

const SNOOKER_HQ_AGE_RECORDS = "https://snookerhq.com/records/youngest-oldest-ranking-event-winners/";
const SNOOKER_ORG_ARCHIVE = "https://www.snooker.org/TRN/";
const OLBG_PRIZE_MONEY = "https://www.olbg.com/blogs/snooker-earnings";

const replacementItems: Record<string, HistoryRecordItem> = {
  "youngest-ranking-winner": {
    key: "youngest-ranking-winner",
    category: "achievements",
    kind: "leaderboard",
    titleZh: "最年轻排名赛冠军",
    titleEn: "YOUNGEST RANKING EVENT WINNERS",
    descriptionZh: "首次赢得世界排名赛冠军时年龄最小的球员。",
    methodologyZh: "仅统计夺冠时具有官方排名赛身份的赛事；年龄按决赛日计算。第一名纪录由WPBSA历史资料确认，前五顺序与赛事日期由公开历史资料交叉核对。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "17岁358天", meta: "1993英国锦标赛" },
      { rank: 2, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "18岁2天", meta: "2005中国公开赛" },
      { rank: 3, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "18岁285天", meta: "1987大奖赛" },
      { rank: 4, nameZh: "保罗·亨特", nameEn: "Paul Hunter", value: "19岁103天", meta: "1998威尔士公开赛" },
      { rank: 5, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "19岁158天", meta: "1994大奖赛" },
    ],
    source: { name: "WPBSA / SnookerHQ", url: SNOOKER_HQ_AGE_RECORDS, updatedAt: "2026-01", note: "第一名由WPBSA官方历史资料确认；完整年龄榜采用公开历史赛果整理。" },
  },
};

const extraItems: HistoryRecordItem[] = [
  {
    key: "oldest-ranking-winner",
    category: "achievements",
    kind: "leaderboard",
    titleZh: "最年长排名赛冠军",
    titleEn: "OLDEST RANKING EVENT WINNERS",
    descriptionZh: "赢得世界排名赛冠军时年龄最大的球员。",
    methodologyZh: "仅统计夺冠时具有官方排名赛身份的赛事；年龄按决赛日计算。",
    rows: [
      { rank: 1, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "50岁206天", meta: "2025西安大奖赛" },
      { rank: 2, nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "50岁14天", meta: "1982职业球员锦标赛" },
      { rank: 3, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "49岁323天", meta: "2025巡回锦标赛" },
      { rank: 4, nameZh: "阿尔菲·伯顿", nameEn: "Alfie Burden", value: "48岁364天", meta: "2025单局限时赛" },
      { rank: 5, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "48岁47天", meta: "2024世界大奖赛" },
    ],
    source: { name: "SnookerHQ", url: SNOOKER_HQ_AGE_RECORDS, updatedAt: "2026-01", note: "基于公开赛果与球员出生日期整理。" },
  },
  {
    key: "crucible-world-champions",
    category: "achievements",
    kind: "timeline",
    titleZh: "克鲁斯堡历届世界冠军",
    titleEn: "CRUCIBLE WORLD CHAMPIONS",
    descriptionZh: "自1977年世锦赛移师克鲁斯堡以来的历届世界冠军。",
    methodologyZh: "按世锦赛年份倒序展示；1977年起统计克鲁斯堡时代的世界职业斯诺克锦标赛冠军。",
    rows: [
      { nameZh: "吴宜泽", nameEn: "Wu Yize", value: "2026" },
      { nameZh: "赵心童", nameEn: "Zhao Xintong", value: "2025" },
      { nameZh: "凯伦·威尔逊", nameEn: "Kyren Wilson", value: "2024" },
      { nameZh: "卢卡·布雷切尔", nameEn: "Luca Brecel", value: "2023" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2022" },
      { nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "2021" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2020" },
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "2019" },
      { nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "2018" },
      { nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "2017" },
      { nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "2016" },
      { nameZh: "斯图尔特·宾汉姆", nameEn: "Stuart Bingham", value: "2015" },
      { nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "2014" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2013" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2012" },
      { nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "2011" },
      { nameZh: "尼尔·罗伯逊", nameEn: "Neil Robertson", value: "2010" },
      { nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "2009" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2008" },
      { nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "2007" },
      { nameZh: "格雷姆·多特", nameEn: "Graeme Dott", value: "2006" },
      { nameZh: "肖恩·墨菲", nameEn: "Shaun Murphy", value: "2005" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2004" },
      { nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "2003" },
      { nameZh: "彼得·艾伯顿", nameEn: "Peter Ebdon", value: "2002" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2001" },
      { nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "2000" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1999" },
      { nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "1998" },
      { nameZh: "肯·达赫迪", nameEn: "Ken Doherty", value: "1997" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1996" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1995" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1994" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1993" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1992" },
      { nameZh: "约翰·帕洛特", nameEn: "John Parrott", value: "1991" },
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "1990" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1989" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1988" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1987" },
      { nameZh: "乔·约翰逊", nameEn: "Joe Johnson", value: "1986" },
      { nameZh: "丹尼斯·泰勒", nameEn: "Dennis Taylor", value: "1985" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1984" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1983" },
      { nameZh: "亚历克斯·希金斯", nameEn: "Alex Higgins", value: "1982" },
      { nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "1981" },
      { nameZh: "克里夫·桑本", nameEn: "Cliff Thorburn", value: "1980" },
      { nameZh: "特里·格里菲斯", nameEn: "Terry Griffiths", value: "1979" },
      { nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "1978" },
      { nameZh: "约翰·斯宾塞", nameEn: "John Spencer", value: "1977" },
    ],
    source: { name: "WPBSA / Snooker.org", url: SNOOKER_ORG_ARCHIVE, updatedAt: "2026-05", note: "冠军年份依据Snooker.org赛事档案，并与WPBSA历史资料交叉核对。" },
  },
  {
    key: "all-time-career-prize-money",
    category: "prize-money",
    kind: "leaderboard",
    titleZh: "历史奖金榜",
    titleEn: "ALL-TIME CAREER PRIZE MONEY",
    descriptionZh: "职业生涯累计比赛奖金公开汇总 Top 10。",
    methodologyZh: "WST/WPBSA目前未公开统一的全时期累计奖金总表。本榜采用公开历史奖金汇总数据，并固定标注数据年份；只统计比赛奖金，不等同于球员总收入。后续如获得官方统一口径，将直接替换。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "£14,625,634" },
      { rank: 2, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "£10,462,519" },
      { rank: 3, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£9,176,854" },
      { rank: 4, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "£8,804,081" },
      { rank: 5, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "£8,485,679" },
      { rank: 6, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "£8,298,854" },
      { rank: 7, nameZh: "尼尔·罗伯逊", nameEn: "Neil Robertson", value: "£7,265,745" },
      { rank: 8, nameZh: "肖恩·墨菲", nameEn: "Shaun Murphy", value: "£6,404,212" },
      { rank: 9, nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "£5,623,536" },
      { rank: 10, nameZh: "马克·艾伦", nameEn: "Mark Allen", value: "£5,570,540" },
    ],
    source: { name: "OLBG公开历史奖金汇总", url: OLBG_PRIZE_MONEY, updatedAt: "2024", note: "非WST/WPBSA官方统一累计榜；页面内明确保留数据年份与口径说明。" },
  },
];

export const HISTORY_RECORD_CATEGORIES: HistoryRecordCategory[] = [
  {
    key: "achievements",
    titleZh: "历史成就",
    titleEn: "ACHIEVEMENTS",
    descriptionZh: "冠军历史、年龄榜单与重要成就档案。",
    previewZh: "世锦赛冠军 · 最年轻冠军 · 最年长冠军",
  },
  {
    key: "prize-money",
    titleZh: "奖金纪录",
    titleEn: "PRIZE MONEY",
    descriptionZh: "历史奖金榜、赛季奖金与重大赛事奖金纪录。",
    previewZh: "历史奖金榜 · 单赛季奖金 · 百万赛季",
  },
  {
    key: "ranking-legacy",
    titleZh: "排名统治",
    titleEn: "RANKING LEGACY",
    descriptionZh: "世界第一的累计时间、连续统治与赛季末第一。",
    previewZh: "世界第一周数 · 连续第一 · 赛季末第一",
  },
  {
    key: "match-records",
    titleZh: "赛场纪录",
    titleEn: "MATCH RECORDS",
    descriptionZh: "连续得分、连胜、单杆与比赛极限纪录。",
    previewZh: "连续得分 · 连胜 · 153 · 最长单局",
  },
];

export const HISTORY_RECORD_ITEMS: HistoryRecordItem[] = [
  ...BASE_HISTORY_RECORD_ITEMS.map((item) => replacementItems[item.key] ?? item),
  ...extraItems,
];

export function historyRecordCategory(value: string | null | undefined) {
  return HISTORY_RECORD_CATEGORIES.find((category) => category.key === value) ?? null;
}

export function historyRecordItem(value: string | null | undefined) {
  return HISTORY_RECORD_ITEMS.find((item) => item.key === value) ?? null;
}

export function historyRecordItemsForCategory(category: HistoryRecordCategoryKey) {
  return HISTORY_RECORD_ITEMS.filter((item) => item.category === category);
}
