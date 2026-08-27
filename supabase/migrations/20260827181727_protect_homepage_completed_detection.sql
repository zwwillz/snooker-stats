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
  if v_source = 'live' and v_meta ~ '(interval|session[ _-]?break|mid[ _-]?session|break|pause)' then
    new.status := 'session-break';
  elsif v_source = 'live' and new.status not in ('completed', 'walkover') then
    new.status := 'live';
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
    end if;
  end if;

  if new.status in ('completed', 'walkover') and new.completed_detected_at is null then
    new.completed_detected_at := now();
  end if;
  return new;
end;
$$;

update public.snooker_matches
set completed_detected_at = source_updated_at
where status in ('completed', 'walkover')
  and completed_detected_at is null
  and source_updated_at is not null;
