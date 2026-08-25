# 147数据局中文翻译治理｜生产库审计记录（2026-08-25）

> Production project: `rtlvncsmbueatdzqvhbn` (`snooker-stats`)
>
> 原则：保留英文源数据；只对高置信度中文字段直接补齐；有争议的人名、历史城市和长文本不机器猜译。

## 1. 本轮已完成

### 结构化赛事数据

以下字段的“空值 / 与英文相同 / 纯英文残留”已清到 0：

- `snooker_events.name_zh`
- `snooker_events.country_zh`
- `snooker_events.venue_zh`（存在 `venue_en` 的记录）
- `snooker_events.stage_name_zh`
- `snooker_event_series.name_zh`
- `snooker_rounds.label_zh`
- `snooker_player_event_aggregates.last_recorded_round_zh`

同时修正了“已有中文但语义错误”的典型数据：

- `2017/2018/2019 Shanghai Masters`：由泛化的“斯诺克大师赛”修正为“上海大师赛”
- `2017/2018/2019 Riga Masters`：由泛化的“斯诺克大师赛”修正为“里加大师赛”
- `Machineseeker German Masters 2026`：修正为“2026 Machineseeker德国大师赛”

### 标准轮次

统一了：

- Round 1–6 → 第一轮–第六轮
- Last N → N强
- Quarter Final(s) → 四分之一决赛
- Semi Final(s) → 半决赛
- Final → 决赛
- Round Robin → 循环赛
- League Phase → 联赛阶段
- Group Final / Group Semi-Finals → 小组决赛 / 小组半决赛
- Stage One/Two/Three → 第一/二/三阶段
- Held Over → “延期至正赛场馆进行”语义

生产库已新增 `20260825144527_guard_translation_ingest_and_queue_reviews`：

- `snooker_round_translation_guard`：未来增量轮次如果写入标准英文，会自动规范到统一中文；未知特殊阶段不猜译。
- `snooker_player_translation_review_queue`：未来新增且没有可信中文名的球员会自动进入 `zh-CN / pending_review`，不会再把英文姓名当成已翻译中文。

### 国家、地区、城市、场馆

高置信度英文残留已补齐。历史赛事中仍有 **142 条 `city_zh` 为空**，这些主要是旧数据源未提供城市，而不是英文残留；暂不凭赛事名称猜城市。

已从可信赛事资料继续回填 2022/23 赛季明确举办城市，包括：谢菲尔德、赫尔、莱斯特、伍尔弗汉普顿、兰迪德诺、柏林、切尔滕纳姆、伦敦。

### 球员主数据

本轮先处理可验证的中国/中国香港球员与高曝光历史球员，并同步写入 `snooker_player_names(locale='zh-CN', status='verified')`。

示例：

- Cao Yupeng → 曹宇鹏
- Ma Hailong → 马海龙
- Tian Pengfei → 田鹏飞
- Xing Zihao → 邢子豪
- Yu Kiu Chang → 郑宇乔
- Shaun Liu → 廖予生
- Joe Perry → 乔·佩里
- Graeme Dott → 格雷厄姆·多特
- Mark Davis → 马克·戴维斯
- Yan Bingtao → 颜丙涛
- Liang Wenbo → 梁文博
- Lu Ning → 鲁宁
- Li Hang → 李行
- Chen Zifan → 陈子凡
- Luo Honghao → 罗弘昊
- Peifan Lei → 雷佩凡
- Mei Xiwen → 梅希文
- Jianbo Zhao → 赵剑波
- Peter Ebdon → 彼得·艾伯顿
- Thor Chuan Leong → 涂振龙
- Zhang Jiankang → 张健康
- Zhang Yong → 张永
- Bai Langning → 白朗宁
- Chen Feilong → 陈飞龙
- James Wattana → 詹姆斯·瓦塔纳
- John Astley → 约翰·阿斯特利
- Barry Pinches → 巴里·平奇斯
- Mink Nutcharut → 明克·努查鲁特
- Fang Xiongman → 方雄慢
- Mike Dunn → 迈克·邓恩
- Robin Hull → 罗宾·赫尔
- Rory McLeod → 罗里·麦克劳德

