# 147数据局中文翻译治理｜生产库审计记录（2026-08-25）

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

已修正上海大师赛、里加大师赛、德国大师赛等历史错误译名，并统一 Round / Last N / Quarter Final / Semi Final / Final / Round Robin / League Phase / Held Over 等标准轮次中文。

## 2. 球员职业生涯中文恢复

### 故障根因

2026-08-23 的 `player_profiles` WST 同步任务处理了 127 名球员。生产函数 `snooker_internal.sync_wst_player_profiles_batch(integer,integer)` 原实现会：

1. `delete from snooker_player_career_highlights where player_id=...`；
2. 再从 WST 插入只有 `description_en` 的 Career Highlights。

因此此前中文页面已使用 `description_zh` 的前端逻辑没有回退，但数据库中的中文职业生涯被同步任务删除，页面随后通过英文 fallback 显示英文。

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
  - 只刷新 `highlight_year / description_en / source_*`；
  - 不写 `description_zh / translation_updated_at`。

事务回归验证：将一条已有记录的 `description_zh` 与 `translation_updated_at` 更新为 NULL 后，trigger 实际保留了原中文和翻译时间；测试事务已 rollback。

## 3. 其它球员中文资料

当前生产库：

- 中文简介：127 / 127 有英文简介的球员均已中文化，问题数 0。
- 最近一次赛事冠军：43 / 43 有英文值的记录均有中文，问题数 0。
- 昵称：54 条有值；仅 `KO`、`F1` 两个被英文规则命中，它们是专用昵称缩写，保留原样。
- 引语：当前英文和中文均无有效内容，不存在待翻译英文。

球员主数据当前仍有：

- `players.name_zh`：893 条历史/长尾记录待审核。
- `players.short_name_zh`：893 条待审核。
- `players.nationality_zh`：661 条缺失；这 661 条的 `country_code` 也全部为空，不能安全按代码映射补齐。

这些记录以历史职业球员、业余球员、旧赛事参赛者为主。没有可靠身份来源时保持 `pending_review`，不机器猜译人名或国籍。

## 4. 国家、地区、城市、场馆

高置信度英文残留已补齐。历史赛事仍有 142 条 `city_zh` 为空，主要因旧数据源没有城市源字段；不根据赛事名或国家猜举办城市。

已从可信赛事资料回填包括谢菲尔德、赫尔、莱斯特、伍尔弗汉普顿、兰迪德诺、柏林、切尔滕纳姆、伦敦等历史举办城市。

## 5. 翻译治理护栏

生产库已应用：

- `20260825144527_guard_translation_ingest_and_queue_reviews`
  - 标准英文轮次自动规范为统一中文；
  - 新增无可信中文名球员自动进入 `zh-CN / pending_review`。
- `20260825152608_preserve_player_career_highlight_translation_updates`
- `20260825153442_preserve_player_career_highlight_translations_during_wst_sync`

另已确认 CueTracker 历史导入器曾存在 `name_zh = name_en` 与未知阶段 `label_zh = stage` 的污染逻辑；数据库级 guard 已阻止其把标准轮次和未审核球员伪装成有效中文。

## 6. 数量变化

| 审计项 | 初始问题数 | 当前问题数 |
| --- | ---: | ---: |
| `players.name_zh` | 965 | 893 |
| `players.short_name_zh` | 990 | 893 |
| `players.nationality_zh` | 968 | 661 |
| `career_highlights.description_zh` | 917 | **0** |
| `rounds.label_zh` | 579 | 0 |
| `events.name_zh` | 29 | 0 |
| `events.country_zh` | 47 | 0 |
| `events.stage_name_zh` | 25 | 0 |
| `event_series.name_zh` | 24 | 0 |
| `events.venue_zh` | 17 | 0 |
| `event_agg.last_recorded_round_zh` | 9,038 | 0 |
| `events.city_zh` | 189 | 142（均为历史空值） |
| `profile biography zh` | — | 0 问题 |
| `career last_tournament_win_zh` | — | 0 问题 |

当前 `snooker_player_names`：已确认/来源映射继续保留；剩余历史长尾使用 `pending_review`，不为追求覆盖率强行音译。

## 7. 线上核心校验

- 2026/27 赛季赛事：赛事名 / 国家 / 城市 / 场馆结构化中文问题为 0。
- 现役巡回球员：中文姓名 / 中文国籍问题为 0。
- 球员职业生涯：917 / 917 已有中文。
- 球员中文简介：有效英文简介对应中文缺失为 0。
- 最近一次赛事冠军：有效英文值对应中文缺失为 0。
- Supabase Security Advisors：0 条安全告警。

## 8. 前端与回归测试

`lib/snooker/database-public.ts` 已禁止中文轮次直接 fallback 到英文 `label_en`，缺失时显示 `待确认轮次`。

新增 `tests/snooker-player-translation-preservation.test.mjs`：

- 检查 Career Highlights 中文保护 trigger migration；
- 检查 WST 同步使用非破坏性 UPSERT；
- 禁止新同步逻辑再次删除职业生涯后重建；
- 禁止新同步逻辑写 `description_zh`。

## 9. 仍需人工确认的数据

- 893 条历史/长尾球员姓名与简称：需结合 WST、WPBSA、中文体育媒体或球员官方资料逐批确认。
- 661 条历史球员国籍：源数据同时缺失 `country_code`，不推测。
- 142 条历史赛事城市：源数据缺失举办城市，不从赛事品牌名猜测。

以上三类保持可见的待审核状态，不用错误中文换取表面覆盖率。
