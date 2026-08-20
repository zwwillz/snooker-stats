create or replace function snooker_internal.update_sync_policy(p_job_key text,p_enabled boolean,p_interval_seconds int default null)
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype; v_enabled boolean; v_interval int;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null then raise exception 'unknown sync job %',p_job_key; end if;
  if p_interval_seconds is not null and p.configurable and not (p.allowed_intervals @> to_jsonb(array[p_interval_seconds])) then raise exception 'interval % is not allowed for %',p_interval_seconds,p_job_key; end if;
  v_enabled:=coalesce(p_enabled,p.enabled);
  v_interval:=case when p_interval_seconds is not null and p.configurable then p_interval_seconds else p.interval_seconds end;
  update public.snooker_sync_policies set enabled=v_enabled,interval_seconds=v_interval,updated_at=now() where job_key=p_job_key;
  update public.snooker_sync_task_state set next_run_at=case when not v_enabled then null when p.schedule_mode in('child','covered_by_parent','client','manual') then null else coalesce(last_success_at,now())+make_interval(secs=>v_interval) end,updated_at=now() where job_key=p_job_key;
  return jsonb_build_object('ok',true,'job_key',p_job_key,'enabled',v_enabled,'interval_seconds',v_interval);
end $$;
