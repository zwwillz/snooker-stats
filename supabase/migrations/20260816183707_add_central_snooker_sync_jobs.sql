create or replace function public.snooker_live_sync_cycle()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_event record; v_match record; v_event_count int:=0; v_live_count int:=0; v_completed_count int:=0; v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_live_sync_cycle')) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running');
  end if;

  for v_event in
    select id,slug,source_event_id from public.snooker_events
    where source_name='WST' and data_ready=true and source_event_id is not null
      and v_today between start_date and end_date
    order by start_date
  loop
    v_event_count:=v_event_count+1;
    begin
      perform public.snooker_sync_wst_tournament(v_event.source_event_id);
    exception when others then
      v_errors:=v_errors+1;
      continue;
    end;

    for v_match in
      select id from public.snooker_matches
      where event_id=v_event.id and status in ('live','session-break') and realtime_finalized_at is null
      order by scheduled_at nulls last
    loop
      begin
        perform public.snooker_sync_wst_match_frames(v_match.id);
        v_live_count:=v_live_count+1;
      exception when others then v_errors:=v_errors+1; end;
    end loop;

    for v_match in
      select id from public.snooker_matches
      where event_id=v_event.id and status='completed' and realtime_finalized_at is null
      order by scheduled_at nulls last
    loop
      begin
        perform public.snooker_backfill_wst_match_detail_v2(v_match.id);
        perform public.snooker_refresh_match_h2h(v_match.id);
        v_completed_count:=v_completed_count+1;
      exception when others then v_errors:=v_errors+1; end;
    end loop;
  end loop;

  return jsonb_build_object('ok',true,'date',v_today,'active_events',v_event_count,'live_matches_synced',v_live_count,'completed_matches_finalized',v_completed_count,'errors',v_errors,'external_requests_skipped',v_event_count=0);
end;
$$;

create or replace function public.snooker_upcoming_schedule_sync_cycle()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_event record; v_match record; v_events int:=0; v_h2h int:=0; v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_upcoming_schedule_sync_cycle')) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running');
  end if;
  for v_event in
    select id,slug,source_event_id from public.snooker_events
    where source_name='WST' and data_ready=true and source_event_id is not null
      and start_date between v_today and v_today+interval '14 days'
    order by start_date
  loop
    begin
      perform public.snooker_sync_wst_tournament(v_event.source_event_id);
      v_events:=v_events+1;
    exception when others then v_errors:=v_errors+1; continue; end;

    for v_match in
      select m.id
      from public.snooker_matches m
      where m.event_id=v_event.id and m.status='upcoming'
        and not exists(select 1 from public.snooker_match_head_to_head h where h.match_id=m.id)
        and exists(select 1 from public.snooker_source_entity_map s where s.entity_type='player' and s.entity_id=m.player1_id and s.source_name='WST')
        and exists(select 1 from public.snooker_source_entity_map s where s.entity_type='player' and s.entity_id=m.player2_id and s.source_name='WST')
      order by m.scheduled_at nulls last
    loop
      begin perform public.snooker_refresh_match_h2h(v_match.id); v_h2h:=v_h2h+1;
      exception when others then v_errors:=v_errors+1; end;
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'date',v_today,'events_checked',v_events,'h2h_created',v_h2h,'errors',v_errors);
end;
$$;

revoke all on function public.snooker_live_sync_cycle() from public,anon,authenticated;
revoke all on function public.snooker_upcoming_schedule_sync_cycle() from public,anon,authenticated;
grant execute on function public.snooker_live_sync_cycle() to service_role;
grant execute on function public.snooker_upcoming_schedule_sync_cycle() to service_role;

select cron.unschedule(jobid) from cron.job where jobname in ('snooker-live-sync-30s','snooker-upcoming-schedule-6h');
select cron.schedule('snooker-live-sync-30s','30 seconds',$cron$select public.snooker_live_sync_cycle();$cron$);
select cron.schedule('snooker-upcoming-schedule-6h','0 */6 * * *',$cron$select public.snooker_upcoming_schedule_sync_cycle();$cron$);
