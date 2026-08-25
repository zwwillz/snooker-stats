# 147数据局中文翻译治理｜生产库审计记录（2026-08-26）

> Production project: `rtlvncsmbueatdzqvhbn` (`snooker-stats`)
>
> 原则：英文源数据永久保留；高置信度中文直接补齐；有争议的人名、历史城市不猜测。

## 1. 结构化赛事数据

以下中文字段的“空值 / 与英文相同 / 纯英文残留”已清到 0：

- `snooker_events.name_zh`
- `snooker_events.country_zh`
- `snooker_events.venue_zh`（存在 `venue_en` 的记录）
- `snooker_events.stage_name_zh`
- `snooker_event_series.name_zh`
- `snooker_rounds.label_zh`
- `snooker_player_event_aggregates.last_recorded_round_zh`

已修正上海大师赛、里加大师赛、德国大师赛、2018罗马尼亚大师赛等历史错误译名，并统一 Round / Last N / Quarter Final / Semi Final / Final / Round Robin / League Phase / Held Over 等标准轮次中文。

## 2. 球员职业生涯中文恢复

### 故障根因

2026-08-23 的 `player_profiles` WST 同步任务处理了 127 名球员。生产函数 `snooker_internal.sync_wst_player_profiles_batch(integer,integer)` 原实现会先删除球员 Career Highlights，再从 WST 插入只有 `description_en` 的记录，因此历史中文被同步覆盖。

### 恢复结果

当前可访问的 GitHub、生产库历史表、翻译缓存和 `snooker_manual_overrides` 中均未发现可直接恢复的旧 917 条中文副本，因此基于保留的 WST 英文原文重新翻译并回写：

- `snooker_player_career_highlights` 总数：917
- `description_zh` 空值：0
- `description_zh = description_en`：0
- 中文字段不含汉字：0
- `translation_updated_at` 已设置：917

英文 `description_en` 全部保留，未覆盖。

### 防再次覆盖

生产库新增两层保护，并同步进入本 PR：

- `20260825152608_preserve_player_career_highlight_translation_updates`
  - BEFORE UPDATE trigger：新 payload 的 `description_zh` 为空时自动保留旧中文；`translation_updated_at` 同样保留。
- `20260825153442_preserve_player_career_highlight_translations_during_wst_sync`
  - WST Career Highlights 同步取消 `DELETE + INSERT`；
  - 改为 `(player_id, sequence_no)` UPSERT；
  - 只刷新英文与来源字段；
  - 不写 `description_zh / translation_updated_at`。

事务回归验证已通过：将已有中文更新为 NULL 时，trigger 实际保留原中文和翻译时间。

## 3. 其它球员中文资料

当前生产库：

- 中文简介：127 / 127 有英文简介的球员均已中文化，问题数 0。
- 最近一次赛事冠军：43 / 43 有英文值的记录均有中文，问题数 0。
- 昵称：`KO`、`F1` 是专用昵称缩写，保留原样。
- 现役巡回球员：中文姓名 / 中文国籍问题均为 0。

本轮继续核验并写入 16 名历史/高曝光球员，统一同步到 `snooker_player_names(locale='zh-CN', status='verified')`：

- Kurt Maflin → 柯特·马福林
- Stephen Hendry → 斯蒂芬·亨德利
- Aditya Mehta → 阿迪蒂亚·梅塔
- Sunny Akani → 桑尼·阿卡尼
- Yu Delu → 于德陆
- Niu Zhuang → 牛壮
- Li Yuan → 李远
- Chen Zhe → 陈喆
- Jamie Cope → 杰米·科普
- Farakh Ajaib → 法拉赫·阿贾伊布
- Lee Walker → 李·沃克
- Ben Hancorn → 本·汉考恩
- Riley Parsons → 莱利·帕森斯
- Jamie Wilson → 杰米·威尔逊
- Hamza Akbar → 哈姆扎·阿克巴
- Fraser Patrick → 弗雷泽·帕特里克

球员主数据当前仍有：

- `players.name_zh`：877 条历史/长尾记录待审核。
- `players.short_name_zh`：877 条待审核。
- `players.nationality_zh`：661 条缺失；这些记录的 `country_code` 同样缺失，暂不猜测。

