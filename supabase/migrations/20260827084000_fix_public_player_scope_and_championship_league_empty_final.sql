create or replace view public.snooker_public_players
with (security_invoker = true)
as
with scoped_ids as (
  select m.player1_id as id
  from public.snooker_matches m
  join public.snooker_events e on e.id = m.event_id
  where e.start_date >= date '2019-01-01'
  union
  select m.player2_id as id
  from public.snooker_matches m
  join public.snooker_events e on e.id = m.event_id
  where e.start_date >= date '2019-01-01'
  union
  select m.winner_id as id
  from public.snooker_matches m
  join public.snooker_events e on e.id = m.event_id
  where e.start_date >= date '2019-01-01' and m.winner_id is not null
  union
  select p.id
  from public.snooker_players p
  where p.is_current_tour = true
)
select p.*
from public.snooker_players p
join scoped_ids s on s.id = p.id;

grant select on public.snooker_public_players to anon, authenticated;

delete from public.snooker_rounds r
using public.snooker_events e
where r.event_id = e.id
  and e.slug = 'betvictor-championship-league-snooker-2026-stage-one-wk1'
  and r.round_key = 'final'
  and not exists (
    select 1 from public.snooker_matches m where m.round_id = r.id
  );
