-- 147数据局：球员赛事聚合表轮次中文补齐
--
-- 背景：snooker_rounds.label_zh 已完成治理，但历史聚合字段
-- snooker_player_event_aggregates.last_recorded_round_zh 仍可能保留旧英文值。
-- 本脚本只更新空值、与英文相同或纯英文的中文字段，不修改英文源字段。
-- 可重复执行。

begin;

update public.snooker_player_event_aggregates
set last_recorded_round_zh = case last_recorded_round_en
  when 'Round 1' then '第一轮'
  when 'Round 2' then '第二轮'
  when 'Round 3' then '第三轮'
  when 'Round 4' then '第四轮'
  when 'Round 5' then '第五轮'
  when 'Round 6' then '第六轮'
  when 'Last 112' then '112强'
  when 'Last 80' then '80强'
  when 'Last 48' then '48强'
  when 'Last 24' then '24强'
  when 'Last 16' then '16强'
  when 'Quarter Final' then '四分之一决赛'
  when 'Quarter Finals' then '四分之一决赛'
  when 'Semi Final' then '半决赛'
  when 'Semi Finals' then '半决赛'
  when 'Semi-Final' then '半决赛'
  when 'Semi-Finals' then '半决赛'
  when 'Final' then '决赛'
  when 'League Phase' then '联赛阶段'
  when 'Round Robin' then '循环赛'
  when 'Pre-Qualifier' then '预资格赛'
  when 'Group Final' then '小组决赛'
  when 'Group Semi-Finals' then '小组半决赛'
  when 'Group Semi Finals' then '小组半决赛'
  when 'Stage One' then '第一阶段'
  when 'Stage Two' then '第二阶段'
  when 'Stage 2' then '第二阶段'
  when 'Stage Three' then '第三阶段'
  when 'Stage 3' then '第三阶段'
  when 'Stage One/week 2' then '第一阶段·第2周'
  when 'Stage One/week 3' then '第一阶段·第3周'
  when 'Stage One/WK1' then '第一阶段·第1周'
  when 'Stage One/WK2' then '第一阶段·第2周'
  when 'Stage One/WK3' then '第一阶段·第3周'
  when 'League Phase (STAGE ONE / WEEK 1)' then '联赛阶段（第一阶段·第1周）'
  when 'League Phase (STAGE ONE / WEEK 2)' then '联赛阶段（第一阶段·第2周）'
  when 'League Phase (STAGE ONE / WEEK 3)' then '联赛阶段（第一阶段·第3周）'
  when 'League Phase (STAGE TWO / WEEK 1)' then '联赛阶段（第二阶段·第1周）'
  when 'League Phase (STAGE TWO / WEEK 2)' then '联赛阶段（第二阶段·第2周）'
  when 'League Phase (STAGE THREE)' then '联赛阶段（第三阶段）'
  when 'Pre-qualifying 5' then '预资格赛第5轮'
  when 'Round 1 (Held Over)' then '第一轮（延期至正赛场馆进行）'
  when 'Round 1 (held over)' then '第一轮（延期至正赛场馆进行）'
  when 'Round 1/Heldover' then '第一轮（延期至正赛场馆进行）'
  when 'Qualifier 1 (heldover)' then '资格赛第1轮（延期至正赛场馆进行）'
  when 'Qualifier 2 (heldover)' then '资格赛第2轮（延期至正赛场馆进行）'
  else last_recorded_round_zh
end
where last_recorded_round_en in (
  'Round 1','Round 2','Round 3','Round 4','Round 5','Round 6',
  'Last 112','Last 80','Last 48','Last 24','Last 16',
  'Quarter Final','Quarter Finals','Semi Final','Semi Finals','Semi-Final','Semi-Finals','Final',
  'League Phase','Round Robin','Pre-Qualifier','Group Final','Group Semi-Finals','Group Semi Finals',
  'Stage One','Stage Two','Stage 2','Stage Three','Stage 3',
  'Stage One/week 2','Stage One/week 3','Stage One/WK1','Stage One/WK2','Stage One/WK3',
  'League Phase (STAGE ONE / WEEK 1)','League Phase (STAGE ONE / WEEK 2)','League Phase (STAGE ONE / WEEK 3)',
  'League Phase (STAGE TWO / WEEK 1)','League Phase (STAGE TWO / WEEK 2)','League Phase (STAGE THREE)',
  'Pre-qualifying 5','Round 1 (Held Over)','Round 1 (held over)','Round 1/Heldover',
  'Qualifier 1 (heldover)','Qualifier 2 (heldover)'
)
and (
  last_recorded_round_zh is null
  or btrim(last_recorded_round_zh) = ''
  or lower(btrim(last_recorded_round_zh)) = lower(btrim(last_recorded_round_en))
  or (last_recorded_round_zh ~ '[A-Za-z]' and last_recorded_round_zh !~ '[一-龥]')
);

-- 验证：应返回 0。
select count(*) as remaining_translation_issues
from public.snooker_player_event_aggregates
where last_recorded_round_en is not null
  and btrim(last_recorded_round_en) <> ''
  and (
    last_recorded_round_zh is null
    or btrim(last_recorded_round_zh) = ''
    or lower(btrim(last_recorded_round_zh)) = lower(btrim(last_recorded_round_en))
    or (last_recorded_round_zh ~ '[A-Za-z]' and last_recorded_round_zh !~ '[一-龥]')
  );

-- 默认回滚，正式执行时在审计通过后将下面一行改为 commit。
rollback;
