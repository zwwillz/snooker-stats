-- 147数据局：数据库中文翻译质量审计
-- 只读脚本，不修改任何业务数据。
-- 目标：识别中文字段缺失、仍为英文、与英文完全相同、以及同一英文实体存在多个中文译名的问题。

-- 1. 球员中文名 / 简称 / 国籍
select
  'snooker_players' as table_name,
  p.id::text as entity_id,
  p.slug as entity_key,
  p.name_en as source_en,
  p.name_zh as value_zh,
  case
    when p.name_zh is null or btrim(p.name_zh) = '' then 'missing_name_zh'
    when lower(btrim(p.name_zh)) = lower(btrim(p.name_en)) then 'same_as_english'
    when p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]' then 'english_only_name_zh'
    else null
  end as issue
from public.snooker_players p
where p.name_zh is null
   or btrim(p.name_zh) = ''
   or lower(btrim(p.name_zh)) = lower(btrim(p.name_en))
   or (p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]')
order by p.name_en;

select
  'snooker_players.short_name_zh' as field_name,
  count(*) filter (where short_name_zh is null or btrim(short_name_zh) = '') as missing_count,
  count(*) filter (where short_name_zh ~ '[A-Za-z]' and short_name_zh !~ '[一-龥]') as english_only_count,
  count(*) as total_count
from public.snooker_players;

select
  'snooker_players.nationality_zh' as field_name,
  count(*) filter (where nationality_zh is null or btrim(nationality_zh) = '') as missing_count,
  count(*) filter (where nationality_zh ~ '[A-Za-z]' and nationality_zh !~ '[一-龥]') as english_only_count,
  count(*) as total_count
from public.snooker_players;

-- 2. 球员多语言名称表：中文 locale 是否齐全 / 是否仍为英文
select
  p.id::text as player_id,
  p.slug,
  p.name_en,
  n.display_name,
  n.short_name,
  n.status,
  case
    when n.id is null then 'missing_zh_name_record'
    when btrim(n.display_name) = '' then 'empty_display_name'
    when lower(btrim(n.display_name)) = lower(btrim(p.name_en)) then 'same_as_english'
    when n.display_name ~ '[A-Za-z]' and n.display_name !~ '[一-龥]' then 'english_only_display_name'
    else null
  end as issue
from public.snooker_players p
left join public.snooker_player_names n
  on n.player_id = p.id and n.locale = 'zh-CN'
where n.id is null
   or btrim(n.display_name) = ''
   or lower(btrim(n.display_name)) = lower(btrim(p.name_en))
   or (n.display_name ~ '[A-Za-z]' and n.display_name !~ '[一-龥]')
order by p.name_en;

-- 3. 赛事核心中文字段
select
  e.id::text as event_id,
  e.slug,
  e.season,
  e.name_en,
  e.name_zh,
  e.country_zh,
  e.city_zh,
  e.venue_en,
  e.venue_zh,
  concat_ws(', ',
    case when e.name_zh is null or btrim(e.name_zh) = '' then 'missing_name_zh' end,
    case when e.name_zh is not null and lower(btrim(e.name_zh)) = lower(btrim(e.name_en)) then 'name_same_as_english' end,
    case when e.name_zh ~ '[A-Za-z]' and e.name_zh !~ '[一-龥]' then 'english_only_name_zh' end,
    case when e.country_zh is null or btrim(e.country_zh) = '' then 'missing_country_zh' end,
    case when e.country_zh ~ '[A-Za-z]' and e.country_zh !~ '[一-龥]' then 'english_only_country_zh' end,
    case when e.city_zh is null or btrim(e.city_zh) = '' then 'missing_city_zh' end,
    case when e.city_zh ~ '[A-Za-z]' and e.city_zh !~ '[一-龥]' then 'english_only_city_zh' end,
    case when e.venue_en is not null and (e.venue_zh is null or btrim(e.venue_zh) = '') then 'missing_venue_zh' end,
    case when e.venue_zh ~ '[A-Za-z]' and e.venue_zh !~ '[一-龥]' then 'english_only_venue_zh' end
  ) as issues
