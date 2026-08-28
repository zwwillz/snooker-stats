insert into public.snooker_matches (
  event_id,
  round_id,
  source_match_id,
  match_no,
  player1_id,
  player2_id,
  score1,
  score2,
  best_of,
  status,
  scheduled_at,
  winner_id,
  note,
  source_updated_at,
  source_status,
  source_status_meta,
  realtime_finalized_at,
  frames_complete,
  completed_detected_at
)
select
  e.id,
  r.id,
  'snooker-org-2757-round-2-02',
  22,
  wakelin.id,
  hallworth.id,
  null,
  null,
  9,
  'walkover',
  null,
  wakelin.id,
  'snooker.org：霍尔沃斯因个人原因退赛，韦克林不战晋级；WST Tournament API 未返回该比赛对象。',
  '2026-08-23 08:09:00+00'::timestamptz,
  'walkover',
  'W/O',
  '2026-08-23 08:09:00+00'::timestamptz,
  true,
  '2026-08-23 08:09:00+00'::timestamptz
from public.snooker_events e
join public.snooker_rounds r
  on r.event_id=e.id and r.round_key='round-3'
join public.snooker_players wakelin
  on wakelin.slug='chris-wakelin'
join public.snooker_players hallworth
  on hallworth.slug='steven-hallworth'
where e.slug='wuhan-open-2026'
  and not exists (
    select 1
    from public.snooker_matches m
    where m.event_id=e.id
      and (m.match_no=22 or m.source_match_id='snooker-org-2757-round-2-02')
  );
