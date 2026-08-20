alter table public.snooker_player_career_aggregates
  add column if not exists warehouse_start_season text,
  add column if not exists warehouse_end_season text,
  add column if not exists is_career_complete boolean not null default false;

create or replace function snooker_internal.rebuild_career_analytics()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rows integer; v_version text:=snooker_internal.analytics_version();
  v_start text; v_end text; v_start_year integer;
begin
  select season into v_start from public.snooker_events where season ~ '^[0-9]{4}/[0-9]{2}$' order by split_part(season,'/',1)::int asc limit 1;
  select season into v_end from public.snooker_events where season ~ '^[0-9]{4}/[0-9]{2}$' order by split_part(season,'/',1)::int desc limit 1;
  v_start_year:=split_part(v_start,'/',1)::int;

  delete from public.snooker_player_career_aggregates;
  insert into public.snooker_player_career_aggregates(
    player_id,seasons_played,first_season,last_season,event_entities_played,match_entries,matches_played,matches_won,matches_lost,matches_drawn,match_win_rate,
    walkovers_won,walkovers_lost,frames_won,frames_lost,frame_win_rate,frame_data_matches,frame_data_coverage_pct,
    breaks_50_plus,breaks_100_plus,maximums,highest_break,finals,titles_total,ranking_finals,ranking_titles,triple_crown_titles,
    world_championship_titles,uk_championship_titles,masters_titles,data_through,aggregation_version,calculated_at,
    warehouse_start_season,warehouse_end_season,is_career_complete
  )
  select s.player_id,count(*)::int,min(s.season),max(s.season),sum(s.event_entities_played)::int,sum(s.match_entries)::int,sum(s.matches_played)::int,
         sum(s.matches_won)::int,sum(s.matches_lost)::int,sum(s.matches_drawn)::int,
         case when sum(s.matches_played)>0 then round(100.0*sum(s.matches_won)/sum(s.matches_played),4) end,
         sum(s.walkovers_won)::int,sum(s.walkovers_lost)::int,sum(s.frames_won)::int,sum(s.frames_lost)::int,
         case when sum(s.frames_won)+sum(s.frames_lost)>0 then round(100.0*sum(s.frames_won)/(sum(s.frames_won)+sum(s.frames_lost)),4) end,
         sum(s.frame_data_matches)::int,
         case when sum(s.matches_played)>0 then round(100.0*sum(s.frame_data_matches)/sum(s.matches_played),4) end,
         sum(s.breaks_50_plus)::int,sum(s.breaks_100_plus)::int,sum(s.maximums)::int,max(s.highest_break),sum(s.finals)::int,sum(s.titles_total)::int,
         sum(s.ranking_finals)::int,sum(s.ranking_titles)::int,sum(s.triple_crown_titles)::int,sum(s.world_championship_titles)::int,
         sum(s.uk_championship_titles)::int,sum(s.masters_titles)::int,max(s.data_through),v_version,now(),
         v_start,v_end,
         coalesce(p.turned_pro>=v_start_year,false)
  from public.snooker_player_season_aggregates s
  join public.snooker_players p on p.id=s.player_id
  group by s.player_id,p.turned_pro;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('career_players',v_rows,'version',v_version,'warehouse_start_season',v_start,'warehouse_end_season',v_end);
end
$$;

create or replace function snooker_internal.finalize_historical_season(p_season text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_refresh jsonb; v_audit jsonb;
begin
  if p_season = snooker_internal.current_season() then
    raise exception 'Use refresh_current_season_analytics for current season %',p_season;
  end if;
  v_refresh:=snooker_internal.rebuild_season_analytics(p_season,true,true);
  v_audit:=snooker_internal.analytics_audit(p_season);
  return jsonb_build_object('refresh',v_refresh,'audit',v_audit);
end
$$;
revoke execute on function snooker_internal.finalize_historical_season(text) from public,anon,authenticated;
