create or replace function snooker_internal.sync_task_due(p_job_key text)
returns boolean language plpgsql stable set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype; s public.snooker_sync_task_state%rowtype; v_interval int; v_now timestamptz:=now(); v_due_at timestamptz;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null or not p.enabled or p.schedule_mode in ('child','covered_by_parent','client','manual') then return false; end if;
  select * into s from public.snooker_sync_task_state where job_key=p_job_key;
  v_interval:=p.interval_seconds;
  if p.schedule_mode='adaptive' and p.prestart_interval_seconds is not null and exists(
    select 1 from public.snooker_matches m where m.status='upcoming' and m.scheduled_at between v_now and v_now+make_interval(mins=>coalesce(p.prestart_window_minutes,120))
  ) then v_interval:=p.prestart_interval_seconds; end if;
  if s.last_finished_at is null then return true; end if;
  v_due_at:=case when p.schedule_mode='adaptive' then s.last_finished_at+make_interval(secs=>v_interval) else coalesce(s.next_run_at,s.last_finished_at+make_interval(secs=>v_interval)) end;
  return v_now>=v_due_at;
end $$;