另识别并处理了伪球员占位实体：

- `Winner of Match 14` → `第14场胜者`

## 2. 数量变化

| 审计项 | 初始问题数 | 当前问题数 |
| --- | ---: | ---: |
| `players.name_zh` | 965 | 893 |
| `players.short_name_zh` | 990 | 893 |
| `players.nationality_zh` | 968 | 661 |
| `rounds.label_zh` | 579 | 0 |
| `events.name_zh` | 29 | 0 |
| `events.country_zh` | 47 | 0 |
| `events.stage_name_zh` | 25 | 0 |
| `event_series.name_zh` | 24 | 0 |
| `events.venue_zh` | 17 | 0 |
| `event_agg.last_recorded_round_zh` | 9,038（后续扩展审计发现） | 0 |
| `events.city_zh` | 189 | 142（均为历史空值） |
| `career_highlights.description_zh` | 917 | 917 |

当前 `snooker_player_names`：

- `zh-CN / verified`：117
- `zh-CN / source_mapped`：95
- `zh-CN / pending_review`：893

当前线上核心数据校验：

- 2026/27 赛季 43 个赛事：赛事名 / 国家 / 城市 / 场馆问题均为 0。
- 127 名现役巡回球员：中文姓名 / 中文国籍问题均为 0。

## 3. 当前明确不做自动写入的内容

### 893 条历史/长尾球员姓名

剩余问题绝大多数是历史职业球员、业余球员和旧赛事参赛者。处理策略：

1. 按数据库实际比赛出现次数排序；
2. 优先处理高曝光球员；
3. 中国/华人球员必须尽量确认真实汉字姓名；
4. 外籍球员采用国内媒体通行译名；
5. 存在两个以上常用译名时保持 `pending_review`，不直接覆盖。

### 917 条职业生涯亮点长文本

`snooker_player_career_highlights.description_zh` 当前仍未批量翻译。该字段是完整自然语言资料，不适合直接机器翻译后作为已审核数据入库，应单独建立翻译批次和审核状态。

### 142 条历史城市空值

不根据赛事名称或国家直接猜举办城市；后续应从原始赛事页、场馆或可信历史资料回填。

## 4. 根因与长期防护

已确认 CueTracker 历史导入器原逻辑在创建新球员时会写入 `name_zh = name_en`，对无法识别的阶段会写入 `label_zh = stage`。这会持续制造英文“中文字段”。

当前治理方式：

- 数据库负责翻译事实与审核状态；
- 标准轮次由数据库级 guard 兜底；
- 新增未翻译球员自动进入审核队列；
- 未知特殊阶段不自动猜译；
- 英文源字段始终保留。

## 5. 前端防御修复

`lib/snooker/database-public.ts` 已移除中文轮次向 `label_en` 的直接回退：

- 中文值必须实际包含中文字符才用于中文 UI；
- 不合格时显示 `待确认轮次`；
- `labelEn` 仍单独保留，英文源数据没有被删除。

这样数据库是翻译事实源，前端只做防御，不在组件里维护大规模英文→中文 if/else。

## 6. Supabase 检查

应用数据库护栏 migration 后已运行 Supabase Advisors：

- Security：0 条告警。
- Performance：仅有既存 `unused_index` 信息级提示，与本次翻译治理 DDL 无直接关系，本轮不删除索引。

## 7. 下一步

- 继续按比赛出现次数处理高曝光历史球员；
- 核查现有中文值中的错误译名/多版本译名，而不仅仅检查英文残留；
- 逐步调整 CueTracker 历史导入逻辑，使新记录从源头遵守审核规则；
- 对 142 条历史城市建立可追溯的来源回填；
- 将长文本翻译作为独立、有审核状态的资料治理任务。
