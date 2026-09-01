export const HISTORY_RECORD_CATEGORY_KEYS = [
  "achievements",
  "prize-money",
  "ranking-legacy",
  "match-records",
] as const;

export type HistoryRecordCategoryKey = (typeof HISTORY_RECORD_CATEGORY_KEYS)[number];
export type HistoryRecordKind = "leaderboard" | "record" | "timeline";

export type HistoryRecordSource = {
  name: string;
  url: string;
  updatedAt?: string;
  note?: string;
};

export type HistoryRecordRow = {
  rank?: number;
  nameZh: string;
  nameEn?: string;
  value: string;
  meta?: string;
  note?: string;
};

export type HistoryRecordItem = {
  key: string;
  category: HistoryRecordCategoryKey;
  kind: HistoryRecordKind;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  methodologyZh: string;
  rows: HistoryRecordRow[];
  source: HistoryRecordSource;
};

export type HistoryRecordCategory = {
  key: HistoryRecordCategoryKey;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  previewZh: string;
};

export const HISTORY_RECORD_CATEGORIES: HistoryRecordCategory[] = [
  {
    key: "achievements",
    titleZh: "历史成就",
    titleEn: "ACHIEVEMENTS",
    descriptionZh: "伟大成绩、冠军里程碑与年龄纪录。",
    previewZh: "单赛季冠军 · 最年轻冠军 · 最年长冠军",
  },
  {
    key: "prize-money",
    titleZh: "奖金纪录",
    titleEn: "PRIZE MONEY",
    descriptionZh: "职业赛季与重大赛事奖金历史纪录。",
    previewZh: "单赛季奖金 · 百万赛季 · 单项最高奖金",
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

const WPBSA_RANKING_RECORDS = "https://www.wpbsa.com/rankings/ranking-records/";
const WPBSA_HISTORY = "https://www.wpbsa.com/about-us/history/";
const WPBSA_FULL_HISTORY = "https://www.wpbsa.com/about-us/history/full-history/";
const WPBSA_RONNIE = "https://www.wpbsa.com/player/ronnie-osullivan/";
const WPBSA_HIGGINS = "https://www.wpbsa.com/player/john-higgins/";
const WST_TRUMP = "https://www.wst.tv/players/e2f3cfe7-6138-4ce6-b1dc-77dcc1d0a65f";
const WST_LONGEST_CRUCIBLE = "https://www.wst.tv/news/2026/may/01/wu-allen/";
const SNOOKER_ORG_RECORDS = "https://www.snooker.org/Plr/records.shtml";

export const HISTORY_RECORD_ITEMS: HistoryRecordItem[] = [
  {
    key: "single-season-ranking-titles",
    category: "achievements",
    kind: "record",
    titleZh: "单赛季排名赛冠军纪录",
    titleEn: "RANKING TITLES IN A SEASON",
    descriptionZh: "单个赛季赢得世界排名赛冠军数量的最高纪录。",
    methodologyZh: "按WST/WPBSA认定的世界排名赛事统计，不包含邀请赛和非排名赛。",
    rows: [
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "6冠", meta: "2019/20赛季", note: "首次有球员在单赛季赢得6项世界排名赛冠军。" },
    ],
    source: { name: "WPBSA / WST", url: WPBSA_FULL_HISTORY, note: "WPBSA历史资料与WST球员档案交叉核对" },
  },
  {
    key: "youngest-ranking-winner",
    category: "achievements",
    kind: "record",
    titleZh: "最年轻排名赛冠军",
    titleEn: "YOUNGEST RANKING WINNER",
    descriptionZh: "赢得世界排名赛冠军时年龄最小的球员。",
    methodologyZh: "按WPBSA/WST官方职业排名赛口径统计。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "17岁", meta: "1993英国锦标赛", note: "决赛10比6击败斯蒂芬·亨德利。" },
    ],
    source: { name: "WPBSA", url: WPBSA_FULL_HISTORY },
  },
  {
    key: "youngest-world-champion",
    category: "achievements",
    kind: "record",
    titleZh: "最年轻世界冠军",
    titleEn: "YOUNGEST WORLD CHAMPION",
    descriptionZh: "赢得世界职业斯诺克锦标赛冠军时年龄最小的球员。",
    methodologyZh: "世界职业锦标赛冠军口径；年龄按官方历史资料记载。",
    rows: [
      { nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "21岁", meta: "1990世锦赛", note: "决赛18比12击败吉米·怀特。" },
    ],
    source: { name: "WPBSA", url: WPBSA_HISTORY },
  },
  {
    key: "oldest-world-champion",
    category: "achievements",
    kind: "record",
    titleZh: "最年长世界冠军",
    titleEn: "OLDEST WORLD CHAMPION",
    descriptionZh: "赢得世界职业斯诺克锦标赛冠军时年龄最大的球员。",
    methodologyZh: "世界职业锦标赛冠军口径。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "46岁", meta: "2022世锦赛", note: "决赛18比13击败贾德·特鲁姆普。" },
    ],
    source: { name: "WPBSA", url: "https://www.wpbsa.com/osullivan-beats-trump-for-magnificent-seventh/", updatedAt: "2022-05-02" },
  },
  {
    key: "single-season-prize-money",
    category: "prize-money",
    kind: "record",
    titleZh: "单赛季最高奖金",
    titleEn: "SEASON PRIZE MONEY RECORD",
    descriptionZh: "职业球员在一个WST赛季内获得的最高奖金纪录。",
    methodologyZh: "采用WST球员官方生涯档案公布的赛季奖金纪录。",
    rows: [
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1,680,600", meta: "2024/25赛季", note: "WST记载为单赛季奖金历史纪录。" },
    ],
    source: { name: "World Snooker Tour", url: WST_TRUMP, updatedAt: "2025-05" },
  },
  {
    key: "first-million-season",
    category: "prize-money",
    kind: "record",
    titleZh: "首个百万英镑赛季",
    titleEn: "FIRST £1M SEASON",
    descriptionZh: "首位在单个赛季奖金超过100万英镑的职业球员。",
    methodologyZh: "按WST官方球员档案中的赛季奖金里程碑统计。",
    rows: [
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1m+", meta: "2018/19赛季", note: "2019年成为首位单赛季奖金超过100万英镑的球员。" },
    ],
    source: { name: "World Snooker Tour", url: WST_TRUMP },
  },
  {
    key: "two-million-pound-players-season",
    category: "prize-money",
    kind: "record",
    titleZh: "单赛季两人突破百万",
    titleEn: "TWO £1M PLAYERS IN A SEASON",
    descriptionZh: "首次同一赛季有两名球员奖金都突破100万英镑。",
    methodologyZh: "按WPBSA在2024球员锦标赛后公布的赛季累计奖金节点统计。",
    rows: [
      { rank: 1, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "£1,155,500", meta: "2023/24赛季当时累计" },
      { rank: 2, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£1,061,000", meta: "2023/24赛季当时累计" },
    ],
    source: { name: "WPBSA", url: "https://www.wpbsa.com/trump-wins-fifth-title-of-marvellous-season/", updatedAt: "2024-02" },
  },
  {
    key: "single-event-top-prize",
    category: "prize-money",
    kind: "record",
    titleZh: "单项冠军奖金里程碑",
    titleEn: "SINGLE EVENT TOP PRIZE",
    descriptionZh: "职业斯诺克重大赛事冠军单项奖金达到50万英镑的里程碑。",
    methodologyZh: "展示官方资料明确记载的50万英镑冠军奖金节点；不含表演赛出场费和额外奖金。",
    rows: [
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£500,000", meta: "2019世锦赛", note: "WST球员档案称其为当时斯诺克史上最高冠军奖金。" },
      { nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "£500,000", meta: "2024沙特阿拉伯斯诺克大师赛", note: "再次获得50万英镑冠军奖金。" },
    ],
    source: { name: "World Snooker Tour", url: WST_TRUMP },
  },
  {
    key: "world-number-one-total-weeks",
    category: "ranking-legacy",
    kind: "leaderboard",
    titleZh: "世界第一累计周数",
    titleEn: "TOTAL WEEKS AT WORLD NO.1",
    descriptionZh: "职业世界排名体系中累计位居世界第一的时间。",
    methodologyZh: "完全采用WPBSA官方Ranking Records快照；WPBSA对不足完整一周的排名周期向上取整。",
    rows: [
      { rank: 1, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "471周" },
      { rank: 2, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "389周" },
      { rank: 3, nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "365周" },
      { rank: 4, nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "362周" },
      { rank: 5, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "350周" },
      { rank: 6, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "221周*", note: "WPBSA 2026-08-03快照中的进行中标记。" },
      { rank: 7, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "197周" },
      { rank: 8, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "176周" },
      { rank: 9, nameZh: "尼尔·罗伯逊", nameEn: "Neil Robertson", value: "69周" },
      { rank: 10, nameZh: "克里夫·桑本", nameEn: "Cliff Thorburn", value: "56周" },
      { rank: 11, nameZh: "马克·艾伦", nameEn: "Mark Allen", value: "16周" },
      { rank: 12, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "3周" },
    ],
    source: { name: "WPBSA Ranking Records", url: WPBSA_RANKING_RECORDS, updatedAt: "2026-08-03" },
  },
  {
    key: "world-number-one-longest-spell",
    category: "ranking-legacy",
    kind: "leaderboard",
    titleZh: "最长连续世界第一",
    titleEn: "LONGEST NO.1 SPELL",
    descriptionZh: "单次连续占据世界第一位置时间最长的排名周期。",
    methodologyZh: "从WPBSA官方每段世界第一起止日期与周数中取各球员最长连续周期。",
    rows: [
      { rank: 1, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "418周", meta: "1990-04-30 至 1998-05-04" },
      { rank: 2, nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "365周", meta: "1983-05-03 至 1990-04-29" },
      { rank: 3, nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "312周", meta: "1975-05-03 至 1981-04-20" },
      { rank: 4, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "215周", meta: "2015-02-09 至 2019-03-24" },
      { rank: 5, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "109周", meta: "2022-04-04 至 2024-05-06" },
      { rank: 6, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "106周", meta: "2019-08-12 至 2021-08-22" },
      { rank: 7, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "105周", meta: "2000-05-02 至 2002-05-06" },
      { rank: 8, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "104周", meta: "1998-05-05 至 2000-05-01" },
    ],
    source: { name: "WPBSA Ranking Records", url: WPBSA_RANKING_RECORDS, updatedAt: "2026-08-03" },
  },
  {
    key: "season-end-number-one-count",
    category: "ranking-legacy",
    kind: "leaderboard",
    titleZh: "赛季末世界第一次数",
    titleEn: "SEASON-END NO.1 TITLES",
    descriptionZh: "赛季结束时位列官方世界第一的累计次数。",
    methodologyZh: "根据WPBSA官方1976/77至2025/26赛季末世界第一名单汇总。",
    rows: [
      { rank: 1, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "9次" },
      { rank: 2, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "8次" },
      { rank: 3, nameZh: "史蒂夫·戴维斯", nameEn: "Steve Davis", value: "7次" },
      { rank: 3, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "7次" },
      { rank: 5, nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "5次" },
      { rank: 6, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "4次" },
      { rank: 6, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "4次" },
      { rank: 6, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "4次" },
      { rank: 9, nameZh: "克里夫·桑本", nameEn: "Cliff Thorburn", value: "1次" },
      { rank: 9, nameZh: "马克·艾伦", nameEn: "Mark Allen", value: "1次" },
    ],
    source: { name: "WPBSA Ranking Records", url: WPBSA_RANKING_RECORDS, updatedAt: "2026-04-13" },
  },
  {
    key: "world-number-one-spells",
    category: "ranking-legacy",
    kind: "leaderboard",
    titleZh: "世界第一登顶次数",
    titleEn: "WORLD NO.1 SPELLS",
    descriptionZh: "职业生涯中进入一个新的世界第一连续排名周期的次数。",
    methodologyZh: "按WPBSA官方Number One Players每一段连续世界第一周期汇总；同一球员重新夺回第一计为新的一次。",
    rows: [
      { rank: 1, nameZh: "马克·塞尔比", nameEn: "Mark Selby", value: "8次" },
      { rank: 2, nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "5次" },
      { rank: 2, nameZh: "贾德·特鲁姆普", nameEn: "Judd Trump", value: "5次" },
      { rank: 4, nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "4次" },
      { rank: 4, nameZh: "尼尔·罗伯逊", nameEn: "Neil Robertson", value: "4次" },
      { rank: 6, nameZh: "马克·威廉姆斯", nameEn: "Mark Williams", value: "3次" },
      { rank: 7, nameZh: "雷·里尔顿", nameEn: "Ray Reardon", value: "2次" },
      { rank: 7, nameZh: "斯蒂芬·亨德利", nameEn: "Stephen Hendry", value: "2次" },
      { rank: 7, nameZh: "丁俊晖", nameEn: "Ding Junhui", value: "2次" },
    ],
    source: { name: "WPBSA Ranking Records", url: WPBSA_RANKING_RECORDS, updatedAt: "2026-08-03" },
  },
  {
    key: "unanswered-points",
    category: "match-records",
    kind: "record",
    titleZh: "连续不失分得分纪录",
    titleEn: "UNANSWERED POINTS",
    descriptionZh: "对手没有取得任何分数期间，球员连续累计得分的最高官方纪录之一。",
    methodologyZh: "采用WPBSA球员官方档案所列纪录。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "556分", meta: "2014大师赛 vs 里奇·沃顿", note: "WPBSA球员档案明确记载为record 556 points without reply。" },
    ],
    source: { name: "WPBSA", url: WPBSA_RONNIE },
  },
  {
    key: "ranking-unanswered-points",
    category: "match-records",
    kind: "record",
    titleZh: "排名赛连续不失分得分",
    titleEn: "RANKING EVENT UNANSWERED POINTS",
    descriptionZh: "世界排名赛事中对手未得分期间的连续得分纪录。",
    methodologyZh: "Snooker.org世界纪录页的历史整理项目；该网站明确标注其世界纪录集合为非官方整理。",
    rows: [
      { nameZh: "斯图尔特·宾汉姆", nameEn: "Stuart Bingham", value: "547分", meta: "2016中国公开赛 vs 山姆·贝尔德" },
    ],
    source: { name: "Snooker.org World Records", url: SNOOKER_ORG_RECORDS, note: "非官方纪录整理，用于补充官方未提供的完整纪录榜" },
  },
  {
    key: "consecutive-centuries-match",
    category: "match-records",
    kind: "record",
    titleZh: "单场连续破百纪录",
    titleEn: "CONSECUTIVE CENTURIES IN A MATCH",
    descriptionZh: "同一场职业比赛中连续局完成破百的经典纪录。",
    methodologyZh: "采用WPBSA官方球员档案对2005大奖赛决赛的记载。",
    rows: [
      { nameZh: "约翰·希金斯", nameEn: "John Higgins", value: "连续4局", meta: "2005大奖赛决赛 vs 罗尼·奥沙利文", note: "该段同时构成494分连续不失分。" },
    ],
    source: { name: "WPBSA", url: WPBSA_HIGGINS },
  },
  {
    key: "qualifying-win-streak",
    category: "match-records",
    kind: "record",
    titleZh: "资格赛最长连胜纪录",
    titleEn: "QUALIFYING WIN STREAK",
    descriptionZh: "职业巡回赛资格赛阶段的连续比赛获胜纪录。",
    methodologyZh: "采用WPBSA球员官方档案对奥沙利文新秀赛季的记载。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "38连胜", meta: "职业新秀赛季", note: "WPBSA记载其前76场资格赛赢下74场，并一度取得38连胜。" },
    ],
    source: { name: "WPBSA", url: WPBSA_RONNIE },
  },
  {
    key: "highest-official-break",
    category: "match-records",
    kind: "record",
    titleZh: "职业比赛最高单杆",
    titleEn: "HIGHEST PROFESSIONAL BREAK",
    descriptionZh: "职业比赛中完成的最高正式单杆得分纪录。",
    methodologyZh: "采用WPBSA官方球员档案记录的WST最高单杆。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "153分", meta: "2026世界公开赛", note: "2026年3月创造新的职业比赛最高单杆纪录。" },
    ],
    source: { name: "WPBSA / WST", url: WPBSA_RONNIE, updatedAt: "2026-03" },
  },
  {
    key: "two-147s-one-session",
    category: "match-records",
    kind: "record",
    titleZh: "单阶段两杆147",
    titleEn: "TWO 147s IN ONE SESSION",
    descriptionZh: "同一比赛阶段内完成两杆147的历史纪录。",
    methodologyZh: "采用WPBSA官方球员档案。",
    rows: [
      { nameZh: "罗尼·奥沙利文", nameEn: "Ronnie O'Sullivan", value: "2杆147", meta: "2025沙特阿拉伯大师赛 vs 克里斯·韦克林", note: "WPBSA记载其成为首位在同一阶段打出两杆147的球员。" },
    ],
    source: { name: "WPBSA", url: WPBSA_RONNIE },
  },
  {
    key: "longest-crucible-frame",
    category: "match-records",
    kind: "record",
    titleZh: "克鲁斯堡最长单局",
    titleEn: "LONGEST CRUCIBLE FRAME",
    descriptionZh: "世界锦标赛克鲁斯堡阶段耗时最长的单局纪录。",
    methodologyZh: "采用WST官方2026世界锦标赛比赛报道。",
    rows: [
      { nameZh: "马克·艾伦 / 吴宜泽", nameEn: "Mark Allen / Wu Yize", value: "100分19秒", meta: "2026世锦赛半决赛", note: "刷新2022年85分22秒的旧克鲁斯堡纪录。" },
    ],
    source: { name: "World Snooker Tour", url: WST_LONGEST_CRUCIBLE, updatedAt: "2026-05-01" },
  },
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
