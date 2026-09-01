-- Complete confirmed 2026/27 main-event metadata shown in the event detail view.
-- Player and event UUIDs are resolved from stable slugs so this remains portable.

with champions(event_slug, player_slug, champion_year) as (
  values
    ('shanghai-masters-2026', 'kyren-wilson', 2025),
    ('china-open-2026', 'neil-robertson', 2019),
    ('wuhan-open-2026', 'xiao-guodong', 2025),
    ('betvictor-championship-league-snooker-2026-stage-three-final', 'stephen-maguire', 2025),
    ('british-open-2026', 'shaun-murphy', 2025),
    ('english-open-2026', 'mark-allen', 2025),
    ('northern-ireland-open-2026', 'jack-lisowski', 2025),
    ('international-championship-2026', 'wu-yize', 2025),
    ('champion-of-champions-2026', 'mark-selby', 2025),
    ('uk-championship-2026', 'mark-selby', 2025),
    ('shoot-out-2026', 'alfie-burden', 2025),
    ('scottish-open-2026', 'chris-wakelin', 2025),
    ('championship-league-invitational-2026-27', 'mark-selby', 2026),
    ('masters-2027', 'kyren-wilson', 2026),
    ('german-masters-2027', 'judd-trump', 2026),
    ('welsh-open-2027', 'barry-hawkins', 2026),
    ('world-grand-prix-2027', 'zhao-xintong', 2026),
    ('players-championship-2027', 'zhao-xintong', 2026),
    ('world-open-2027', 'thepchaiya-un-nooh', 2026),
    ('tour-championship-2027', 'zhao-xintong', 2026),
    ('world-championship-2027', 'wu-yize', 2026)
)
update public.snooker_events as event
set previous_champion_player_id = player.id,
    previous_champion_name_zh = player.name_zh,
    previous_champion_year = champions.champion_year,
    updated_at = now()
from champions
join public.snooker_players as player on player.slug = champions.player_slug
where event.slug = champions.event_slug
  and event.season = '2026/27';

