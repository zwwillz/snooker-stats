create or replace function snooker_internal.analytics_version()
returns text language sql immutable security invoker
as $$ select '1.0.0'::text $$;

create or replace function snooker_internal.current_season()
returns text language sql stable security invoker
as $$
  select season
  from public.snooker_events
  where season ~ '^[0-9]{4}/[0-9]{2}$'
  order by split_part(season,'/',1)::int desc
  limit 1
$$;

create or replace function snooker_internal.event_family(p_name text)
returns text language sql immutable security invoker
as $$
  select case
    when p_name ilike '%6-Reds World Championship%' or p_name ilike '%6 Reds World Championship%' then 'six_reds_world_championship'
    when p_name ilike '%World Championship%' then 'world_championship'
    when p_name ilike '%UK Championship%' then 'uk_championship'
    when p_name ilike '%Shanghai Masters%' then 'shanghai_masters'
    when p_name ilike '%German Masters%' then 'german_masters'
    when p_name ilike '%Saudi Arabia%Masters%' then 'saudi_arabia_masters'
    when p_name ilike '%Hong Kong Masters%' then 'hong_kong_masters'
    when p_name ilike '%Romanian Masters%' then 'romanian_masters'
    when p_name ilike '%Turkish Masters%' then 'turkish_masters'
    when p_name ilike '%European Masters%' then 'european_masters'
    when p_name ilike '%Masters%' then 'masters'
    when p_name ilike '%Championship League%' then 'championship_league'
    when p_name ilike '%Players Championship%' then 'players_championship'
    when p_name ilike '%Tour Championship%' then 'tour_championship'
    when p_name ilike '%World Grand Prix%' then 'world_grand_prix'
    when p_name ilike '%World Open%' then 'world_open'
    when p_name ilike '%English Open%' then 'english_open'
    when p_name ilike '%British Open%' then 'british_open'
    when p_name ilike '%Northern Ireland Open%' then 'northern_ireland_open'
    when p_name ilike '%Scottish Open%' then 'scottish_open'
    when p_name ilike '%Welsh Open%' then 'welsh_open'
    when p_name ilike '%China Open%' then 'china_open'
    when p_name ilike '%International Championship%' then 'international_championship'
    when p_name ilike '%Champion of Champions%' then 'champion_of_champions'
    when p_name ilike '%Shoot Out%' then 'shoot_out'
    when p_name ilike '%Q School%' then 'q_school'
    else 'other'
  end
$$;

create or replace function snooker_internal.title_eligible(p_name text, p_event_type text, p_event_stage text)
returns boolean language sql immutable security invoker
as $$
  select case
    when coalesce(p_event_stage,'main') <> 'main' then false
    when coalesce(p_event_type,'') in ('pro_qualifier','qualifier') then false
    when p_name ilike '%Q School%' then false
    when p_name ilike '%Championship League%Winners Group%' then true
    when p_name ~* 'Championship League.*(\(Group [1-7]\)|Group (One|Two|Three|Four|Five|Six|Seven|[1-7]))' then false
    else true
  end
$$;

