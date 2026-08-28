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
  v_win_target integer := (coalesce(new.best_of, 0) / 2) + 1;
  v_mid_session_frame_ended boolean := false;
begin
  -- WST can represent the standard mid-session interval in two ways:
  -- 1) Suspended/Paused/Interrupted (+ INTERVAL), or
  -- 2) Live + FRAME_HAS_ENDED after the fourth completed frame.
  -- Restrict the second form to matches long enough to have a mid-session interval
  -- and to a non-terminal 4-frame score so ordinary frame transitions are not
  -- mislabeled as a session break.
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
  end if;
  return new;
end;
$$;

drop trigger if exists snooker_guard_live_match_state_trigger on public.snooker_matches;
create trigger snooker_guard_live_match_state_trigger
before insert or update of status, score1, score2, winner_id, source_status, source_status_meta, source_updated_at, current_player_side, current_break, live_frame_no
on public.snooker_matches
for each row execute function public.snooker_guard_live_match_state();
