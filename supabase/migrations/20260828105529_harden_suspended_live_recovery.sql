create or replace function public.snooker_guard_live_match_state()
returns trigger
language plpgsql
set search_path = 'public', 'pg_catalog'
as $$
declare
  v_meta text := lower(coalesce(new.source_status_meta, ''));
  v_source text := lower(coalesce(new.source_status, ''));
  v_old_total integer := 0;
  v_new_total integer := 0;
begin
  -- Normalize WST's non-terminal source states before applying monotonic guards.
  -- WST uses Suspended + INTERVAL during mid-session breaks; this must stay
  -- inside the realtime pipeline instead of falling back to upcoming.
  if new.status not in ('completed', 'walkover') then
    if v_source in ('suspended', 'paused', 'interrupted') then
      new.status := 'session-break';
    elsif v_source = 'live' and v_meta ~ '(interval|session[ _-]?break|mid[ _-]?session|break|pause)' then
      new.status := 'session-break';
    elsif v_source = 'live' then
      new.status := 'live';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Terminal matches never regress.
    if old.status in ('completed', 'walkover') and new.status not in ('completed', 'walkover') then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.completed_detected_at := coalesce(old.completed_detected_at, new.completed_detected_at);
    -- Once a match has entered the realtime pipeline, a noisy tournament
    -- status must not demote it back to upcoming.
    elsif old.status in ('live', 'session-break') and new.status = 'upcoming' then
      new.status := old.status;
    end if;

    v_old_total := coalesce(old.score1, 0) + coalesce(old.score2, 0);
    v_new_total := coalesce(new.score1, 0) + coalesce(new.score2, 0);
    if old.status in ('live', 'session-break') and new.status in ('live', 'session-break') and v_new_total < v_old_total then
      new.score1 := old.score1;
      new.score2 := old.score2;
    end if;

    -- Older source writes can never overwrite fresher realtime state.
    if old.source_updated_at is not null and new.source_updated_at is not null and new.source_updated_at < old.source_updated_at then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.source_status := old.source_status;
      new.source_status_meta := old.source_status_meta;
      new.source_updated_at := old.source_updated_at;
      new.completed_detected_at := old.completed_detected_at;
    end if;
  end if;

  if new.status = 'completed' and new.completed_detected_at is null then
    new.completed_detected_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists snooker_guard_live_match_state_trigger on public.snooker_matches;
create trigger snooker_guard_live_match_state_trigger
before insert or update of status, score1, score2, winner_id, source_status, source_status_meta, source_updated_at
on public.snooker_matches
for each row execute function public.snooker_guard_live_match_state();

create or replace function public.snooker_live_sync_cycle()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $$
declare
  v_now timestamptz:=now();
  v_event record;
  v_match record;
  v_event_count int:=0;
  v_live_count int:=0;
  v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_live_sync_cycle')) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running');
  end if;

  for v_event in
    select distinct e.id,e.source_event_id
    from public.snooker_events e
    join public.snooker_matches m on m.event_id=e.id
    where e.source_name='WST'
      and e.source_event_id is not null
      and e.data_ready=true
      and m.realtime_finalized_at is null
      and (
        m.status in ('live','session-break')
        or (
          m.status='upcoming'
          and m.scheduled_at between v_now-interval '90 minutes' and v_now+interval '20 minutes'
        )
        or (
          -- Self-heal a match that has already started but was accidentally
          -- demoted to upcoming by a noisy/unknown WST tournament state.
          m.status='upcoming'
          and m.scheduled_at between v_now-interval '12 hours' and v_now
          and (
            coalesce(m.score1,0)+coalesce(m.score2,0)>0
            or lower(coalesce(m.source_status,'')) in ('live','suspended','paused','interrupted')
            or lower(coalesce(m.source_status_meta,'')) ~ '(interval|session[ _-]?break|mid[ _-]?session|break|pause)'
          )
        )
      )
  loop
    begin
      perform public.snooker_sync_wst_tournament(v_event.source_event_id);
      v_event_count:=v_event_count+1;
    exception when others then
      v_errors:=v_errors+1;
      continue;
    end;

    for v_match in
      select id
      from public.snooker_matches
      where event_id=v_event.id
        and realtime_finalized_at is null
        and (
          status in ('live','session-break')
          or (status='completed' and completed_detected_at>=now()-interval '15 minutes')
        )
    loop
      begin
        perform public.snooker_sync_wst_match_frames(v_match.id);
        v_live_count:=v_live_count+1;
      exception when others then
        v_errors:=v_errors+1;
      end;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'active_events',v_event_count,
    'live_matches_synced',v_live_count,
    'errors',v_errors,
    'external_requests_skipped',v_event_count=0
  );
end;
$$;