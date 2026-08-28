create or replace function public.snooker_upcoming_schedule_sync_cycle()
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_catalog'
as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_now timestamptz := now();
  v_event record;
  v_match record;
  v_events int:=0;
  v_h2h int:=0;
  v_errors int:=0;
  v_result jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_upcoming_schedule_sync_cycle')) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running');
  end if;

  for v_event in
    select e.id,e.slug,e.source_event_id
    from public.snooker_events e
    where e.source_name='WST'
      and e.source_event_id is not null
      and e.end_date >= v_today
      and e.start_date <= v_today + 45
      and (
        e.source_updated_at is null
        or e.source_updated_at <= v_now - case
          when exists (
            select 1
            from public.snooker_matches m
            where m.event_id=e.id
              and (
                (m.status='upcoming' and m.scheduled_at between v_now - interval '2 hours' and v_now + interval '2 hours')
                or (m.status='completed' and m.completed_detected_at >= v_now - interval '60 minutes')
              )
          ) then interval '5 minutes'
          else interval '30 minutes'
        end
      )
    order by e.start_date
  loop
    begin
      v_result:=public.snooker_sync_wst_tournament(v_event.source_event_id);
      v_events:=v_events+1;
    exception when others then
      v_errors:=v_errors+1;
      continue;
    end;

    for v_match in
      select m.id
      from public.snooker_matches m
      where m.event_id=v_event.id
        and m.status='upcoming'
        and not exists(select 1 from public.snooker_match_head_to_head h where h.match_id=m.id)
        and exists(select 1 from public.snooker_source_entity_map s where s.entity_type='player' and s.entity_id=m.player1_id and s.source_name='WST')
        and exists(select 1 from public.snooker_source_entity_map s where s.entity_type='player' and s.entity_id=m.player2_id and s.source_name='WST')
      order by m.scheduled_at nulls last
    loop
      begin
        perform public.snooker_refresh_match_h2h(v_match.id);
        v_h2h:=v_h2h+1;
      exception when others then
        v_errors:=v_errors+1;
      end;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'date',v_today,
    'horizon_days',45,
    'events_checked',v_events,
    'h2h_created',v_h2h,
    'errors',v_errors,
    'changed',v_events
  );
end $$;

update public.snooker_sync_policies
set
  interval_seconds=300,
  prestart_interval_seconds=300,
  notes='赛事赛程动态发现：调度器每5分钟检查本地状态，WST按赛事关键窗口5分钟、普通窗口30分钟访问。',
  description_zh='同步尚未结束及未来45天赛事的赛程。调度器每5分钟做本地判断；临近比赛或比赛刚结束时最多每5分钟访问WST，其余每30分钟访问，赛事结束后停止。',
  updated_at=now()
where job_key='upcoming_schedule';

update public.snooker_sync_task_state
set next_run_at=now(), updated_at=now()
where job_key='upcoming_schedule';
