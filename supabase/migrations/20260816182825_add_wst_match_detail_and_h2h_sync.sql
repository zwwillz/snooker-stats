create or replace function public.snooker_backfill_wst_match_detail(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_source_match_id text;
  v_p1 uuid;
  v_p2 uuid;
  v_status text;
  v_response extensions.http_response;
  v_body jsonb;
  v_attr jsonb;
  v_history jsonb;
  v_frame jsonb;
  v_stat jsonb;
  v_season jsonb;
  v_frame_id uuid;
  v_frame_no int;
  v_break1 int;
  v_break2 int;
  v_frames int := 0;
  v_stats int := 0;
  v_player uuid;
  v_side text;
  v_ast numeric;
begin
  select source_match_id, player1_id, player2_id, status
    into v_source_match_id, v_p1, v_p2, v_status
  from public.snooker_matches where id=p_match_id;
  if v_source_match_id is null then
    return jsonb_build_object('ok',false,'match_id',p_match_id,'reason','missing_source_match_id');
  end if;

  v_response := extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2/'||v_source_match_id);
  if v_response.status <> 200 then raise exception 'WST match detail HTTP %',v_response.status; end if;
  v_body := v_response.content::jsonb;
  v_attr := v_body#>'{data,attributes}';
  v_history := v_attr#>'{history,matchData}';

  update public.snooker_matches set
    score1=coalesce(nullif(v_attr->>'homePlayerScore','')::int,score1),
    score2=coalesce(nullif(v_attr->>'awayPlayerScore','')::int,score2),
    source_status=coalesce(v_attr->>'status',source_status),
    source_status_meta=coalesce(v_attr->>'statusMeta',source_status_meta),
    source_updated_at=now()
  where id=p_match_id;

  for v_frame in select value from jsonb_array_elements(coalesce(v_history#>'{matchHistory,frames}','[]'::jsonb))
  loop
    v_frame_no := (v_frame->>'frameNumber')::int;
    v_break1 := nullif(v_frame->>'homePlayerFiftyPlusBreaks','')::int;
    v_break2 := nullif(v_frame->>'awayPlayerFiftyPlusBreaks','')::int;
    insert into public.snooker_frames(match_id,frame_no,score1,score2,break1,break2,status,source_updated_at)
    values(p_match_id,v_frame_no,coalesce((v_frame->>'homePlayerPoints')::int,0),coalesce((v_frame->>'awayPlayerPoints')::int,0),case when v_break1>=50 then v_break1 end,case when v_break2>=50 then v_break2 end,'completed',now())
    on conflict(match_id,frame_no) do update set score1=excluded.score1,score2=excluded.score2,break1=excluded.break1,break2=excluded.break2,status=excluded.status,source_updated_at=excluded.source_updated_at,updated_at=now()
    returning id into v_frame_id;

    delete from public.snooker_breaks where match_id=p_match_id and frame_no=v_frame_no and source_name='WST';
    if v_break1>=50 then
      insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,is_century,is_maximum,source_name,source_updated_at)
      values(p_match_id,v_frame_id,v_p1,v_frame_no,v_break1,v_break1>=100,v_break1=147,'WST',now()) on conflict do nothing;
    end if;
    if v_break2>=50 then
      insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,is_century,is_maximum,source_name,source_updated_at)
      values(p_match_id,v_frame_id,v_p2,v_frame_no,v_break2,v_break2>=100,v_break2=147,'WST',now()) on conflict do nothing;
    end if;
    v_frames := v_frames+1;
  end loop;

  for v_stat in select value from jsonb_array_elements(coalesce(v_history#>'{matchPlayerStatistics,players}','[]'::jsonb))
  loop
    if coalesce((v_stat->>'homePlayer')::boolean,false) then v_player:=v_p1; v_side:='home'; else v_player:=v_p2; v_side:='away'; end if;
    v_ast := nullif(regexp_replace(coalesce(v_stat->>'averageShotTime',''),'[^0-9.]','','g'),'')::numeric;
    insert into public.snooker_match_statistics(match_id,player_id,side,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,shots_taken,time_on_table_pct,source_name,source_updated_at,raw)
    values(p_match_id,v_player,v_side,nullif(v_stat->>'totalPoints','')::int,v_ast,nullif(v_stat->>'potRate','')::numeric,nullif(v_stat->>'fiftyPlusBreaks','')::int,nullif(v_stat->>'hundredPlusBreaks','')::int,nullif(v_stat->>'highestBreak','')::int,nullif(v_stat->>'shotsTaken','')::int,nullif(v_stat->>'timeOnTable','')::numeric,'WST',now(),v_stat)
    on conflict(match_id,player_id) do update set side=excluded.side,total_points=excluded.total_points,average_shot_time_seconds=excluded.average_shot_time_seconds,pot_rate=excluded.pot_rate,breaks_50_plus=excluded.breaks_50_plus,breaks_100_plus=excluded.breaks_100_plus,highest_break=excluded.highest_break,shots_taken=excluded.shots_taken,time_on_table_pct=excluded.time_on_table_pct,source_updated_at=excluded.source_updated_at,raw=excluded.raw,updated_at=now();
    v_stats := v_stats+1;
  end loop;

  for v_season in
    select v_p1 as pid, value as row from jsonb_array_elements(coalesce(v_attr#>'{homePlayer,seasonStats}','[]'::jsonb))
    union all
    select v_p2 as pid, value as row from jsonb_array_elements(coalesce(v_attr#>'{awayPlayer,seasonStats}','[]'::jsonb))
  loop
    insert into public.snooker_player_season_stats(player_id,season_start_year,season_label,ranking,tournaments_won,points_scored,matches_played,matches_won,match_win_rate,average_shot_time,breaks_50_plus,breaks_100_plus,highest_break,season_147s,average_break,is_final,source_name,source_updated_at,raw)
    values(
      (v_season->>'pid')::uuid,
      ((v_season->'row'->>'season')::int)::smallint,
      (v_season->'row'->>'season')||'/'||right(((v_season->'row'->>'season')::int+1)::text,2),
      nullif(v_season->'row'->>'ranking','')::int,
      coalesce(nullif(v_season->'row'->>'tournamentsWon','')::int,0),
      nullif(v_season->'row'->>'pointsScored','')::bigint,
      nullif(v_season->'row'->>'matchesPlayed','')::int,
      nullif(v_season->'row'->>'matchesWon','')::int,
      case when coalesce(nullif(v_season->'row'->>'matchesPlayed','')::int,0)>0 then round(100.0*coalesce(nullif(v_season->'row'->>'matchesWon','')::int,0)/nullif((v_season->'row'->>'matchesPlayed')::numeric,0),2) end,
      nullif(v_season->'row'->>'avgShotTime','')::numeric,
      nullif(v_season->'row'->>'fiftyPlusBreaks','')::int,
      nullif(v_season->'row'->>'hundredPlusBreaks','')::int,
      nullif(v_season->'row'->>'highestBreak','')::int,
      nullif(v_season->'row'->>'maxBreaks','')::int,
      nullif(v_season->'row'->>'avgBreak','')::numeric,
      false,'WST',now(),v_season->'row')
    on conflict(player_id,season_start_year) do update set ranking=excluded.ranking,tournaments_won=excluded.tournaments_won,points_scored=excluded.points_scored,matches_played=excluded.matches_played,matches_won=excluded.matches_won,match_win_rate=excluded.match_win_rate,average_shot_time=excluded.average_shot_time,breaks_50_plus=excluded.breaks_50_plus,breaks_100_plus=excluded.breaks_100_plus,highest_break=excluded.highest_break,season_147s=excluded.season_147s,average_break=excluded.average_break,source_name='WST',source_updated_at=excluded.source_updated_at,raw=excluded.raw,updated_at=now();
  end loop;

  if lower(coalesce(v_attr->>'status',''))='completed' then
    update public.snooker_matches set
      winner_id=case when coalesce((v_attr->>'homePlayerScore')::int,0)>coalesce((v_attr->>'awayPlayerScore')::int,0) then v_p1 else v_p2 end,
      frames_complete=(v_frames>0),
      realtime_finalized_at=coalesce(realtime_finalized_at,now()),
      updated_at=now()
    where id=p_match_id;
  end if;

  return jsonb_build_object('ok',true,'match_id',p_match_id,'frames',v_frames,'stats',v_stats,'source_match_id',v_source_match_id);
end;
$$;

create or replace function public.snooker_refresh_match_h2h(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_p1 uuid; v_p2 uuid; v_scheduled timestamptz;
  v_wst1 text; v_wst2 text;
  v_r1 extensions.http_response; v_r2 extensions.http_response;
  v_rows jsonb;
  v_meetings int:=0; v_w1 int:=0; v_w2 int:=0; v_f1 int:=0; v_f2 int:=0;
  v_recent jsonb:='[]'::jsonb;
begin
  select player1_id,player2_id,scheduled_at into v_p1,v_p2,v_scheduled from snooker_matches where id=p_match_id;
  select source_id into v_wst1 from snooker_source_entity_map where entity_type='player' and entity_id=v_p1 and source_name='WST' limit 1;
  select source_id into v_wst2 from snooker_source_entity_map where entity_type='player' and entity_id=v_p2 and source_name='WST' limit 1;
  if v_wst1 is null or v_wst2 is null then return jsonb_build_object('ok',false,'reason','missing_player_wst_id'); end if;

  v_r1:=extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2?page.size=200&sort=desc&filter=homePlayerID:eq:'||v_wst1);
  v_r2:=extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2?page.size=200&sort=desc&filter=awayPlayerID:eq:'||v_wst1);
  if v_r1.status<>200 or v_r2.status<>200 then raise exception 'WST H2H HTTP %, %',v_r1.status,v_r2.status; end if;
  v_rows:=coalesce(v_r1.content::jsonb->'data','[]'::jsonb)||coalesce(v_r2.content::jsonb->'data','[]'::jsonb);

  with all_rows as (
    select x->'attributes' a from jsonb_array_elements(v_rows) x
  ), pair_rows as (
    select a,
      a->>'homePlayerID' home_id,a->>'awayPlayerID' away_id,
      coalesce(nullif(a->>'homePlayerScore','')::int,0) hs,
      coalesce(nullif(a->>'awayPlayerScore','')::int,0) ascore,
      nullif(a->>'startDateTime','')::timestamp start_ts
    from all_rows
    where lower(coalesce(a->>'status',''))='completed'
      and ((a->>'homePlayerID'=v_wst1 and a->>'awayPlayerID'=v_wst2) or (a->>'homePlayerID'=v_wst2 and a->>'awayPlayerID'=v_wst1))
      and (v_scheduled is null or nullif(a->>'startDateTime','')::timestamp < (v_scheduled at time zone 'UTC'))
  )
  select count(*),
    count(*) filter(where (home_id=v_wst1 and hs>ascore) or (away_id=v_wst1 and ascore>hs)),
    count(*) filter(where (home_id=v_wst2 and hs>ascore) or (away_id=v_wst2 and ascore>hs)),
    coalesce(sum(case when home_id=v_wst1 then hs else ascore end),0),
    coalesce(sum(case when home_id=v_wst2 then hs else ascore end),0)
  into v_meetings,v_w1,v_w2,v_f1,v_f2 from pair_rows;

  with all_rows as (
    select x->'attributes' a from jsonb_array_elements(v_rows) x
  ), pair_rows as (
    select a,
      nullif(a->>'startDateTime','')::timestamp start_ts
    from all_rows
    where lower(coalesce(a->>'status',''))='completed'
      and ((a->>'homePlayerID'=v_wst1 and a->>'awayPlayerID'=v_wst2) or (a->>'homePlayerID'=v_wst2 and a->>'awayPlayerID'=v_wst1))
      and (v_scheduled is null or nullif(a->>'startDateTime','')::timestamp < (v_scheduled at time zone 'UTC'))
    order by start_ts desc nulls last limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',a->>'startDateTime','tournament',a#>>'{tournament,name}','round',a->>'round',
    'homePlayerId',a->>'homePlayerID','awayPlayerId',a->>'awayPlayerID',
    'homePlayerName',a#>>'{homePlayer,firstName}'||' '||a#>>'{homePlayer,surname}',
    'awayPlayerName',a#>>'{awayPlayer,firstName}'||' '||a#>>'{awayPlayer,surname}',
    'homeScore',nullif(a->>'homePlayerScore','')::int,'awayScore',nullif(a->>'awayPlayerScore','')::int
  ) order by start_ts desc),'[]'::jsonb) into v_recent from pair_rows;

  insert into public.snooker_match_head_to_head(match_id,player1_id,player2_id,meetings_before,player1_wins,player2_wins,player1_frames,player2_frames,recent_meetings,source_name,source_updated_at)
  values(p_match_id,v_p1,v_p2,v_meetings,v_w1,v_w2,v_f1,v_f2,v_recent,'WST',now())
  on conflict(match_id) do update set player1_id=excluded.player1_id,player2_id=excluded.player2_id,meetings_before=excluded.meetings_before,player1_wins=excluded.player1_wins,player2_wins=excluded.player2_wins,player1_frames=excluded.player1_frames,player2_frames=excluded.player2_frames,recent_meetings=excluded.recent_meetings,source_updated_at=excluded.source_updated_at,updated_at=now();
  return jsonb_build_object('ok',true,'match_id',p_match_id,'meetings',v_meetings,'player1_wins',v_w1,'player2_wins',v_w2);
end;
$$;

revoke all on function public.snooker_backfill_wst_match_detail(uuid) from public,anon,authenticated;
revoke all on function public.snooker_refresh_match_h2h(uuid) from public,anon,authenticated;
grant execute on function public.snooker_backfill_wst_match_detail(uuid) to service_role;
grant execute on function public.snooker_refresh_match_h2h(uuid) to service_role;
