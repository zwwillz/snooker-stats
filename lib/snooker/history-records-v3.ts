import {
  HISTORY_RECORD_ITEMS as V2_HISTORY_RECORD_ITEMS,
  type HistoryRecordCategoryKey,
  type HistoryRecordItem,
} from "./history-records-v2";
import type { HistoryRecordCategory } from "./history-records";

export type { HistoryRecordCategoryKey, HistoryRecordItem } from "./history-records-v2";

const WPBSA_TRUMP_SIX = "https://www.wpbsa.com/six-of-the-best-trump-sets-new-record/";
const WPBSA_TRUMP_FIVE = "https://www.wpbsa.com/trump-wins-fifth-title-of-marvellous-season/";
const SNOOKER_HQ_AGE_RECORDS = "https://snookerhq.com/records/youngest-oldest-ranking-event-winners/";
const GUINNESS_UNANSWERED = "https://www.guinnessworldrecords.com/world-records/113953-most-points-scored-in-a-snooker-match-without-reply";
const GUINNESS_RANKING_UNANSWERED = "https://www.guinnessworldrecords.de/world-records/443670-most-points-scored-in-a-ranking-event-snooker-match-without-reply";
const GUINNESS_CONSECUTIVE_CENTURIES = "https://www.guinnessworldrecords.com/world-records/82925-most-consecutive-century-breaks-in-snooker";

const replacements: Record<string, HistoryRecordItem> = {
  "single-season-ranking-titles": {
    key: "single-season-ranking-titles",
    category: "achievements",
    kind: "leaderboard",
    titleZh: "单赛季排名赛冠军榜",
    titleEn: "RANKING TITLES IN A SEASON",
    descriptionZh: "单个赛季赢得世界排名赛冠军最多的球员赛季。",
    methodologyZh: "按WST/WPBSA认定的世界排名赛事统计，不包含邀请赛和非排名赛。列出目前公开资料可确认的单赛季5冠及以上球员赛季。",
    rows: [
      { rank: 1, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "6冠", meta: "2019/20赛季" },
      { rank: 2, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "5冠", meta: "1990/91赛季" },
      { rank: 2, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "5冠", meta: "2013/14赛季" },
      { rank: 2, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "5冠", meta: "2016/17赛季" },
      { rank: 2, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "5冠", meta: "2017/18赛季" },
      { rank: 2, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "5冠", meta: "2020/21赛季" },
      { rank: 2, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "5冠", meta: "2023/24赛季" },
    ],
    source: { name: "WPBSA", url: WPBSA_TRUMP_SIX, updatedAt: "2024-03", note: `六冠纪录及五冠球员由WPBSA历史报道整理，并以${WPBSA_TRUMP_FIVE}交叉核对。` },
  },
  "youngest-ranking-winner": {
    key: "youngest-ranking-winner",
    category: "achievements",
    kind: "leaderboard",
    titleZh: "最年轻排名赛冠军",
    titleEn: "YOUNGEST RANKING EVENT WINNERS",
    descriptionZh: "首次赢得世界排名赛冠军时年龄最小的球员。",
    methodologyZh: "仅统计夺冠时具有官方排名赛身份的赛事；年龄按决赛日计算。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "17岁358天", meta: "1993英国锦标赛" },
      { rank: 2, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "18岁2天", meta: "2005中国公开赛" },
      { rank: 3, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "18岁285天", meta: "1987大奖赛" },
      { rank: 4, nameZh: "保罗·亨特", nameEn: "Paul Hunter", value: "19岁103天", meta: "1998威尔士公开赛" },
      { rank: 5, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "19岁158天", meta: "1994大奖赛" },
      { rank: 6, nameZh: "颜丙涛", nameEn: "Yan Bingtao", value: "19岁162天", meta: "2019里加大师赛" },
      { rank: 7, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "20岁319天", meta: "1996威尔士公开赛" },
      { rank: 8, nameZh: "范争一", nameEn: "Fan Zhengyi", value: "21岁31天", meta: "2022欧洲大师赛" },
      { rank: 9, nameZh: "雷佩凡", nameEn: "Lei Peifan", value: "21岁198天", meta: "2024苏格兰公开赛" },
      { rank: 10, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "21岁226天", meta: "2011中国公开赛" },
    ],
    source: { name: "SnookerHQ / WPBSA", url: SNOOKER_HQ_AGE_RECORDS, updatedAt: "2026", note: "年龄榜采用公开历史赛果整理，纪录首位与官方资料交叉核对。" },
  },
  "oldest-ranking-winner": {
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
      { rank: 6, nameZh: "乔·佩里", nameEn: "Joe Perry", value: "47岁205天", meta: "2022威尔士公开赛" },
      { rank: 7, nameZh: "罗伯特·米尔金斯", nameEn: "Robert Milkins", value: "46岁350天", meta: "2023威尔士公开赛" },
      { rank: 8, nameZh: "巴里·霍金斯", nameEn: "Barry Hawkins", value: "46岁312天", meta: "2026威尔士公开赛" },
      { rank: 9, nameZh: "道格·蒙乔伊", nameEn: "Doug Mountjoy", value: "46岁221天", meta: "1989经典赛" },
      { rank: 10, nameZh: "安东尼·汉密尔顿", nameEn: "Anthony Hamilton", value: "45岁221天", meta: "2017德国大师赛" },
    ],
    source: { name: "SnookerHQ", url: SNOOKER_HQ_AGE_RECORDS, updatedAt: "2026" },
  },
  "unanswered-points": {
    key: "unanswered-points",
    category: "match-records",
    kind: "leaderboard",
    titleZh: "连续不失分得分榜",
    titleEn: "UNANSWERED POINTS",
    descriptionZh: "对手没有取得任何分数期间，球员连续累计得分的历史高位纪录。",
    methodologyZh: "按公开可核对的职业赛事连续不失分得分纪录排序；排名赛与非排名职业赛事共同列示，并在赛事信息中保留赛事类型差异。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "556分", meta: "2014大师赛 vs 里奇·沃顿" },
      { rank: 2, nameZh: "斯图尔特·宾汉姆", nameEn: "Stuart Bingham", value: "547分", meta: "2016中国公开赛 vs 山姆·贝尔德" },
      { rank: 3, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "495分", meta: "2007超级联赛 vs 斯蒂芬·亨德利" },
      { rank: 4, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "494分", meta: "2005大奖赛 vs 罗尼·奥沙利文" },
    ],
    source: { name: "Guinness World Records / WPBSA", url: GUINNESS_UNANSWERED, note: `排名赛547分纪录另由${GUINNESS_RANKING_UNANSWERED}核对。` },
  },
  "consecutive-centuries-match": {
    key: "consecutive-centuries-match",
    category: "match-records",
    kind: "leaderboard",
    titleZh: "单场连续破百榜",
    titleEn: "CONSECUTIVE CENTURIES IN A MATCH",
    descriptionZh: "同一场职业比赛中个人连续局完成破百的纪录保持者。",
    methodologyZh: "按Guinness World Records公开纪录整理；纪录值相同者并列。",
    rows: [
      { rank: 1, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "连续4局", meta: "2005大奖赛" },
      { rank: 1, nameZh: "肖恩·墨菲", nameEn: "Shaun Murphy", value: "连续4局", meta: "2007威尔士公开赛" },
      { rank: 1, nameZh: "尼尔·罗伯逊", nameEn: "Neil Robertson", value: "连续4局", meta: "2013鲁尔公开赛；2022再次完成" },
      { rank: 1, nameZh: "加里·威尔逊", nameEn: "Gary Wilson", value: "连续4局", meta: "2019" },
      { rank: 1, nameZh: "斯蒂芬·马奎尔", nameEn: "Stephen Maguire", value: "连续4局", meta: "2020" },
      { rank: 1, nameZh: "马克·艾伦", nameEn: "Mark Allen", value: "连续4局", meta: "2020" },
      { rank: 1, nameZh: "鲁宁", nameEn: "Lu Ning", value: "连续4局", meta: "2020" },
    ],
    source: { name: "Guinness World Records", url: GUINNESS_CONSECUTIVE_CENTURIES, updatedAt: "2022" },
  },
};

