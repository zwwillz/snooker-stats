create or replace function public.snooker_upcoming_schedule_sync_cycle()
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_catalog'
as $$
declare
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
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
    select id,slug,source_event_id
    from public.snooker_events
    where source_name='WST'
      and source_event_id is not null
      and start_date between v_today and v_today+interval '45 days'
    order by start_date
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
  return jsonb_build_object('ok',true,'date',v_today,'horizon_days',45,'events_checked',v_events,'h2h_created',v_h2h,'errors',v_errors,'changed',v_events);
end $$;
