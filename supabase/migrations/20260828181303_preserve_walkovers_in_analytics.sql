create or replace function snooker_internal.refresh_event_analytics(p_event_id uuid)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_event public.snooker_events%rowtype;
  v_version text := snooker_internal.analytics_version();
  v_rows integer := 0;
  v_titles integer := 0;
begin
  select * into v_event from public.snooker_events where id=p_event_id;
  if not found then
    raise exception 'event not found: %', p_event_id;
  end if;

  delete from public.snooker_player_titles where event_id=p_event_id;
  delete from public.snooker_player_event_aggregates where event_id=p_event_id;

  with match_base as (
    select m.id,m.match_no,m.player1_id,m.player2_id,m.score1,m.score2,m.winner_id,m.scheduled_at,
           r.label_en,r.label_zh,
           (m.status='walkover' or coalesce(m.source_status_meta,'') ilike '%walkover%') as is_walkover,
           exists(select 1 from public.snooker_frames f where f.match_id=m.id) as has_frames
    from public.snooker_matches m
    left join public.snooker_rounds r on r.id=m.round_id
    where m.event_id=p_event_id and m.status in ('completed','walkover') and m.player1_id is not null and m.player2_id is not null
  ), participants as (
    select id as match_id,match_no,player1_id as player_id,player2_id as opponent_id,score1 as frames_for,score2 as frames_against,
           winner_id,scheduled_at,label_en,label_zh,is_walkover,has_frames
    from match_base
    union all
    select id,match_no,player2_id,player1_id,score2,score1,winner_id,scheduled_at,label_en,label_zh,is_walkover,has_frames
    from match_base
  ), summary as (
    select player_id,
           count(*) as match_entries,
           count(*) filter(where not is_walkover) as matches_played,
           count(*) filter(where not is_walkover and winner_id=player_id) as matches_won,
           count(*) filter(where not is_walkover and winner_id is not null and winner_id<>player_id) as matches_lost,
           count(*) filter(where not is_walkover and winner_id is null and frames_for=frames_against) as matches_drawn,
           count(*) filter(where is_walkover and winner_id=player_id) as walkovers_won,
           count(*) filter(where is_walkover and winner_id is not null and winner_id<>player_id) as walkovers_lost,
           coalesce(sum(frames_for) filter(where not is_walkover),0)::int as frames_won,
           coalesce(sum(frames_against) filter(where not is_walkover),0)::int as frames_lost,
           count(*) filter(where not is_walkover and has_frames) as frame_data_matches,
           max(coalesce(scheduled_at::date,v_event.start_date)) as data_through
    from participants group by player_id
  ), break_stats as (
    select b.player_id,
           count(*) filter(where b.break_value>=50)::int as breaks_50_plus,
           count(*) filter(where b.break_value>=100)::int as breaks_100_plus,
           count(*) filter(where b.break_value=147)::int as maximums,
           max(b.break_value)::int as highest_break
    from public.snooker_breaks b
    join public.snooker_matches m on m.id=b.match_id
    where m.event_id=p_event_id and m.status='completed'
    group by b.player_id
  ), last_round as (
    select distinct on (player_id) player_id,label_en,label_zh
    from participants
    order by player_id,match_no desc nulls last,scheduled_at desc nulls last
  ), final_match as (
    select mb.*
    from match_base mb
    where lower(trim(coalesce(mb.label_en,''))) in ('final','the final')
       or lower(trim(coalesce(mb.label_zh,''))) in ('决赛','final')
    order by mb.scheduled_at desc nulls last,mb.match_no desc nulls last
    limit 1
  )
  insert into public.snooker_player_event_aggregates(
    event_id,player_id,season,event_family,event_is_ranking,is_triple_crown_event,
    match_entries,matches_played,matches_won,matches_lost,matches_drawn,walkovers_won,walkovers_lost,
    frames_won,frames_lost,frame_win_rate,frame_data_matches,frame_data_coverage_pct,
    breaks_50_plus,breaks_100_plus,maximums,highest_break,is_champion,is_runner_up,
    last_recorded_round_en,last_recorded_round_zh,data_through,aggregation_version,calculated_at
  )
  select p_event_id,s.player_id,v_event.season,snooker_internal.event_family(v_event.name_en),coalesce(v_event.ranking_event,false),
         snooker_internal.event_family(v_event.name_en) in ('world_championship','uk_championship','masters'),
         s.match_entries,s.matches_played,s.matches_won,s.matches_lost,s.matches_drawn,s.walkovers_won,s.walkovers_lost,
         s.frames_won,s.frames_lost,
         case when s.frames_won+s.frames_lost>0 then round(100.0*s.frames_won/(s.frames_won+s.frames_lost),4) end,
         s.frame_data_matches,
         case when s.matches_played>0 then round(100.0*s.frame_data_matches/s.matches_played,4) end,
         coalesce(bs.breaks_50_plus,0),coalesce(bs.breaks_100_plus,0),coalesce(bs.maximums,0),bs.highest_break,
         coalesce(fm.winner_id=s.player_id,false),
         coalesce(fm.winner_id is not null and (case when fm.winner_id=fm.player1_id then fm.player2_id else fm.player1_id end)=s.player_id,false),
         lr.label_en,lr.label_zh,s.data_through,v_version,now()
  from summary s
  left join break_stats bs on bs.player_id=s.player_id
  left join last_round lr on lr.player_id=s.player_id
  left join final_match fm on true;
  get diagnostics v_rows = row_count;

  if snooker_internal.title_eligible(v_event.name_en,v_event.event_type,v_event.event_stage) then
    insert into public.snooker_player_titles(
      event_id,player_id,season,title_date,event_family,event_type,is_ranking_title,is_triple_crown_title,
      is_world_championship,is_uk_championship,is_masters,aggregation_version,calculated_at
    )
    select a.event_id,a.player_id,a.season,v_event.end_date,a.event_family,v_event.event_type,a.event_is_ranking,a.is_triple_crown_event,
           a.event_family='world_championship',a.event_family='uk_championship',a.event_family='masters',v_version,now()
    from public.snooker_player_event_aggregates a
    where a.event_id=p_event_id and a.is_champion;
    get diagnostics v_titles = row_count;
  end if;

  return jsonb_build_object('event_id',p_event_id,'players',v_rows,'titles',v_titles,'version',v_version);