create or replace function snooker_internal.refresh_event_analytics(p_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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
           coalesce(m.source_status_meta,'') ilike '%walkover%' as is_walkover,
           exists(select 1 from public.snooker_frames f where f.match_id=m.id) as has_frames
    from public.snooker_matches m
    left join public.snooker_rounds r on r.id=m.round_id
    where m.event_id=p_event_id and m.status='completed' and m.player1_id is not null and m.player2_id is not null
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
$$;

create or replace function snooker_internal.rebuild_career_analytics()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_rows integer; v_version text:=snooker_internal.analytics_version();
begin
  delete from public.snooker_player_career_aggregates;
  insert into public.snooker_player_career_aggregates(
    player_id,seasons_played,first_season,last_season,event_entities_played,match_entries,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,
    walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_matches,frame_data_coverage_pct,
    breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,
    world_championship_titles,uk_championship_titles,masters_titles,data_through,aggregation_version,calculated_at
  )
  select player_id,count(*)::int,min(season),max(season),sum(event_entities_played)::int,sum(match_entries)::int,sum(matches_played)::int,
         sum(matches_won)::int,sum(matches_lost)::int,sum(matches_drawn)::int,
         case when sum(matches_played)>0 then round(100.0*sum(matches_won)/sum(matches_played),4) end,
         sum(walkovers_won)::int,sum(walkovers_lost)::int,sum(frames_won)::int,sum(frames_lost)::int,
         case when sum(frames_won)+sum(frames_lost)>0 then round(100.0*sum(frames_won)/(sum(frames_won)+sum(frames_lost)),4) end,
         sum(frame_data_matches)::int,
         case when sum(matches_played)>0 then round(100.0*sum(frame_data_matches)/sum(matches_played),4) end,
         sum(breaks_50_plus)::int,sum(breaks_100_plus)::int,sum(maximums)::int,max(highest_break),sum(finals)::int,sum(titles_total)::int,
         sum(ranking_finals)::int,sum(ranking_titles)::int,sum(triple_crown_titles)::int,sum(world_championship_titles)::int,
         sum(uk_championship_titles)::int,sum(masters_titles)::int,max(data_through),v_version,now()
  from public.snooker_player_season_aggregates
  group by player_id;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('career_players',v_rows,'version',v_version);
end
$$;

create or replace function snooker_internal.rebuild_h2h_analytics()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_rows integer; v_version text:=snooker_internal.analytics_version();
begin
  delete from public.snooker_player_h2h_aggregates;
  with mb as (
    select m.*,e.start_date,
           coalesce(m.source_status_meta,'') ilike '%walkover%' as is_walkover,
           least(m.player1_id,m.player2_id) as low_id,
           greatest(m.player1_id,m.player2_id) as high_id,
           coalesce(m.scheduled_at::date,e.start_date) as match_date
    from public.snooker_matches m
    join public.snooker_events e on e.id=m.event_id
    where m.status='completed' and m.player1_id is not null and m.player2_id is not null and m.player1_id<>m.player2_id
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
$$;

create or replace function snooker_internal.rebuild_season_analytics(
  p_season text,
  p_refresh_events boolean default true,
  p_refresh_globals boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event record; v_rows integer; v_version text:=snooker_internal.analytics_version();
  v_run_id bigint; v_events integer:=0; v_current text:=snooker_internal.current_season();
begin
  insert into snooker_internal.analytics_runs(run_type,scope_type,scope_value,aggregation_version)
  values('rebuild_season','season',p_season,v_version) returning id into v_run_id;

  if p_refresh_events then
    for v_event in select id from public.snooker_events where season=p_season order by start_date,id loop
      perform snooker_internal.refresh_event_analytics(v_event.id);
      v_events:=v_events+1;
    end loop;
  end if;

  delete from public.snooker_player_season_aggregates where season=p_season;

  with title_stats as (
    select player_id,season,
      count(*)::int titles_total,
      count(*) filter(where is_ranking_title)::int ranking_titles,
      count(*) filter(where is_triple_crown_title)::int triple_crown_titles,
      count(*) filter(where is_world_championship)::int world_titles,
      count(*) filter(where is_uk_championship)::int uk_titles,
      count(*) filter(where is_masters)::int masters_titles
    from public.snooker_player_titles where season=p_season group by player_id,season
  )
  insert into public.snooker_player_season_aggregates(
    player_id,season,season_start_year,event_entities_played,match_entries,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,
    walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_matches,frame_data_coverage_pct,
    breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,
    world_championship_titles,uk_championship_titles,masters_titles,data_through,is_final,aggregation_version,calculated_at
  )
  select a.player_id,p_season,split_part(p_season,'/',1)::smallint,count(*)::int,sum(a.match_entries)::int,sum(a.matches_played)::int,
         sum(a.matches_won)::int,sum(a.matches_lost)::int,sum(a.matches_drawn)::int,
         case when sum(a.matches_played)>0 then round(100.0*sum(a.matches_won)/sum(a.matches_played),4) end,
         sum(a.walkovers_won)::int,sum(a.walkovers_lost)::int,sum(a.frames_won)::int,sum(a.frames_lost)::int,
         case when sum(a.frames_won)+sum(a.frames_lost)>0 then round(100.0*sum(a.frames_won)/(sum(a.frames_won)+sum(a.frames_lost)),4) end,
         sum(a.frame_data_matches)::int,
         case when sum(a.matches_played)>0 then round(100.0*sum(a.frame_data_matches)/sum(a.matches_played),4) end,
         sum(a.breaks_50_plus)::int,sum(a.breaks_100_plus)::int,sum(a.maximums)::int,max(a.highest_break),
         count(*) filter(where a.is_champion or a.is_runner_up)::int,coalesce(max(ts.titles_total),0),
         count(*) filter(where (a.is_champion or a.is_runner_up) and a.event_is_ranking)::int,coalesce(max(ts.ranking_titles),0),
         coalesce(max(ts.triple_crown_titles),0),coalesce(max(ts.world_titles),0),coalesce(max(ts.uk_titles),0),coalesce(max(ts.masters_titles),0),
         max(a.data_through),p_season<>v_current,v_version,now()
  from public.snooker_player_event_aggregates a
  left join title_stats ts on ts.player_id=a.player_id and ts.season=a.season
  where a.season=p_season
  group by a.player_id;
  get diagnostics v_rows=row_count;

  if p_refresh_globals then
    perform snooker_internal.rebuild_career_analytics();
    perform snooker_internal.rebuild_h2h_analytics();
  end if;

  update snooker_internal.analytics_runs
  set status='completed',finished_at=now(),metrics=jsonb_build_object('events_refreshed',v_events,'season_players',v_rows)
  where id=v_run_id;

  return jsonb_build_object('season',p_season,'events_refreshed',v_events,'season_players',v_rows,'version',v_version);
exception when others then
  update snooker_internal.analytics_runs set status='failed',finished_at=now(),error_message=sqlerrm where id=v_run_id;
  raise;
end
$$;

create or replace function snooker_internal.analytics_audit(p_season text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_season text:=coalesce(p_season,snooker_internal.current_season());
  v_raw_matches bigint; v_agg_matches bigint; v_raw_centuries bigint; v_agg_centuries bigint;
  v_result jsonb; v_run_id bigint; v_version text:=snooker_internal.analytics_version();
begin
  select 2*count(*) into v_raw_matches
  from public.snooker_matches m join public.snooker_events e on e.id=m.event_id
  where e.season=v_season and m.status='completed' and not (coalesce(m.source_status_meta,'') ilike '%walkover%');
  select coalesce(sum(matches_played),0) into v_agg_matches from public.snooker_player_season_aggregates where season=v_season;

  select count(*) into v_raw_centuries
  from public.snooker_breaks b join public.snooker_matches m on m.id=b.match_id join public.snooker_events e on e.id=m.event_id
  where e.season=v_season and m.status='completed' and b.break_value>=100;
  select coalesce(sum(breaks_100_plus),0) into v_agg_centuries from public.snooker_player_season_aggregates where season=v_season;

  v_result:=jsonb_build_object(
    'season',v_season,
    'raw_match_participations',v_raw_matches,'aggregate_match_participations',v_agg_matches,'matches_ok',v_raw_matches=v_agg_matches,
    'raw_centuries',v_raw_centuries,'aggregate_centuries',v_agg_centuries,'centuries_ok',v_raw_centuries=v_agg_centuries,
    'version',v_version
  );
  insert into snooker_internal.analytics_runs(run_type,scope_type,scope_value,aggregation_version,status,finished_at,metrics)
  values('audit','season',v_season,v_version,case when v_raw_matches=v_agg_matches and v_raw_centuries=v_agg_centuries then 'completed' else 'mismatch' end,now(),v_result)
  returning id into v_run_id;
  return v_result || jsonb_build_object('run_id',v_run_id);
end
$$;

create or replace function snooker_internal.refresh_current_season_analytics()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_season text:=snooker_internal.current_season(); v_refresh jsonb; v_audit jsonb;
begin
  v_refresh:=snooker_internal.rebuild_season_analytics(v_season,true,true);
  v_audit:=snooker_internal.analytics_audit(v_season);
  return jsonb_build_object('refresh',v_refresh,'audit',v_audit);
end
$$;

revoke execute on function snooker_internal.analytics_version() from public, anon, authenticated;
revoke execute on function snooker_internal.current_season() from public, anon, authenticated;
revoke execute on function snooker_internal.event_family(text) from public, anon, authenticated;
revoke execute on function snooker_internal.title_eligible(text,text,text) from public, anon, authenticated;
revoke execute on function snooker_internal.refresh_event_analytics(uuid) from public, anon, authenticated;
revoke execute on function snooker_internal.rebuild_career_analytics() from public, anon, authenticated;
revoke execute on function snooker_internal.rebuild_h2h_analytics() from public, anon, authenticated;
revoke execute on function snooker_internal.rebuild_season_analytics(text,boolean,boolean) from public, anon, authenticated;
revoke execute on function snooker_internal.analytics_audit(text) from public, anon, authenticated;
revoke execute on function snooker_internal.refresh_current_season_analytics() from public, anon, authenticated;
