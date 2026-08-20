create or replace function public.snooker_sync_wst_tournament(p_wst_tournament_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_started timestamptz := clock_timestamp();
  v_sync_id uuid;
  v_event_id uuid;
  v_response extensions.http_response;
  v_body jsonb;
  v_match jsonb;
  v_round_key text;
  v_round_id uuid;
  v_home_name text;
  v_away_name text;
  v_p1 uuid;
  v_p2 uuid;
  v_existing_id uuid;
  v_existing_finalized timestamptz;
  v_match_id uuid;
  v_status text;
  v_score1 integer;
  v_score2 integer;
  v_source_match_id text;
  v_fetched integer := 0;
  v_changed integer := 0;
  v_unmatched integer := 0;
  v_skipped_finalized integer := 0;
begin
  select id into v_event_id from public.snooker_events where source_name='WST' and source_event_id=p_wst_tournament_id limit 1;
  if v_event_id is null then raise exception 'WST event % is not registered', p_wst_tournament_id; end if;

  insert into public.snooker_sync_runs(source_name,job_type,status,event_id,meta)
  values('WST','tournament_sync','running',v_event_id,jsonb_build_object('wst_tournament_id',p_wst_tournament_id)) returning id into v_sync_id;

  begin
    v_response := extensions.http_get('https://tournaments.snooker.web.gc.wstservices.co.uk/v2/'||p_wst_tournament_id);
    if v_response.status <> 200 then raise exception 'WST tournament HTTP %', v_response.status; end if;
    v_body := v_response.content::jsonb;

    update public.snooker_events set
      name_en=coalesce(v_body#>>'{data,attributes,name}',name_en),
      start_date=coalesce((v_body#>>'{data,attributes,startDate}')::date,start_date),
      end_date=coalesce((v_body#>>'{data,attributes,endDate}')::date,end_date),
      source_updated_at=now(),
      status=case
        when current_date < coalesce((v_body#>>'{data,attributes,startDate}')::date,start_date) then 'upcoming'
        when current_date > coalesce((v_body#>>'{data,attributes,endDate}')::date,end_date) then 'completed'
        else 'live'
      end
    where id=v_event_id;

    for v_match in select value from jsonb_array_elements(v_body#>'{data,attributes,matches}')
    loop
      v_fetched := v_fetched + 1;
      v_source_match_id := v_match->>'matchID';
      v_existing_id := null;
      v_existing_finalized := null;
      select id,realtime_finalized_at into v_existing_id,v_existing_finalized
      from public.snooker_matches where event_id=v_event_id and source_match_id=v_source_match_id limit 1;

      if v_existing_finalized is not null then
        v_skipped_finalized := v_skipped_finalized + 1;
        continue;
      end if;

      v_home_name := trim(split_part(v_match->>'name',' vs ',1));
      v_away_name := trim(split_part(v_match->>'name',' vs ',2));
      v_p1 := public.snooker_find_player_id(v_home_name);
      v_p2 := public.snooker_find_player_id(v_away_name);
      if v_p1 is null or v_p2 is null then
        v_unmatched := v_unmatched + 1;
        continue;
      end if;

      v_round_key := case v_match->>'round'
        when 'Final' then 'final'
        when 'Semi Finals' then 'semifinals'
        when 'Quarter Finals' then 'quarterfinals'
        when 'Round 2' then 'round-2'
        when 'Round 1' then 'round-1'
        when 'Wildcard Round' then 'wild-card'
        else lower(regexp_replace(v_match->>'round','[^a-zA-Z0-9]+','-','g'))
      end;
      select id into v_round_id from public.snooker_rounds where event_id=v_event_id and round_key=v_round_key;

      v_score1 := nullif(v_match->>'homePlayerScore','')::integer;
      v_score2 := nullif(v_match->>'awayPlayerScore','')::integer;
      v_status := case lower(coalesce(v_match->>'status',''))
        when 'completed' then 'completed'
        when 'live' then case when upper(coalesce(v_match->>'statusMeta',''))='INTERVAL' then 'session-break' else 'live' end
        when 'scheduled' then 'upcoming'
        else 'upcoming'
      end;

      insert into public.snooker_matches(event_id,round_id,source_match_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,winner_id,source_status,source_status_meta,source_updated_at,realtime_finalized_at)
      values(
        v_event_id,v_round_id,v_source_match_id,nullif(v_match->>'fixtureNumber','')::integer,v_p1,v_p2,v_score1,v_score2,
        nullif(v_match->>'numberOfFrames','')::integer,v_status,
        case when nullif(v_match->>'startDateTime','') is null then null else ((v_match->>'startDateTime')::timestamp at time zone 'UTC') end,
        case when v_status='completed' and v_score1 is distinct from v_score2 then case when v_score1>v_score2 then v_p1 else v_p2 end else null end,
        v_match->>'status',v_match->>'statusMeta',now(),
        case when v_existing_id is null and v_status='completed' then now() else null end
      )
      on conflict (event_id,source_match_id) do update set
        round_id=excluded.round_id,match_no=excluded.match_no,player1_id=excluded.player1_id,player2_id=excluded.player2_id,
        score1=excluded.score1,score2=excluded.score2,best_of=excluded.best_of,status=excluded.status,scheduled_at=excluded.scheduled_at,
        winner_id=excluded.winner_id,source_status=excluded.source_status,source_status_meta=excluded.source_status_meta,source_updated_at=excluded.source_updated_at;

      select id into v_match_id from public.snooker_matches where event_id=v_event_id and source_match_id=v_source_match_id;
      insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
      values('match',v_match_id,'WST',v_source_match_id,'https://www.wst.tv/match-centre/'||v_source_match_id,1.0000,'verified')
      on conflict (entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,confidence=excluded.confidence,mapping_status=excluded.mapping_status;
      v_changed := v_changed + 1;
    end loop;

    update public.snooker_sync_runs set
      status=case when v_unmatched=0 then 'success' else 'partial' end,
      finished_at=clock_timestamp(),fetched_count=v_fetched,changed_count=v_changed,
      meta=meta||jsonb_build_object('unmatched_matches',v_unmatched,'skipped_finalized',v_skipped_finalized,'latency_ms',round(extract(epoch from (clock_timestamp()-v_started))*1000))
    where id=v_sync_id;
    return jsonb_build_object('ok',true,'sync_id',v_sync_id,'fetched',v_fetched,'upserted',v_changed,'unmatched',v_unmatched,'skipped_finalized',v_skipped_finalized);
  exception when others then
    update public.snooker_sync_runs set status='failed',finished_at=clock_timestamp(),error_message=sqlerrm,meta=meta||jsonb_build_object('latency_ms',round(extract(epoch from (clock_timestamp()-v_started))*1000)) where id=v_sync_id;
    raise;
  end;
end;
$$;

create or replace function public.snooker_sync_wst_match_frames(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_source_match_id text;
  v_p1 uuid;
  v_p2 uuid;
  v_finalized_at timestamptz;
  v_response extensions.http_response;
  v_body jsonb;
  v_status jsonb;
  v_frame jsonb;
  v_home_frames integer;
  v_away_frames integer;
  v_status_text text;
  v_status_meta text;
  v_current_break integer;
  v_frame_id uuid;
  v_frame_no integer;
  v_break1 integer;
  v_break2 integer;
  v_frame_count integer := 0;
  v_completed_frames integer;
  v_query text;
begin
  select source_match_id,player1_id,player2_id,realtime_finalized_at
  into v_source_match_id,v_p1,v_p2,v_finalized_at
  from public.snooker_matches where id=p_match_id;
  if v_source_match_id is null then raise exception 'Match % has no WST source id',p_match_id; end if;
  if v_finalized_at is not null then
    return jsonb_build_object('ok',true,'skipped',true,'reason','finalized','match_id',p_match_id);
  end if;

  v_query := 'query ($matchId: ID!) { matchStatus(matchId: $matchId) { homePlayerFrames awayPlayerFrames status statusMeta currentBreak matchHistory { frames { frameNumber homePlayerPoints awayPlayerPoints homePlayerFiftyPlusBreaks awayPlayerFiftyPlusBreaks } } } }';
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

  update public.snooker_matches set
    score1=v_home_frames,score2=v_away_frames,
    status=case lower(coalesce(v_status_text,'')) when 'completed' then 'completed' when 'live' then case when upper(coalesce(v_status_meta,''))='INTERVAL' then 'session-break' else 'live' end else status end,
    winner_id=case when lower(coalesce(v_status_text,''))='completed' and v_home_frames<>v_away_frames then case when v_home_frames>v_away_frames then v_p1 else v_p2 end else winner_id end,
    source_status=v_status_text,source_status_meta=v_status_meta,current_break=v_current_break,
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

  if lower(coalesce(v_status_text,''))='completed' then
    update public.snooker_matches set realtime_finalized_at=now(),frames_complete=true where id=p_match_id;
  end if;

  return jsonb_build_object('ok',true,'match_id',p_match_id,'source_match_id',v_source_match_id,'score',jsonb_build_array(v_home_frames,v_away_frames),'frames',v_frame_count,'status',v_status_text,'status_meta',v_status_meta,'finalized',lower(coalesce(v_status_text,''))='completed');
end;
$$;

revoke all on function public.snooker_sync_wst_tournament(text) from public, anon, authenticated;
revoke all on function public.snooker_sync_wst_match_frames(uuid) from public, anon, authenticated;
grant execute on function public.snooker_sync_wst_tournament(text) to service_role;
grant execute on function public.snooker_sync_wst_match_frames(uuid) to service_role;