from public.snooker_events e
where e.name_zh is null
   or btrim(e.name_zh) = ''
   or lower(btrim(e.name_zh)) = lower(btrim(e.name_en))
   or (e.name_zh ~ '[A-Za-z]' and e.name_zh !~ '[一-龥]')
   or e.country_zh is null
   or btrim(e.country_zh) = ''
   or (e.country_zh ~ '[A-Za-z]' and e.country_zh !~ '[一-龥]')
   or e.city_zh is null
   or btrim(e.city_zh) = ''
   or (e.city_zh ~ '[A-Za-z]' and e.city_zh !~ '[一-龥]')
   or (e.venue_en is not null and (e.venue_zh is null or btrim(e.venue_zh) = ''))
   or (e.venue_zh ~ '[A-Za-z]' and e.venue_zh !~ '[一-龥]')
order by e.season desc, e.start_date desc nulls last, e.name_en;

-- 4. 比赛轮次 / 阶段
select
  r.id::text as round_id,
  r.event_id::text,
  e.slug as event_slug,
  e.name_en as event_name_en,
  r.round_key,
  r.label_en,
  r.label_zh,
  case
    when r.label_zh is null or btrim(r.label_zh) = '' then 'missing_label_zh'
    when r.label_en is not null and lower(btrim(r.label_zh)) = lower(btrim(r.label_en)) then 'same_as_english'
    when r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]' then 'english_only_label_zh'
    else null
  end as issue
from public.snooker_rounds r
join public.snooker_events e on e.id = r.event_id
where r.label_zh is null
   or btrim(r.label_zh) = ''
   or (r.label_en is not null and lower(btrim(r.label_zh)) = lower(btrim(r.label_en)))
   or (r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]')
order by e.season desc, e.start_date desc nulls last, r.sort_order;

-- 5. 奖金标签
select
  p.id::text as prize_id,
  p.event_id::text,
  p.prize_key,
  p.label_en,
  p.label_zh,
  case
    when p.label_zh is null or btrim(p.label_zh) = '' then 'missing_label_zh'
    when p.label_en is not null and lower(btrim(p.label_zh)) = lower(btrim(p.label_en)) then 'same_as_english'
    when p.label_zh ~ '[A-Za-z]' and p.label_zh !~ '[一-龥]' then 'english_only_label_zh'
    else null
  end as issue
from public.snooker_event_prizes p
where p.label_zh is null
   or btrim(p.label_zh) = ''
   or (p.label_en is not null and lower(btrim(p.label_zh)) = lower(btrim(p.label_en)))
   or (p.label_zh ~ '[A-Za-z]' and p.label_zh !~ '[一-龥]')
order by p.event_id, p.sort_order;

-- 6. 球员详情长文本 / 昵称 / 引语
select
  d.player_id::text,
  p.slug,
  p.name_en,
  concat_ws(', ',
    case when d.nickname_en is not null and (d.nickname_zh is null or btrim(d.nickname_zh) = '') then 'missing_nickname_zh' end,
    case when d.biography_html_en is not null and (d.biography_html_zh is null or btrim(d.biography_html_zh) = '') then 'missing_biography_html_zh' end,
    case when d.quote_en is not null and (d.quote_zh is null or btrim(d.quote_zh) = '') then 'missing_quote_zh' end,
    case when d.quote_source_en is not null and (d.quote_source_zh is null or btrim(d.quote_source_zh) = '') then 'missing_quote_source_zh' end
  ) as issues
from public.snooker_player_profile_details d
join public.snooker_players p on p.id = d.player_id
where (d.nickname_en is not null and (d.nickname_zh is null or btrim(d.nickname_zh) = ''))
   or (d.biography_html_en is not null and (d.biography_html_zh is null or btrim(d.biography_html_zh) = ''))
   or (d.quote_en is not null and (d.quote_zh is null or btrim(d.quote_zh) = ''))
   or (d.quote_source_en is not null and (d.quote_source_zh is null or btrim(d.quote_source_zh) = ''))
order by p.name_en;

-- 7. 球员职业生涯亮点
select
  h.id::text,
  h.player_id::text,
  p.slug,
  h.highlight_year,
  h.description_en,
  h.description_zh
from public.snooker_player_career_highlights h
join public.snooker_players p on p.id = h.player_id
where h.description_zh is null
   or btrim(h.description_zh) = ''
   or lower(btrim(h.description_zh)) = lower(btrim(h.description_en))
   or (h.description_zh ~ '[A-Za-z]' and h.description_zh !~ '[一-龥]')
order by p.name_en, h.sequence_no;

