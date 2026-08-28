create or replace function public.snooker_guard_live_match_state()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_meta text := lower(coalesce(new.source_status_meta, ''));
  v_source text := lower(coalesce(new.source_status, ''));
  v_old_total integer := 0;
  v_new_total integer := 0;
  v_win_target integer := (coalesce(new.best_of, 0) / 2) + 1;
  v_mid_session_frame_ended boolean := false;
  v_explicit_walkover boolean := false;
  v_prestart_awarded_walkover boolean := false;
begin
  v_explicit_walkover :=
    v_source ~ '(walkover|withdraw|retir|(^|[^a-z])w/o([^a-z]|$)|(^|[^a-z])wd([^a-z]|$))'
    or v_meta ~ '(walkover|withdraw|retir|(^|[^a-z])w/o([^a-z]|$)|(^|[^a-z])wd([^a-z]|$))';

  v_prestart_awarded_walkover :=
    new.status = 'completed'
    and new.scheduled_at is not null
    and coalesce(new.best_of, 0) >= 5
    and clock_timestamp() < new.scheduled_at
    and (
      (coalesce(new.score1, 0) = v_win_target and coalesce(new.score2, 0) = 0)
      or (coalesce(new.score2, 0) = v_win_target and coalesce(new.score1, 0) = 0)
    );

  if new.status = 'completed' and (v_explicit_walkover or v_prestart_awarded_walkover) then
    new.status := 'walkover';
    if new.winner_id is null and coalesce(new.score1, 0) <> coalesce(new.score2, 0) then
      new.winner_id := case when coalesce(new.score1, 0) > coalesce(new.score2, 0) then new.player1_id else new.player2_id end;
    end if;
    new.current_player_side := null;
    new.current_break := null;
    new.live_frame_no := null;
    new.frames_complete := true;
    new.realtime_finalized_at := coalesce(new.realtime_finalized_at, clock_timestamp());
    if v_prestart_awarded_walkover and new.note is null then
      new.note := '数据源在计划开赛前已按满胜局数判定结果，规范为退赛/不战晋级';
    end if;
  end if;

  v_mid_session_frame_ended :=
    v_source = 'live'
    and v_meta = 'frame_has_ended'
    and coalesce(new.best_of, 0) >= 9
    and coalesce(new.score1, 0) + coalesce(new.score2, 0) = 4
    and greatest(coalesce(new.score1, 0), coalesce(new.score2, 0)) < v_win_target;

  if new.status not in ('completed', 'walkover') then
    if v_source in ('suspended', 'paused', 'interrupted') then
      new.status := 'session-break';
      new.current_player_side := null;
      new.current_break := null;
    elsif v_source = 'live' and (
      v_meta ~ '(interval|session[ _-]?break|mid[ _-]?session|break|pause)'
      or v_mid_session_frame_ended
    ) then
      new.status := 'session-break';
      new.current_player_side := null;
      new.current_break := null;
    elsif v_source = 'live' then
      new.status := 'live';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('completed', 'walkover') and new.status not in ('completed', 'walkover') then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.completed_detected_at := coalesce(old.completed_detected_at, new.completed_detected_at);
    elsif old.status in ('live', 'session-break') and new.status = 'upcoming' then
      new.status := old.status;
    end if;

    v_old_total := coalesce(old.score1, 0) + coalesce(old.score2, 0);
    v_new_total := coalesce(new.score1, 0) + coalesce(new.score2, 0);
    if old.status in ('live', 'session-break') and new.status in ('live', 'session-break') and v_new_total < v_old_total then
      new.score1 := old.score1;
      new.score2 := old.score2;
    end if;

    if old.source_updated_at is not null and new.source_updated_at is not null and new.source_updated_at < old.source_updated_at then
      new.status := old.status;
      new.score1 := old.score1;
      new.score2 := old.score2;
      new.winner_id := old.winner_id;
      new.source_status := old.source_status;
      new.source_status_meta := old.source_status_meta;
      new.source_updated_at := old.source_updated_at;
      new.completed_detected_at := old.completed_detected_at;
      new.current_player_side := old.current_player_side;
      new.current_break := old.current_break;
      new.live_frame_no := old.live_frame_no;
    end if;
  end if;

  if new.status = 'completed' and new.completed_detected_at is null then
    new.completed_detected_at := now();
  elsif new.status = 'walkover' and new.completed_detected_at is null then
    if tg_op = 'INSERT' then
      new.completed_detected_at := now();
    elsif old.status not in ('completed', 'walkover') then
      new.completed_detected_at := now();
    end if;
  end if;
  return new;
end;
$function$;

-- Normalize rows whose source already explicitly says walkover/withdrawal.
update public.snooker_matches
set status='walkover',
    frames_complete=true
where status <> 'walkover'
  and (
    lower(coalesce(source_status,'')) ~ '(walkover|withdraw|retir|(^|[^a-z])w/o([^a-z]|$)|(^|[^a-z])wd([^a-z]|$))'
    or lower(coalesce(source_status_meta,'')) ~ '(walkover|withdraw|retir|(^|[^a-z])w/o([^a-z]|$)|(^|[^a-z])wd([^a-z]|$))'
    or lower(coalesce(note,'')) ~ '(walkover|退赛|withdraw|retir|(^|[^a-z])w/o([^a-z]|$)|(^|[^a-z])wd([^a-z]|$))'
  );

-- WST sometimes publishes awarded 5-0/0-5 results as ordinary Completed with no WD metadata.
-- A match already detected as completed before its scheduled start cannot be a played whitewash.
update public.snooker_matches
set status='walkover',
    frames_complete=true,
    note=coalesce(note,'数据源在计划开赛前已按满胜局数判定结果，规范为退赛/不战晋级')
where status='completed'
  and scheduled_at is not null
  and completed_detected_at is not null
  and completed_detected_at < scheduled_at
  and coalesce(best_of,0) >= 5
  and (
    (coalesce(score1,0)=((best_of/2)+1) and coalesce(score2,0)=0)
    or (coalesce(score2,0)=((best_of/2)+1) and coalesce(score1,0)=0)
  );