with prize_packages(event_slug, source_url, prizes) as (
  values
    (
      'british-open-2026',
      'https://www.wst.tv/britishopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":20000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":12000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":6000,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3000,"sort":7},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":8},{"key":"total","zh":"总奖金","en":"Total","amount":502000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'english-open-2026',
      'https://www.wst.tv/englishopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":21000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":13200,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":5400,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3600,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1000,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":550400,"sort":99,"total":true}]'::jsonb
    ),
    (
      'shenzhen-open-2026',
      'https://www.wst.tv/shenzhenopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":177000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":76000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":34500,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":22350,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":12500,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":8250,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":4700,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1600,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":850000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'northern-ireland-open-2026',
      'https://www.wst.tv/northernirelandopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":21000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":13200,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":5400,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3600,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1000,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":550400,"sort":99,"total":true}]'::jsonb
    ),
    (
      'international-championship-2026',
      'https://www.wst.tv/internationalchampionship',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":175000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":75000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":33000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":22000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":14000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":9000,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":5000,"sort":7},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":8},{"key":"total","zh":"总奖金","en":"Total","amount":825000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'shoot-out-2026',
      'https://www.wst.tv/shootout',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":50000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":22000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":12000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":6000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":3000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":1500,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":750,"sort":7},{"key":"last-128","zh":"128强","en":"Last 128","amount":250,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":213000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'scottish-open-2026',
      'https://www.wst.tv/scottishopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":21000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":13200,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":5400,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3600,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1000,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":550400,"sort":99,"total":true}]'::jsonb
    ),
    (
      'masters-2027',
      'https://www.wst.tv/themasters',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":350000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":140000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":75000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":40000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":25000,"sort":5},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":15000,"sort":6},{"key":"total","zh":"总奖金","en":"Total","amount":1015000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'german-masters-2027',
      'https://www.wst.tv/germanmasters',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":21000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":13200,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":5400,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3600,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1000,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":550400,"sort":99,"total":true}]'::jsonb
    ),
    (
      'welsh-open-2027',
      'https://www.wst.tv/welshopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":100000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":45000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":21000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":13200,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":9000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":5400,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":3600,"sort":7},{"key":"last-96","zh":"96强","en":"Last 96","amount":1000,"sort":8},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":9},{"key":"total","zh":"总奖金","en":"Total","amount":550400,"sort":99,"total":true}]'::jsonb
    ),
    (
      'world-grand-prix-2027',
      'https://www.wst.tv/worldgrandprix',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":180000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":80000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":35000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":20000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":15000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":10000,"sort":6},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":10000,"sort":7},{"key":"total","zh":"总奖金","en":"Total","amount":700000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'players-championship-2027',
      'https://www.wst.tv/playerschampionship',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":150000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":70000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":35000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":20000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":15000,"sort":5},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":10000,"sort":6},{"key":"total","zh":"总奖金","en":"Total","amount":500000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'world-open-2027',
      'https://www.wst.tv/worldopen',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":175000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":75000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":33000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":22000,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":14000,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":9000,"sort":6},{"key":"last-64","zh":"64强","en":"Last 64","amount":5000,"sort":7},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":5000,"sort":8},{"key":"total","zh":"总奖金","en":"Total","amount":825000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'tour-championship-2027',
      'https://www.wst.tv/tourchampionship',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":150000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":60000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":40000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":30000,"sort":4},{"key":"last-12","zh":"12强","en":"Last 12","amount":20000,"sort":5},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":10000,"sort":6},{"key":"total","zh":"总奖金","en":"Total","amount":500000,"sort":99,"total":true}]'::jsonb
    ),
    (
      'world-championship-2027',
      'https://www.wst.tv/worldchampionship',
      '[{"key":"winner","zh":"冠军","en":"Winner","amount":625000,"sort":1},{"key":"runner-up","zh":"亚军","en":"Runner-up","amount":250000,"sort":2},{"key":"semi-finals","zh":"半决赛","en":"Semi-finals","amount":125000,"sort":3},{"key":"quarter-finals","zh":"1/4决赛","en":"Quarter-finals","amount":62500,"sort":4},{"key":"last-16","zh":"16强","en":"Last 16","amount":37500,"sort":5},{"key":"last-32","zh":"32强","en":"Last 32","amount":25000,"sort":6},{"key":"last-48","zh":"48强","en":"Last 48","amount":18750,"sort":7},{"key":"last-80","zh":"80强","en":"Last 80","amount":12500,"sort":8},{"key":"last-112","zh":"112强","en":"Last 112","amount":6250,"sort":9},{"key":"high-break","zh":"单杆最高分","en":"High break","amount":15000,"sort":10},{"key":"total","zh":"总奖金","en":"Total","amount":3000000,"sort":99,"total":true}]'::jsonb
    )
), normalized as (
  select event.id as event_id,
         item.key as prize_key,
         item.zh as label_zh,
         item.en as label_en,
         item.amount,
         item.sort as sort_order,
         coalesce(item.total, false) as is_total,
         prize_packages.source_url
  from prize_packages
  join public.snooker_events as event
    on event.slug = prize_packages.event_slug
   and event.season = '2026/27'
  cross join lateral jsonb_to_recordset(prize_packages.prizes) as item(
    key text,
    zh text,
    en text,
    amount bigint,
    sort integer,
    total boolean
  )
)
insert into public.snooker_event_prizes (
  event_id,
  prize_key,
  label_zh,
  label_en,
  amount,
  currency,
  sort_order,
  is_total,
  source_name,
  source_url,
  source_updated_at,
  updated_at
)
select event_id,
       prize_key,
       label_zh,
       label_en,
       amount,
       'GBP',
       sort_order,
       is_total,
       'WST',
       source_url,
       now(),
       now()
from normalized
on conflict (event_id, prize_key) do update
set label_zh = excluded.label_zh,
    label_en = excluded.label_en,
    amount = excluded.amount,
    currency = excluded.currency,
    sort_order = excluded.sort_order,
    is_total = excluded.is_total,
    source_name = excluded.source_name,
    source_url = excluded.source_url,
    source_updated_at = excluded.source_updated_at,
    updated_at = now();

-- Keep the summary columns used by cards in sync with the normalized prize table,
-- including Shanghai and Wuhan, whose detailed prize rows already existed.
update public.snooker_events as event
set winner_prize = winner.amount::integer,
    runner_up_prize = runner_up.amount::integer,
    currency = winner.currency,
    updated_at = now()
from public.snooker_event_prizes as winner
join public.snooker_event_prizes as runner_up
  on runner_up.event_id = winner.event_id
 and runner_up.prize_key = 'runner-up'
where winner.event_id = event.id
  and winner.prize_key = 'winner'
  and event.season = '2026/27';
