create or replace function public.snooker_homepage_bootstrap_v1(
  p_season text,
  p_season_start_year integer
)
returns jsonb
language sql
stable
set search_path = 'public', 'pg_catalog'
as $$
with params as (
  select p_season as season,
         p_season_start_year as season_start_year,
         timezone('Asia/Shanghai', now())::date as today,
         now() as ts_now
),
events as (
  select e.id,e.slug,e.season,e.name_en,e.name_zh,e.sponsor_name,e.type_zh,
         e.event_type,e.event_stage,e.ranking_status,e.start_date,e.end_date,
         e.country_zh,e.city_zh,e.venue_zh,e.venue_en,e.winner_prize,e.runner_up_prize,
         e.source_name,e.source_event_id,e.source_url,e.source_updated_at,e.referee_zh,e.data_ready
  from public.snooker_events e, params p
  where e.season = p.season
  order by e.start_date, e.stage_order nulls first, e.name_en
),
ready as (select * from events where data_ready),
focus_ids as (
  select r.id from ready r, params p where r.start_date <= p.today and r.end_date >= p.today
  union select id from (select r.id from ready r, params p where r.end_date < p.today order by r.end_date desc limit 1) completed
  union select id from (select r.id from ready r, params p where r.start_date > p.today order by r.start_date asc limit 1) upcoming
),
rounds_all as (
  select r.id,r.event_id,r.round_key,r.label_en,r.label_zh,r.sort_order,r.best_of,r.loser_prize
  from public.snooker_rounds r where r.event_id in (select id from focus_ids)
),
matches as (
  select m.id,m.event_id,m.round_id,m.match_no,m.player1_id,m.player2_id,
         m.score1,m.score2,m.best_of,m.status,m.scheduled_at,m.session_label_zh,
         m.winner_id,m.note,m.source_updated_at,m.completed_detected_at,
         m.current_player_side,m.current_break,m.live_frame_no
  from public.snooker_matches m, params p
  where m.event_id in (select id from focus_ids)
    and (
      m.status in ('live','session-break')
      or (m.status = 'upcoming' and m.scheduled_at between p.ts_now - interval '15 minutes' and p.ts_now + interval '3 days')
      or (m.status in ('completed','walkover') and coalesce(m.completed_detected_at,m.source_updated_at) >= p.ts_now - interval '2 hours')
    )
  order by m.scheduled_at nulls last,m.match_no
),
rounds as (select r.* from rounds_all r where r.id in (select distinct round_id from matches where round_id is not null)),
ranking as (
  select player_id,source_player_name,rank,points,ranking_money,previous_rank,rank_change,captured_at,source_name,source_url
  from public.snooker_latest_rankings where list_key='world_official' order by rank asc limit 16
),
leader_rows as (
  (select 'maximums'::text metric,s.player_id,s.season_label,s.ranking,s.matches_played,s.match_win_rate,s.average_shot_time,s.breaks_100_plus,s.season_147s
   from public.snooker_player_season_stats s,params p where s.season_start_year=p.season_start_year and s.season_147s>0
   order by s.season_147s desc,s.ranking asc nulls last limit 1)
  union all
  (select 'centuries',s.player_id,s.season_label,s.ranking,s.matches_played,s.match_win_rate,s.average_shot_time,s.breaks_100_plus,s.season_147s
   from public.snooker_player_season_stats s,params p where s.season_start_year=p.season_start_year
   order by s.breaks_100_plus desc nulls last,s.ranking asc nulls last limit 1)
  union all
  (select 'win_rate',s.player_id,s.season_label,s.ranking,s.matches_played,s.match_win_rate,s.average_shot_time,s.breaks_100_plus,s.season_147s
   from public.snooker_player_season_stats s,params p where s.season_start_year=p.season_start_year and s.matches_played>=5 and s.match_win_rate is not null
   order by s.match_win_rate desc,s.matches_played desc limit 1)
  union all
  (select 'shot_time',s.player_id,s.season_label,s.ranking,s.matches_played,s.match_win_rate,s.average_shot_time,s.breaks_100_plus,s.season_147s
   from public.snooker_player_season_stats s,params p where s.season_start_year=p.season_start_year and s.matches_played>=5 and s.average_shot_time>0
   order by s.average_shot_time asc limit 1)
),
compare_ids as (select player_id from ranking order by rank limit 2),
player_ids as (
  select player1_id id from matches
  union select player2_id from matches
  union select player_id from ranking
  union select player_id from leader_rows
  union select player_id from compare_ids
),
players as (
  select p.id,p.slug,p.name_en,p.name_zh,p.short_name_en,p.short_name_zh,p.nationality_zh,p.country_code,
         p.date_of_birth,p.turned_pro,p.current_rank,p.ranking_points,p.avatar_url,p.profile_source,
         p.is_current_tour,p.tour_status,p.player_status
  from public.snooker_public_players p where p.id in (select id from player_ids)
),
season_stats as (
  select s.player_id,s.season_start_year,s.season_label,s.ranking,s.tournaments_won,s.points_scored,
         s.matches_played,s.matches_won,s.match_win_rate,s.average_shot_time,s.breaks_50_plus,
         s.breaks_100_plus,s.highest_break,s.season_147s,s.average_break
  from public.snooker_player_season_stats s,params p
  where s.season_start_year=p.season_start_year and s.player_id in (select id from player_ids)
),
compare_season as (
  select a.player_id,a.season,a.season_start_year,a.matches_played,a.matches_won,a.matches_lost,
         a.match_win_rate,a.frames_won,a.frames_lost,a.frame_win_rate,a.frame_data_coverage_pct,
         a.breaks_100_plus,a.calculated_at
  from public.snooker_player_season_aggregates a,params p
  where a.season_start_year=p.season_start_year and a.player_id in (select player_id from compare_ids)
),
h2h as (
  select h.player_low_id,h.player_high_id,h.match_records,h.meetings_played,h.player_low_wins,h.player_high_wins,
         h.draws,h.player_low_walkovers,h.player_high_walkovers,h.player_low_frames,h.player_high_frames,
         h.first_meeting_date,h.last_meeting_date,h.calculated_at
  from public.snooker_player_h2h_aggregates h
  where h.player_low_id in (select player_id from compare_ids) and h.player_high_id in (select player_id from compare_ids)
  limit 1
)
select jsonb_build_object(
  'season',p_season,
  'season_start_year',p_season_start_year,
  'generated_at',now(),
  'events',coalesce((select jsonb_agg(to_jsonb(events)) from events),'[]'::jsonb),
  'rounds',coalesce((select jsonb_agg(to_jsonb(rounds)) from rounds),'[]'::jsonb),
  'matches',coalesce((select jsonb_agg(to_jsonb(matches)) from matches),'[]'::jsonb),
  'ranking',coalesce((select jsonb_agg(to_jsonb(ranking)) from ranking),'[]'::jsonb),
  'leaders',coalesce((select jsonb_agg(to_jsonb(leader_rows)) from leader_rows),'[]'::jsonb),
  'players',coalesce((select jsonb_agg(to_jsonb(players)) from players),'[]'::jsonb),
  'season_stats',coalesce((select jsonb_agg(to_jsonb(season_stats)) from season_stats),'[]'::jsonb),
  'compare_season',coalesce((select jsonb_agg(to_jsonb(compare_season)) from compare_season),'[]'::jsonb),
  'h2h',coalesce((select jsonb_agg(to_jsonb(h2h)) from h2h),'[]'::jsonb)
);
$$;

grant execute on function public.snooker_homepage_bootstrap_v1(text, integer) to anon, authenticated;
