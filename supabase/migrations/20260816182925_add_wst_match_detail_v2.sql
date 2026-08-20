create or replace function public.snooker_backfill_wst_match_detail_v2(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_source text; v_p1 uuid; v_p2 uuid; v_response extensions.http_response; v_attr jsonb; v_history jsonb;
  v_frame jsonb; v_stat jsonb; v_frame_id uuid; v_no int; v_b1 int; v_b2 int; v_player uuid; v_side text;
  v_frames int:=0; v_stats int:=0; v_ast numeric;
begin
  select source_match_id,player1_id,player2_id into v_source,v_p1,v_p2 from public.snooker_matches where id=p_match_id;
  if v_source is null then return jsonb_build_object('ok',false,'reason','missing_source_match_id'); end if;
  v_response:=extensions.http_get('https://matches.snooker.web.gc.wstservices.co.uk/v2/'||v_source);
  if v_response.status<>200 then raise exception 'WST match detail HTTP %',v_response.status; end if;
  v_attr:=v_response.content::jsonb#>'{data,attributes}';
  v_history:=v_attr#>'{history,matchData}';
  for v_frame in select value from jsonb_array_elements(coalesce(v_history#>'{matchHistory,frames}','[]'::jsonb)) loop
    v_no:=(v_frame->>'frameNumber')::int; v_b1:=nullif(v_frame->>'homePlayerFiftyPlusBreaks','')::int; v_b2:=nullif(v_frame->>'awayPlayerFiftyPlusBreaks','')::int;
    insert into public.snooker_frames(match_id,frame_no,score1,score2,break1,break2,status,source_updated_at)
    values(p_match_id,v_no,coalesce((v_frame->>'homePlayerPoints')::int,0),coalesce((v_frame->>'awayPlayerPoints')::int,0),case when v_b1>=50 then v_b1 end,case when v_b2>=50 then v_b2 end,'completed',now())
    on conflict(match_id,frame_no) do update set score1=excluded.score1,score2=excluded.score2,break1=excluded.break1,break2=excluded.break2,status=excluded.status,source_updated_at=excluded.source_updated_at,updated_at=now()
    returning id into v_frame_id;
    delete from public.snooker_breaks where match_id=p_match_id and frame_no=v_no and source_name='WST';
    if v_b1>=50 then insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at) values(p_match_id,v_frame_id,v_p1,v_no,v_b1,'WST',now()) on conflict do nothing; end if;
    if v_b2>=50 then insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at) values(p_match_id,v_frame_id,v_p2,v_no,v_b2,'WST',now()) on conflict do nothing; end if;
    v_frames:=v_frames+1;
  end loop;
  for v_stat in select value from jsonb_array_elements(coalesce(v_history#>'{matchPlayerStatistics,players}','[]'::jsonb)) loop
    if coalesce((v_stat->>'homePlayer')::boolean,false) then v_player:=v_p1; v_side:='home'; else v_player:=v_p2; v_side:='away'; end if;
    v_ast:=nullif(regexp_replace(coalesce(v_stat->>'averageShotTime',''),'[^0-9.]','','g'),'')::numeric;
    insert into public.snooker_match_statistics(match_id,player_id,side,total_points,average_shot_time_seconds,pot_rate,breaks_50_plus,breaks_100_plus,highest_break,shots_taken,time_on_table_pct,source_name,source_updated_at,raw)
    values(p_match_id,v_player,v_side,nullif(v_stat->>'totalPoints','')::int,v_ast,nullif(v_stat->>'potRate','')::numeric,nullif(v_stat->>'fiftyPlusBreaks','')::int,nullif(v_stat->>'hundredPlusBreaks','')::int,nullif(v_stat->>'highestBreak','')::int,nullif(v_stat->>'shotsTaken','')::int,nullif(v_stat->>'timeOnTable','')::numeric,'WST',now(),v_stat)
    on conflict(match_id,player_id) do update set side=excluded.side,total_points=excluded.total_points,average_shot_time_seconds=excluded.average_shot_time_seconds,pot_rate=excluded.pot_rate,breaks_50_plus=excluded.breaks_50_plus,breaks_100_plus=excluded.breaks_100_plus,highest_break=excluded.highest_break,shots_taken=excluded.shots_taken,time_on_table_pct=excluded.time_on_table_pct,source_updated_at=excluded.source_updated_at,raw=excluded.raw,updated_at=now();
    v_stats:=v_stats+1;
  end loop;
  update public.snooker_matches set score1=coalesce(nullif(v_attr->>'homePlayerScore','')::int,score1),score2=coalesce(nullif(v_attr->>'awayPlayerScore','')::int,score2),winner_id=case when lower(coalesce(v_attr->>'status',''))='completed' then case when coalesce((v_attr->>'homePlayerScore')::int,0)>coalesce((v_attr->>'awayPlayerScore')::int,0) then v_p1 else v_p2 end else winner_id end,frames_complete=case when lower(coalesce(v_attr->>'status',''))='completed' and v_frames>0 then true else frames_complete end,realtime_finalized_at=case when lower(coalesce(v_attr->>'status',''))='completed' then coalesce(realtime_finalized_at,now()) else realtime_finalized_at end,source_status=coalesce(v_attr->>'status',source_status),source_status_meta=coalesce(v_attr->>'statusMeta',source_status_meta),source_updated_at=now(),updated_at=now() where id=p_match_id;
  return jsonb_build_object('ok',true,'match_id',p_match_id,'frames',v_frames,'stats',v_stats,'source_match_id',v_source);
end;
$$;
revoke all on function public.snooker_backfill_wst_match_detail_v2(uuid) from public,anon,authenticated;
grant execute on function public.snooker_backfill_wst_match_detail_v2(uuid) to service_role;
