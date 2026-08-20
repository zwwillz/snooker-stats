create or replace function public.snooker_refresh_match_h2h(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_p1 uuid; v_p2 uuid; v_scheduled timestamptz; v_wst1 text; v_wst2 text;
  v_r1 extensions.http_response; v_r2 extensions.http_response; v_rows jsonb;
  v_meetings int:=0; v_w1 int:=0; v_w2 int:=0; v_f1 int:=0; v_f2 int:=0; v_recent jsonb:='[]'::jsonb;
begin
  select player1_id,player2_id,scheduled_at into v_p1,v_p2,v_scheduled from public.snooker_matches where id=p_match_id;
  select source_id into v_wst1 from public.snooker_source_entity_map where entity_type='player' and entity_id=v_p1 and source_name='WST' limit 1;
  select source_id into v_wst2 from public.snooker_source_entity_map where entity_type='player' and entity_id=v_p2 and source_name='WST' limit 1;
  if v_wst1 is null or v_wst2 is null then return jsonb_build_object('ok',false,'reason','missing_player_wst_id'); end if;
  v_r1:=extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2?page.size=200&sort=desc&filter=homePlayerID:eq:'||v_wst1);
  v_r2:=extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2?page.size=200&sort=desc&filter=awayPlayerID:eq:'||v_wst1);
  if v_r1.status<>200 or v_r2.status<>200 then raise exception 'WST H2H HTTP %, %',v_r1.status,v_r2.status; end if;
  v_rows:=coalesce(v_r1.content::jsonb->'data','[]'::jsonb)||coalesce(v_r2.content::jsonb->'data','[]'::jsonb);

  with pair_rows as (
    select x->'attributes' a,
      x#>>'{attributes,homePlayerID}' home_id,
      x#>>'{attributes,awayPlayerID}' away_id,
      coalesce(nullif(x#>>'{attributes,homePlayerScore}','')::int,0) hs,
      coalesce(nullif(x#>>'{attributes,awayPlayerScore}','')::int,0) ascore,
      nullif(x#>>'{attributes,startDateTime}','')::timestamp start_ts
    from jsonb_array_elements(v_rows) x
    where lower(coalesce(x#>>'{attributes,status}',''))='completed'
      and ((x#>>'{attributes,homePlayerID}'=v_wst1 and x#>>'{attributes,awayPlayerID}'=v_wst2) or (x#>>'{attributes,homePlayerID}'=v_wst2 and x#>>'{attributes,awayPlayerID}'=v_wst1))
      and (v_scheduled is null or nullif(x#>>'{attributes,startDateTime}','')::timestamp < (v_scheduled at time zone 'UTC'))
  )
  select count(*),
    count(*) filter(where (home_id=v_wst1 and hs>ascore) or (away_id=v_wst1 and ascore>hs)),
    count(*) filter(where (home_id=v_wst2 and hs>ascore) or (away_id=v_wst2 and ascore>hs)),
    coalesce(sum(case when home_id=v_wst1 then hs else ascore end),0),
    coalesce(sum(case when home_id=v_wst2 then hs else ascore end),0)
  into v_meetings,v_w1,v_w2,v_f1,v_f2 from pair_rows;

  with pair_rows as (
    select x->'attributes' a, nullif(x#>>'{attributes,startDateTime}','')::timestamp start_ts
    from jsonb_array_elements(v_rows) x
    where lower(coalesce(x#>>'{attributes,status}',''))='completed'
      and ((x#>>'{attributes,homePlayerID}'=v_wst1 and x#>>'{attributes,awayPlayerID}'=v_wst2) or (x#>>'{attributes,homePlayerID}'=v_wst2 and x#>>'{attributes,awayPlayerID}'=v_wst1))
      and (v_scheduled is null or nullif(x#>>'{attributes,startDateTime}','')::timestamp < (v_scheduled at time zone 'UTC'))
    order by start_ts desc nulls last limit 5
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',a->>'startDateTime','tournament',a#>>'{tournament,name}','round',a->>'round',
    'homePlayerId',a->>'homePlayerID','awayPlayerId',a->>'awayPlayerID',
    'homePlayerName',(a#>>'{homePlayer,firstName}')||' '||(a#>>'{homePlayer,surname}'),
    'awayPlayerName',(a#>>'{awayPlayer,firstName}')||' '||(a#>>'{awayPlayer,surname}'),
    'homeScore',nullif(a->>'homePlayerScore','')::int,'awayScore',nullif(a->>'awayPlayerScore','')::int
  ) order by start_ts desc),'[]'::jsonb) into v_recent from pair_rows;

  insert into public.snooker_match_head_to_head(match_id,player1_id,player2_id,meetings_before,player1_wins,player2_wins,player1_frames,player2_frames,recent_meetings,source_name,source_updated_at)
  values(p_match_id,v_p1,v_p2,v_meetings,v_w1,v_w2,v_f1,v_f2,v_recent,'WST',now())
  on conflict(match_id) do update set player1_id=excluded.player1_id,player2_id=excluded.player2_id,meetings_before=excluded.meetings_before,player1_wins=excluded.player1_wins,player2_wins=excluded.player2_wins,player1_frames=excluded.player1_frames,player2_frames=excluded.player2_frames,recent_meetings=excluded.recent_meetings,source_updated_at=excluded.source_updated_at,updated_at=now();
  return jsonb_build_object('ok',true,'match_id',p_match_id,'meetings',v_meetings,'player1_wins',v_w1,'player2_wins',v_w2);
end;
$$;
revoke all on function public.snooker_refresh_match_h2h(uuid) from public,anon,authenticated;
grant execute on function public.snooker_refresh_match_h2h(uuid) to service_role;