-- 8. 排名榜标题
select
  id::text,
  list_key,
  season,
  title_en,
  title_zh,
  description_zh
from public.snooker_ranking_lists
where title_zh is null
   or btrim(title_zh) = ''
   or lower(btrim(title_zh)) = lower(btrim(title_en))
   or (title_zh ~ '[A-Za-z]' and title_zh !~ '[一-龥]')
order by season desc, list_key;

-- 9. 同一英文赛事出现多个中文译名
select
  lower(btrim(name_en)) as normalized_name_en,
  array_agg(distinct name_en order by name_en) as english_variants,
  array_agg(distinct name_zh order by name_zh) as chinese_variants,
  count(*) as row_count
from public.snooker_events
where btrim(name_en) <> '' and btrim(name_zh) <> ''
group by lower(btrim(name_en))
having count(distinct btrim(name_zh)) > 1
order by row_count desc, normalized_name_en;

-- 10. 同一英文场馆出现多个中文译名
select
  lower(btrim(venue_en)) as normalized_venue_en,
  array_agg(distinct venue_en order by venue_en) as english_variants,
  array_agg(distinct venue_zh order by venue_zh) as chinese_variants,
  count(*) as row_count
from public.snooker_events
where venue_en is not null
  and btrim(venue_en) <> ''
  and venue_zh is not null
  and btrim(venue_zh) <> ''
group by lower(btrim(venue_en))
having count(distinct btrim(venue_zh)) > 1
order by row_count desc, normalized_venue_en;

-- 11. 同一英文轮次出现多个中文译名
select
  lower(btrim(coalesce(label_en, round_key))) as normalized_round_en,
  array_agg(distinct coalesce(label_en, round_key) order by coalesce(label_en, round_key)) as english_variants,
  array_agg(distinct label_zh order by label_zh) as chinese_variants,
  count(*) as row_count
from public.snooker_rounds
where coalesce(label_en, round_key) is not null
  and btrim(coalesce(label_en, round_key)) <> ''
  and label_zh is not null
  and btrim(label_zh) <> ''
group by lower(btrim(coalesce(label_en, round_key)))
having count(distinct btrim(label_zh)) > 1
order by row_count desc, normalized_round_en;

-- 12. 汇总：核心表中文问题数量
select * from (
  select 'snooker_players.name_zh' as item,
         count(*) filter (where name_zh is null or btrim(name_zh) = '' or lower(btrim(name_zh)) = lower(btrim(name_en)) or (name_zh ~ '[A-Za-z]' and name_zh !~ '[一-龥]')) as issue_count,
         count(*) as total_count
  from public.snooker_players
  union all
  select 'snooker_players.nationality_zh',
         count(*) filter (where nationality_zh is null or btrim(nationality_zh) = '' or (nationality_zh ~ '[A-Za-z]' and nationality_zh !~ '[一-龥]')),
         count(*)
  from public.snooker_players
  union all
  select 'snooker_events.name_zh',
         count(*) filter (where name_zh is null or btrim(name_zh) = '' or lower(btrim(name_zh)) = lower(btrim(name_en)) or (name_zh ~ '[A-Za-z]' and name_zh !~ '[一-龥]')),
         count(*)
  from public.snooker_events
  union all
  select 'snooker_events.country_zh',
         count(*) filter (where country_zh is null or btrim(country_zh) = '' or (country_zh ~ '[A-Za-z]' and country_zh !~ '[一-龥]')),
         count(*)
  from public.snooker_events
  union all
  select 'snooker_events.city_zh',
         count(*) filter (where city_zh is null or btrim(city_zh) = '' or (city_zh ~ '[A-Za-z]' and city_zh !~ '[一-龥]')),
         count(*)
  from public.snooker_events
  union all
  select 'snooker_events.venue_zh',
         count(*) filter (where venue_en is not null and (venue_zh is null or btrim(venue_zh) = '' or (venue_zh ~ '[A-Za-z]' and venue_zh !~ '[一-龥]'))),
         count(*)
  from public.snooker_events
  union all
  select 'snooker_rounds.label_zh',
         count(*) filter (where label_zh is null or btrim(label_zh) = '' or (label_en is not null and lower(btrim(label_zh)) = lower(btrim(label_en))) or (label_zh ~ '[A-Za-z]' and label_zh !~ '[一-龥]')),
         count(*)
  from public.snooker_rounds
) s
order by issue_count desc, item;
