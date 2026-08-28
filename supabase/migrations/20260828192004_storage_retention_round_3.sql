create or replace function snooker_internal.cleanup_retention()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_cron bigint := 0;
  v_sync bigint := 0;
  v_visits bigint := 0;
  v_actions bigint := 0;
  v_login_attempts bigint := 0;
  v_sessions bigint := 0;
  v_manual_queue bigint := 0;
begin
  delete from cron.job_run_details
  where (status = 'succeeded' and start_time < now() - interval '3 days')
     or (status <> 'succeeded' and start_time < now() - interval '14 days');
  get diagnostics v_cron = row_count;

  delete from public.snooker_sync_runs
  where (status = 'success' and started_at < now() - interval '14 days')
     or (status = 'partial' and started_at < now() - interval '30 days')
     or (status = 'failed' and started_at < now() - interval '90 days');
  get diagnostics v_sync = row_count;

  delete from public.snooker_visit_logs
  where created_at < now() - interval '30 days';
  get diagnostics v_visits = row_count;

  delete from public.snooker_ops_action_logs
  where started_at < now() - interval '180 days';
  get diagnostics v_actions = row_count;

  delete from public.snooker_ops_login_attempts
  where attempted_at < now() - interval '30 days';
  get diagnostics v_login_attempts = row_count;

  delete from public.snooker_ops_sessions
  where expires_at < now() - interval '7 days';
  get diagnostics v_sessions = row_count;

  delete from public.snooker_sync_manual_queue
  where (status in ('success','cancelled') and coalesce(finished_at, requested_at) < now() - interval '30 days')
     or (status = 'failed' and coalesce(finished_at, requested_at) < now() - interval '90 days');
  get diagnostics v_manual_queue = row_count;

  return jsonb_build_object(
    'ok', true,
    'ran_at', now(),
    'deleted', jsonb_build_object(
      'cron_job_run_details', v_cron,
      'snooker_sync_runs', v_sync,
      'snooker_visit_logs', v_visits,
      'snooker_ops_action_logs', v_actions,
      'snooker_ops_login_attempts', v_login_attempts,
      'snooker_ops_sessions', v_sessions,
      'snooker_sync_manual_queue', v_manual_queue
    ),
    'policy', jsonb_build_object(
      'cron_success_days', 3,
      'cron_failure_days', 14,
      'sync_success_days', 14,
      'sync_partial_days', 30,
      'sync_failed_days', 90,
      'visit_days', 30,
      'ops_action_days', 180,
      'login_attempt_days', 30,
      'expired_session_grace_days', 7,
      'manual_success_cancelled_days', 30,
      'manual_failed_days', 90
    )
  );
end;
$function$;

revoke all on function snooker_internal.cleanup_retention() from public;
revoke all on function snooker_internal.cleanup_retention() from anon;
revoke all on function snooker_internal.cleanup_retention() from authenticated;

comment on function snooker_internal.cleanup_retention()
is 'Bounded retention for technical, sync, visitor and admin operational logs. Core snooker facts and analytics warehouse tables are intentionally excluded.';

do $do$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'snooker-retention-cleanup-v1' limit 1;
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
end;
$do$;

select cron.schedule(
  'snooker-retention-cleanup-v1',
  '15 19 * * *',
  'select snooker_internal.cleanup_retention();'
);

select snooker_internal.cleanup_retention();