export const HISTORY_RECORD_CATEGORIES: HistoryRecordCategory[] = [
  {
    key: "achievements",
    titleZh: "历史成就",
    titleEn: "ACHIEVEMENTS",
    descriptionZh: "冠军历史、年龄榜单与重大赛事档案。",
    previewZh: "单赛季冠军 · 年龄 · 世锦赛",
  },
  {
    key: "prize-money",
    titleZh: "奖金榜单",
    titleEn: "PRIZE MONEY",
    descriptionZh: "生涯与赛季奖金的历史数据。",
    previewZh: "生涯奖金 · 赛季奖金",
  },
  {
    key: "ranking-legacy",
    titleZh: "排名统治",
    titleEn: "RANKING LEGACY",
    descriptionZh: "世界第一的累计时间与统治力。",
    previewZh: "第一周数 · 连续第一 · 年终第一",
  },
  {
    key: "match-records",
    titleZh: "赛场榜单",
    titleEn: "MATCH LEADERS",
    descriptionZh: "把可比较的赛场极限整理成榜单。",
    previewZh: "连续得分 · 连续破百",
  },
];

const allItems = V2_HISTORY_RECORD_ITEMS.map((item) => replacements[item.key] ?? item);

export const HISTORY_LEADERBOARD_ITEMS = allItems.filter((item) => item.kind !== "record");

export const CLASSIC_RECORD_KEYS = [
  "highest-official-break",
  "two-147s-one-session",
  "youngest-world-champion",
  "oldest-world-champion",
  "first-million-season",
  "qualifying-win-streak",
  "longest-crucible-frame",
  "single-season-prize-money",
] as const;

export const CLASSIC_RECORDS = CLASSIC_RECORD_KEYS
  .map((key) => allItems.find((item) => item.key === key))
  .filter((item): item is HistoryRecordItem => Boolean(item));

export const CLASSIC_RECORD_ENTRY = {
  key: "classic" as const,
  titleZh: "经典纪录",
  titleEn: "CLASSIC RECORDS",
  descriptionZh: "一次性纪录与标志性里程碑，进入后直接浏览。",
  previewZh: "153 · 双147 · 年龄 · 最长单局",
};

export function historyRecordCategory(value: string | null | undefined) {
  return HISTORY_RECORD_CATEGORIES.find((category) => category.key === value) ?? null;
}

export function historyLeaderboardItem(value: string | null | undefined) {
  return HISTORY_LEADERBOARD_ITEMS.find((item) => item.key === value) ?? null;
}

export function historyLeaderboardItemsForCategory(category: HistoryRecordCategoryKey) {
  return HISTORY_LEADERBOARD_ITEMS.filter((item) => item.category === category);
}
