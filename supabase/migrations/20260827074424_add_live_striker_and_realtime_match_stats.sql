alter table public.snooker_matches
  add column if not exists current_player_side text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'snooker_matches_current_player_side_check'
  ) then
    alter table public.snooker_matches
      add constraint snooker_matches_current_player_side_check
      check (current_player_side is null or current_player_side in ('home','away'));
  end if;
end $$;

create or replace function public.snooker_sync_wst_match_frames(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_source_match_id text;
  v_p1 uuid;
  v_p2 uuid;
  v_finalized_at timestamptz;
  v_response extensions.http_response;
  v_detail_response extensions.http_response;
  v_body jsonb;
  v_status jsonb;
  v_detail_attr jsonb;
  v_stat jsonb;
  v_frame jsonb;
  v_home_frames integer;
  v_away_frames integer;
  v_status_text text;
  v_status_meta text;
  v_current_break integer;
  v_home_player boolean;
  v_frame_id uuid;
  v_frame_no integer;
  v_break1 integer;
  v_break2 integer;
  v_frame_count integer := 0;
  v_stats_count integer := 0;
  v_completed_frames integer;
  v_query text;
  v_player uuid;
  v_side text;
  v_ast numeric;
begin
  select source_match_id,player1_id,player2_id,realtime_finalized_at
  into v_source_match_id,v_p1,v_p2,v_finalized_at
  from public.snooker_matches where id=p_match_id;
  if v_source_match_id is null then raise exception 'Match % has no WST source id',p_match_id; end if;
  if v_finalized_at is not null then
    return jsonb_build_object('ok',true,'skipped',true,'reason','finalized','match_id',p_match_id);
  end if;

  v_query := 'query ($matchId: ID!) { matchStatus(matchId: $matchId) { homePlayerFrames awayPlayerFrames status statusMeta currentBreak homePlayer matchHistory { frames { frameNumber homePlayerPoints awayPlayerPoints homePlayerFiftyPlusBreaks awayPlayerFiftyPlusBreaks } } } }';
  v_response := extensions.http_post(
    'https://snooker.graph.gc.wstservices.co.uk/graphql',
    jsonb_build_object('query',v_query,'variables',jsonb_build_object('matchId',v_source_match_id))::text,
    'application/json'
  );
  if v_response.status <> 200 then raise exception 'WST GraphQL HTTP %',v_response.status; end if;
  v_body := v_response.content::jsonb;
  if v_body ? 'errors' then raise exception 'WST GraphQL error %',v_body->'errors'; end if;
  v_status := v_body#>'{data,matchStatus}';
  if v_status is null then raise exception 'WST matchStatus empty'; end if;

  v_home_frames := coalesce((v_status->>'homePlayerFrames')::integer,0);
  v_away_frames := coalesce((v_status->>'awayPlayerFrames')::integer,0);
  v_completed_frames := v_home_frames+v_away_frames;
  v_status_text := v_status->>'status';
  v_status_meta := v_status->>'statusMeta';
  v_current_break := nullif(v_status->>'currentBreak','')::integer;
  v_home_player := case when v_status ? 'homePlayer' then (v_status->>'homePlayer')::boolean else null end;

  update public.snooker_matches set
    score1=v_home_frames,score2=v_away_frames,
    status=case lower(coalesce(v_status_text,'')) when 'completed' then 'completed' when 'live' then case when upper(coalesce(v_status_meta,''))='INTERVAL' then 'session-break' else 'live' end else status end,
    winner_id=case when lower(coalesce(v_status_text,''))='completed' and v_home_frames<>v_away_frames then case when v_home_frames>v_away_frames then v_p1 else v_p2 end else winner_id end,
    source_status=v_status_text,source_status_meta=v_status_meta,current_break=v_current_break,
    current_player_side=case when lower(coalesce(v_status_text,''))='live' and upper(coalesce(v_status_meta,''))<>'INTERVAL' and v_home_player is not null then case when v_home_player then 'home' else 'away' end else null end,
    live_frame_no=(select max((x->>'frameNumber')::integer) from jsonb_array_elements(coalesce(v_status#>'{matchHistory,frames}','[]'::jsonb)) x),
    source_updated_at=now()
  where id=p_match_id;

  for v_frame in select value from jsonb_array_elements(coalesce(v_status#>'{matchHistory,frames}','[]'::jsonb))
  loop
    v_frame_no := (v_frame->>'frameNumber')::integer;
    v_break1 := nullif(v_frame->>'homePlayerFiftyPlusBreaks','')::integer;
    v_break2 := nullif(v_frame->>'awayPlayerFiftyPlusBreaks','')::integer;
    insert into public.snooker_frames(match_id,frame_no,score1,score2,break1,break2,status,source_updated_at)
    values(p_match_id,v_frame_no,coalesce((v_frame->>'homePlayerPoints')::integer,0),coalesce((v_frame->>'awayPlayerPoints')::integer,0),case when v_break1>=50 then v_break1 end,case when v_break2>=50 then v_break2 end,case when v_frame_no>v_completed_frames and lower(coalesce(v_status_text,''))='live' then 'live' else 'completed' end,now())
    on conflict (match_id,frame_no) do update set score1=excluded.score1,score2=excluded.score2,break1=excluded.break1,break2=excluded.break2,status=excluded.status,source_updated_at=excluded.source_updated_at
    returning id into v_frame_id;

    delete from public.snooker_breaks where match_id=p_match_id and frame_no=v_frame_no and source_name='WST';
    if v_break1>=50 then insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at) values(p_match_id,v_frame_id,v_p1,v_frame_no,v_break1,'WST',now()) on conflict do nothing; end if;
    if v_break2>=50 then insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at) values(p_match_id,v_frame_id,v_p2,v_frame_no,v_break2,'WST',now()) on conflict do nothing; end if;
    v_frame_count := v_frame_count+1;
  end loop;

  begin
    v_detail_response := extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2/'||v_source_match_id);
    if v_detail_response.status = 200 then
      v_detail_attr := v_detail_response.content::jsonb#>'{data,attributes}';
      for v_stat in select value from jsonb_array_elements(coalesce(v_detail_attr#>'{history,matchData,matchPlayerStatistics,players}','[]'::jsonb))
      loop
        if coalesce((v_stat->>'homePlayer')::boolean,false) then v_player:=v_p1; v_side:='home'; else v_player:=v_p2; v_side:='away'; end if;
        v_ast:=nullif(regexp_replace(coalesce(v_stat->>'averageShotTime',''),'[^0-9.]','','g'),'')::numeric;
        insert into public.snooker_match_statistics(match_id,player_id,side,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,shots_taken,time_on_table_pct,source_name,source_updated_at,raw)
        values(p_match_id,v_player,v_side,nullif(v_stat->>'totalPoints','')::int,v_ast,nullif(v_stat->>'potRate','')::numeric,nullif(v_stat->>'fiftyPlusBreaks','')::int,nullif(v_stat->>'hundredPlusBreaks','')::int,nullif(v_stat->>'highestBreak','')::int,nullif(v_stat->>'shotsTaken','')::int,nullif(v_stat->>'timeOnTable','')::numeric,'WST',now(),v_stat)
        on conflict(match_id,player_id) do update set side=excluded.side,total_points=excluded.total_points,average_shot_time_seconds=excluded.average_shot_time_seconds,pot_rate=excluded.pot_rate,breaks_50_plus=excluded.breaks_50_plus,breaks_100_plus=excluded.breaks_100_plus,highest_break=excluded.highest_break,shots_taken=excluded.shots_taken,time_on_table_pct=excluded.time_on_table_pct,source_updated_at=excluded.source_updated_at,raw=excluded.raw,updated_at=now();
        v_stats_count := v_stats_count+1;
      end loop;
    end if;
  exception when others then
    null;
  end;

  if lower(coalesce(v_status_text,''))='completed' then
    update public.snooker_matches set realtime_finalized_at=now(),frames_complete=true,current_player_side=null where id=p_match_id;
  end if;

  return jsonb_build_object('ok',true,'match_id',p_match_id,'source_match_id',v_source_match_id,'score',jsonb_build_array(v_home_frames,v_away_frames),'frames',v_frame_count,'stats',v_stats_count,'status',v_status_text,'status_meta',v_status_meta,'current_player_side',case when lower(coalesce(v_status_text,''))='live' and upper(coalesce(v_status_meta,''))<>'INTERVAL' and v_home_player is not null then case when v_home_player then 'home' else 'away' end else null end,'finalized',lower(coalesce(v_status_text,''))='completed');
end;
$function$;
