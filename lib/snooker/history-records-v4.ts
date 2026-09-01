import {
  CLASSIC_RECORD_ENTRY as V3_CLASSIC_RECORD_ENTRY,
  CLASSIC_RECORDS as V3_CLASSIC_RECORDS,
  HISTORY_LEADERBOARD_ITEMS as V3_HISTORY_LEADERBOARD_ITEMS,
  HISTORY_RECORD_CATEGORIES,
  type HistoryRecordCategoryKey,
  type HistoryRecordItem,
} from "./history-records-v3";

export type { HistoryRecordCategoryKey, HistoryRecordItem } from "./history-records-v3";
export { HISTORY_RECORD_CATEGORIES };

const WST_TRUMP_PROFILE = "https://www.wst.tv/players/e2f3cfe7-6138-4ce6-b1dc-77dcc1d0a65f";
const WST_TRUMP_SEASON_RECORD = "https://www.wst.tv/news/2025/january/17/Wonderful-Trump-Smashes-Prize-Money-Record/";
const WPBSA_TWO_MILLION_PLAYERS = "https://www.wpbsa.com/trump-wins-fifth-title-of-marvellous-season/";

type HistoryStaticPlayerProfile = {
  nationalityZh: string;
  avatar256?: string;
};

const HISTORY_PLAYER_PROFILES: Record<string, HistoryStaticPlayerProfile> = {
  "Alex Higgins": { nationalityZh: "北爱尔兰" },
  "Alfie Burden": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/b6350368-74fc-4adf-92c8-ff9126e90541.webp" },
  "Anthony Hamilton": { nationalityZh: "英格兰" },
  "Barry Hawkins": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/ec561f17-e982-43b3-8807-82fc76adbe75.webp" },
  "Cliff Thorburn": { nationalityZh: "加拿大" },
  "Dennis Taylor": { nationalityZh: "北爱尔兰" },
  "Ding Junhui": { nationalityZh: "中国", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/3ff06750-8c3c-456c-8fac-58209b6f679e.webp" },
  "Fan Zhengyi": { nationalityZh: "中国", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/8cbf82f6-c417-421c-ae39-17c8103284cd.webp" },
  "Gary Wilson": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/e5f4377c-5119-4c0a-9a88-e42eb8e48677.webp" },
  "Graeme Dott": { nationalityZh: "苏格兰" },
  "Jackson Page": { nationalityZh: "威尔士", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/19ce247e-1824-4f94-8fe3-c94ce4056802.webp" },
  "Joe Johnson": { nationalityZh: "英格兰" },
  "Joe Perry": { nationalityZh: "英格兰" },
  "John Higgins": { nationalityZh: "苏格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/a5eecca1-8302-4739-84fc-6721627baa43.webp" },
  "John Parrott": { nationalityZh: "英格兰" },
  "John Spencer": { nationalityZh: "英格兰" },
  "Judd Trump": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/e2f3cfe7-6138-4ce6-b1dc-77dcc1d0a65f.webp" },
  "Ken Doherty": { nationalityZh: "爱尔兰" },
  "Kyren Wilson": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/a8c0d3a6-706b-4bf0-8dce-9cde97fe88c4.webp" },
  "Lei Peifan": { nationalityZh: "中国", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/9e0b1245-cc2c-4dab-ad27-46db80701684.webp" },
  "Lu Ning": { nationalityZh: "中国" },
  "Luca Brecel": { nationalityZh: "比利时", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/cd124662-9d97-413c-9609-5051d002ab3b.webp" },
  "Mark Allen": { nationalityZh: "北爱尔兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/c37aba27-5b12-4fae-8a8b-9e749c7a25f3.webp" },
  "Mark Selby": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/ba7831b4-ab75-4435-946a-c6f02e4e2d4b.webp" },
  "Mark Williams": { nationalityZh: "威尔士", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/6aaddcbb-345c-474a-9069-e7757e155729.webp" },
  "Neil Robertson": { nationalityZh: "澳大利亚", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/8b83133a-4c15-4275-811e-bdf2cb02702f.webp" },
  "Paul Hunter": { nationalityZh: "英格兰" },
  "Peter Ebdon": { nationalityZh: "英格兰" },
  "Ray Reardon": { nationalityZh: "威尔士" },
  "Robert Milkins": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/95eec847-2905-491f-abbe-92ff39038bda.webp" },
  "Ronnie O'Sullivan": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/226c7294-655e-4925-bcde-17330ddfc438.webp" },
  "Shaun Murphy": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/03fe92d3-ad85-434c-bc17-5fe02a496187.webp" },
  "Stephen Hendry": { nationalityZh: "苏格兰" },
  "Stephen Maguire": { nationalityZh: "苏格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/c07238de-bca9-4067-9749-00841bd06d28.webp" },
  "Steve Davis": { nationalityZh: "英格兰" },
  "Stuart Bingham": { nationalityZh: "英格兰", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/ac932300-dacb-4e91-803b-99a03fa20853.webp" },
  "Terry Griffiths": { nationalityZh: "威尔士" },
  "Wu Yize": { nationalityZh: "中国", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/d935d534-e696-4292-b773-e9b8efee1ea7.webp" },
  "Yan Bingtao": { nationalityZh: "中国" },
  "Zhao Xintong": { nationalityZh: "中国", avatar256: "https://rtlvncsmbueatdzqvhbn.supabase.co/storage/v1/object/public/player-avatars/wst/256/895d376f-9f42-4e67-8a63-bc78676d0726.webp" },
};

function normalizedName(value: string) {
  return value.normalize("NFKC").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

const normalizedProfiles = new Map(
  Object.entries(HISTORY_PLAYER_PROFILES).map(([name, profile]) => [normalizedName(name), profile]),
);

export function historyPlayerProfile(nameEn: string | null | undefined) {
  if (!nameEn) return null;
  return normalizedProfiles.get(normalizedName(nameEn)) ?? null;
}

export function historyPlayerNationality(nameEn: string | null | undefined) {
  return historyPlayerProfile(nameEn)?.nationalityZh ?? null;
}

export function historyPlayerAvatar(nameEn: string | null | undefined, size: 256 | 512 = 256) {
  const avatar = historyPlayerProfile(nameEn)?.avatar256 ?? null;
  if (!avatar || size === 256) return avatar;
  return avatar.includes("/wst/256/") ? avatar.replace("/wst/256/", "/wst/512/") : avatar;
}

const prizeReplacements: Record<string, HistoryRecordItem> = {
  "all-time-career-prize-money": {
    ...(V3_HISTORY_LEADERBOARD_ITEMS.find((item) => item.key === "all-time-career-prize-money") as HistoryRecordItem),
    titleZh: "历史奖金榜（2024公开汇总）",
    descriptionZh: "职业生涯累计比赛奖金的公开历史汇总 Top 10；固定为2024数据快照，不作为实时官方榜。",
    methodologyZh: "WST/WPBSA目前没有持续维护的统一全时期生涯累计奖金总表。本榜保留2024公开汇总作为历史快照，只统计比赛奖金口径；不以2026第三方估算值替换，避免将不同口径混为一榜。",
  },
};

const prizeExtras: HistoryRecordItem[] = [
  {
    key: "season-prize-money-record-progression",
    category: "prize-money",
    kind: "timeline",
    titleZh: "单赛季奖金纪录进程",
    titleEn: "SEASON PRIZE MONEY RECORD PROGRESSION",
    descriptionZh: "WST官方资料明确记载的单赛季奖金纪录里程碑。",
    methodologyZh: "这是一份官方纪录进程档案，不是对所有历史赛季进行不完整的Top N推算。采用WST/WPBSA明确公布的纪录节点，按最新纪录优先展示。",
    rows: [
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1,680,600", meta: "2024/25赛季", note: "WST球员档案记载为新的单赛季奖金历史纪录。" },
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "£1,265,500", meta: "2023/24赛季", note: "WST在2025年1月报道中明确记载为此前纪录。" },
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1m+", meta: "2018/19赛季", note: "首位单赛季比赛奖金突破100万英镑的球员。" },
    ],
    source: { name: "World Snooker Tour / WPBSA", url: WST_TRUMP_PROFILE, updatedAt: "2026", note: `纪录节点与${WST_TRUMP_SEASON_RECORD}交叉核对。` },
  },
  {
    key: "two-million-pound-season-players",
    category: "prize-money",
    kind: "leaderboard",
    titleZh: "百万英镑赛季双雄",
    titleEn: "TWO £1M PLAYERS IN ONE SEASON",
    descriptionZh: "首次同一赛季出现两名球员比赛奖金都突破100万英镑的官方节点。",
    methodologyZh: "采用WPBSA在2024年球员锦标赛后公布的2023/24赛季当时累计奖金。这是带日期的赛季节点快照，不代表该赛季最终奖金总额。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "£1,155,500", meta: "2023/24赛季 · 2024年2月节点" },
      { rank: 2, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1,061,000", meta: "2023/24赛季 · 2024年2月节点" },
    ],
    source: { name: "WPBSA", url: WPBSA_TWO_MILLION_PLAYERS, updatedAt: "2024-02", note: "WPBSA明确称这是首次同一赛季两名球员奖金均突破100万英镑。" },
  },
];

export const HISTORY_LEADERBOARD_ITEMS = [
  ...V3_HISTORY_LEADERBOARD_ITEMS.map((item) => prizeReplacements[item.key] ?? item),
  ...prizeExtras,
];

export const CLASSIC_RECORDS = V3_CLASSIC_RECORDS.filter((item) => item.key !== "single-season-prize-money");

export const CLASSIC_RECORD_ENTRY = {
  ...V3_CLASSIC_RECORD_ENTRY,
  descriptionZh: "真正的一次性纪录与里程碑，进入后直接浏览全部内容，不再二次跳转。",
  previewZh: "最高单杆 · 双147 · 冠军年龄 · 连胜 · 最长单局",
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
