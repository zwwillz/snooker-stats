-- 2026/27 data-completeness hardening:
-- 1) retry delayed WST frame/stat detail for recently completed matches;
-- 2) discover published schedules farther than 14 days out;
-- 3) scope qualifier expected match counts to the matches actually played at the qualifier venue.

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
    select m.id,m.completed_detected_at,m.realtime_finalized_at,m.source_updated_at,
           coalesce(m.score1,0)+coalesce(m.score2,0) expected_frames,
           (select count(*) from public.snooker_frames f where f.match_id=m.id) frame_rows,
           (select count(*) from public.snooker_match_statistics s where s.match_id=m.id) stat_rows
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
            frames_complete=case
              when coalesce(score1,0)+coalesce(score2,0)>0
                and (select count(*) from public.snooker_frames f where f.match_id=v_match.id)>=coalesce(score1,0)+coalesce(score2,0)
              then true else frames_complete end,
            updated_at=now()
        where id=v_match.id;
        v_finalized:=v_finalized+1;
      end if;
    exception when others then
      v_errors:=v_errors+1;
    end;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'grace_minutes',v_grace,
    'processed',v_processed,
    'retried_delayed_detail',v_retried,
    'finalized',v_finalized,
    'errors',v_errors,
    'changed',v_processed
  );
end $$;

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

update public.snooker_events set expected_match_count=78,updated_at=now() where slug='wuhan-open-qualifiers-2026';
update public.snooker_events set expected_match_count=78,updated_at=now() where slug='shenzhen-open-qualifiers-2026';
update public.snooker_events set expected_match_count=48,updated_at=now() where slug='british-open-qualifiers-2026';
