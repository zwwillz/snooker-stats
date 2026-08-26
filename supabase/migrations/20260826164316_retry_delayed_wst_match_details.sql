create or replace function public.snooker_post_match_finalize_cycle()
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_catalog'
as $$
declare
  v_grace int:=coalesce((select prestart_window_minutes from public.snooker_sync_policies where job_key='post_match_finalize'),60);
  v_match record;
  v_processed int:=0;
  v_finalized int:=0;
  v_retried int:=0;
  v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_post_match_finalize_cycle')) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running');
  end if;
  for v_match in
    select m.id,m.completed_detected_at,m.realtime_finalized_at,m.source_updated_at
    from public.snooker_matches m
    where m.status='completed'
      and m.completed_detected_at is not null
      and m.completed_detected_at>=now()-interval '72 hours'
      and (
        m.realtime_finalized_at is null
        or (
          coalesce(m.source_updated_at,m.completed_detected_at)<now()-interval '6 hours'
          and (
            (coalesce(m.score1,0)+coalesce(m.score2,0)>0 and (select count(*) from public.snooker_frames f where f.match_id=m.id)<coalesce(m.score1,0)+coalesce(m.score2,0))
            or (select count(*) from public.snooker_match_statistics s where s.match_id=m.id)<2
          )
        )
      )
    order by m.completed_detected_at
  loop
    begin
      perform public.snooker_backfill_wst_match_detail_v2(v_match.id);
      v_processed:=v_processed+1;
      if v_match.realtime_finalized_at is not null then v_retried:=v_retried+1; end if;
      if now()>=v_match.completed_detected_at+make_interval(mins=>v_grace) then
        update public.snooker_matches
        set realtime_finalized_at=coalesce(realtime_finalized_at,now()),
            frames_complete=case when coalesce(score1,0)+coalesce(score2,0)>0 and (select count(*) from public.snooker_frames f where f.match_id=v_match.id)>=coalesce(score1,0)+coalesce(score2,0) then true else frames_complete end,
            updated_at=now()
        where id=v_match.id;
        v_finalized:=v_finalized+1;
      end if;
    exception when others then
      v_errors:=v_errors+1;
    end;
  end loop;
  return jsonb_build_object('ok',true,'grace_minutes',v_grace,'processed',v_processed,'retried_delayed_detail',v_retried,'finalized',v_finalized,'errors',v_errors,'changed',v_processed);
end $$;