存在多个中文译法的历史球员继续保留 `pending_review`，例如 Rod Lawler 等，不为追求覆盖率强行选译名。

## 4. 国家、地区、城市、场馆

历史赛事 `city_zh` 缺失已从最初 189 条降至 **1 条**。

本轮按赛事名 + 开赛日期双键，从可信历史赛历回填 2017/18 至 2022/23 共 141 条历史赛事举办城市，包含：

- 疫情赛季大量赛事实际举办地：米尔顿凯恩斯；
- 世界锦标赛：谢菲尔德；
- 英锦赛：约克；
- 德国大师赛：柏林；
- 上海大师赛：上海；
- 国际锦标赛：大庆；
- 中国锦标赛：广州；
- 世界公开赛：玉山；
- 北爱尔兰公开赛：贝尔法斯特；
- 苏格兰公开赛不同赛季的格拉斯哥 / 兰迪德诺 / 爱丁堡；
- Q School 不同赛季的普雷斯顿 / 特伦特河畔伯顿 / 维冈 / 谢菲尔德；
- 其它可核验城市包括伦敦、考文垂、莱斯特、纽波特、沃特福德、普雷斯顿、科钦、安塔利亚、直布罗陀等。

唯一保留为空的是：

- `2023 6-Reds World Championship`：可靠来源存在 Bangkok / Pathum Thani 的城市口径差异，暂不强行写入。

## 5. 翻译治理护栏

生产库已应用：

- `20260825144527_guard_translation_ingest_and_queue_reviews`
- `20260825152608_preserve_player_career_highlight_translation_updates`
- `20260825153442_preserve_player_career_highlight_translations_during_wst_sync`

数据库负责翻译事实与审核状态；新球员无可信中文名时进入 `pending_review`；标准轮次自动规范；英文源字段永久保留。

## 6. 数量变化

| 审计项 | 初始问题数 | 当前问题数 |
| --- | ---: | ---: |
| `players.name_zh` | 965 | **877** |
| `players.short_name_zh` | 990 | **877** |
| `players.nationality_zh` | 968 | **661** |
| `career_highlights.description_zh` | 917 | **0** |
| `rounds.label_zh` | 579 | 0 |
| `events.name_zh` | 29 | 0 |
| `events.country_zh` | 47 | 0 |
| `events.stage_name_zh` | 25 | 0 |
| `event_series.name_zh` | 24 | 0 |
| `events.venue_zh` | 17 | 0 |
| `event_agg.last_recorded_round_zh` | 9,038 | 0 |
| `events.city_zh` | 189 | **1** |
| `profile biography zh` | — | 0 问题 |
| `career last_tournament_win_zh` | — | 0 问题 |

当前 `snooker_player_names`：

- `zh-CN / verified`：133
- `zh-CN / pending_review`：877

## 7. 可重复执行的数据脚本

新增：

- `supabase/translation-governance/backfill_verified_historical_players_and_cities_20260826.sql`

该脚本镜像本轮生产 DML：

- 16 个已核验历史球员中文名；
- 141 条历史赛事城市；
- 2018罗马尼亚大师赛错误译名修正；
- 只填缺失/英文污染数据，不覆盖已有有效中文。

## 8. 线上核心校验

- 2026/27 赛季赛事：赛事名 / 国家 / 城市 / 场馆结构化中文问题为 0。
- 现役巡回球员：中文姓名 / 中文国籍问题为 0。
- 球员职业生涯：917 / 917 已有中文。
- 历史赛事城市：仅剩 1 条有来源口径争议。
- Supabase Security Advisors：0 条安全告警。

## 9. 仍需人工确认的数据

- 877 条历史/长尾球员姓名与简称：继续结合 WST、WPBSA、中文体育媒体及球员官方资料逐批确认。
- 661 条历史球员国籍：源数据同时缺失 `country_code`，不推测。
- 1 条六红球世锦赛城市：来源城市口径冲突，保持待确认。

以上数据继续保持可见的待审核状态，不用错误中文换取表面覆盖率。