end
$function$;

create or replace function snooker_internal.rebuild_h2h_analytics()
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare v_rows integer; v_version text:=snooker_internal.analytics_version();
begin
  delete from public.snooker_player_h2h_aggregates;
  with mb as (
    select m.*,e.start_date,
           (m.status='walkover' or coalesce(m.source_status_meta,'') ilike '%walkover%') as is_walkover,
           least(m.player1_id,m.player2_id) as low_id,
           greatest(m.player1_id,m.player2_id) as high_id,
           coalesce(m.scheduled_at::date,e.start_date) as match_date
    from public.snooker_matches m
    join public.snooker_events e on e.id=m.event_id
    where m.status in ('completed','walkover') and m.player1_id is not null and m.player2_id is not null and m.player1_id<>m.player2_id
  )
  insert into public.snooker_player_h2h_aggregates(
    player_low_id,player_high_id,match_records,meetings_played,player_low_wins,player_high_wins,draws,
    player_low_walkovers,player_high_walkovers,player_low_frames,player_high_frames,first_meeting_date,last_meeting_date,
    aggregation_version,calculated_at
  )
  select low_id,high_id,count(*)::int,count(*) filter(where not is_walkover)::int,
         count(*) filter(where not is_walkover and winner_id=low_id)::int,
         count(*) filter(where not is_walkover and winner_id=high_id)::int,
         count(*) filter(where not is_walkover and winner_id is null and score1=score2)::int,
         count(*) filter(where is_walkover and winner_id=low_id)::int,
         count(*) filter(where is_walkover and winner_id=high_id)::int,
         coalesce(sum(case when not is_walkover then case when player1_id=low_id then score1 else score2 end else 0 end),0)::int,
         coalesce(sum(case when not is_walkover then case when player1_id=high_id then score1 else score2 end else 0 end),0)::int,
         min(match_date) filter(where not is_walkover),max(match_date) filter(where not is_walkover),v_version,now()
  from mb group by low_id,high_id;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('h2h_pairs',v_rows,'version',v_version);
end
$function$;

select snooker_internal.refresh_event_analytics(id)
from public.snooker_events
where slug='wuhan-open-2026';

select snooker_internal.rebuild_season_analytics('2026/27',false,true);
