do $do$
declare d text;
begin
  select pg_get_functiondef('public.snooker_ops_snapshot(text)'::regprocedure) into d;
  d:=replace(d,
    $old$v_overview jsonb; v_seasons jsonb; v_analytics jsonb; v_rankings jsonb; v_policies jsonb; v_cron jsonb; v_sync_logs jsonb; v_analytics_logs jsonb; v_action_logs jsonb; v_audits jsonb; v_quality jsonb;$old$,
    $new$v_overview jsonb; v_seasons jsonb; v_analytics jsonb; v_rankings jsonb; v_policies jsonb; v_sync_tasks jsonb; v_cron jsonb; v_sync_logs jsonb; v_analytics_logs jsonb; v_action_logs jsonb; v_audits jsonb; v_quality jsonb;$new$);

  d:=replace(d,
    $old$select coalesce(jsonb_agg(jsonb_build_object('jobKey',job_key,'enabled',enabled,'intervalSeconds',interval_seconds,'prestartIntervalSeconds',prestart_interval_seconds,'prestartWindowMinutes',prestart_window_minutes,'writeOnlyOnChange',write_only_on_change,'skipFinalizedMatches',skip_finalized_matches,'notes',notes,'updatedAt',updated_at) order by job_key),'[]'::jsonb) into v_policies from public.snooker_sync_policies;$old$,
    $new$select coalesce(jsonb_agg(jsonb_build_object('jobKey',job_key,'enabled',enabled,'intervalSeconds',interval_seconds,'prestartIntervalSeconds',prestart_interval_seconds,'prestartWindowMinutes',prestart_window_minutes,'writeOnlyOnChange',write_only_on_change,'skipFinalizedMatches',skip_finalized_matches,'notes',notes,'updatedAt',updated_at) order by job_key),'[]'::jsonb) into v_policies from public.snooker_sync_policies;
  select coalesce(jsonb_agg(jsonb_build_object(
    'jobKey',p.job_key,'groupKey',p.group_key,'displayNameZh',p.display_name_zh,'descriptionZh',p.description_zh,'sourceName',p.source_name,
    'enabled',p.enabled,'intervalSeconds',p.interval_seconds,'prestartIntervalSeconds',p.prestart_interval_seconds,'prestartWindowMinutes',p.prestart_window_minutes,
    'scheduleMode',p.schedule_mode,'configurable',p.configurable,'allowedIntervals',p.allowed_intervals,'sortOrder',p.sort_order,
    'parentJobKey',case when p.schedule_mode='covered_by_parent' then 'player_profiles' when p.schedule_mode='child' and p.group_key='rankings' then 'rankings_all' else null end,
    'lastStartedAt',s.last_started_at,'lastFinishedAt',s.last_finished_at,'lastSuccessAt',s.last_success_at,'lastChangeAt',s.last_change_at,'lastStatus',s.last_status,
    'lastFetchedCount',s.last_fetched_count,'lastChangedCount',s.last_changed_count,'lastDurationMs',s.last_duration_ms,'consecutiveFailures',s.consecutive_failures,
    'nextRunAt',s.next_run_at,'lastMessage',s.last_message,'lastError',s.last_error,'lastResult',s.last_result
  ) order by p.group_key,p.sort_order,p.job_key),'[]'::jsonb) into v_sync_tasks
  from public.snooker_sync_policies p left join public.snooker_sync_task_state s on s.job_key=p.job_key;$new$);

  d:=replace(d,
    $old$'syncPolicies',v_policies,'cronJobs',v_cron$old$,
    $new$'syncPolicies',v_policies,'syncTasks',v_sync_tasks,'cronJobs',v_cron$new$);
  execute d;

  select pg_get_functiondef('public.snooker_ops_run_action(text,text,jsonb)'::regprocedure) into d;
  d:=replace(d,
    $old$when 'live_sync' then v_result:=public.snooker_live_sync_cycle();$old$,
    $new$when 'sync_task' then v_result:=snooker_internal.run_sync_task(p_payload->>'jobKey',true);
      when 'sync_policy_update' then v_result:=snooker_internal.update_sync_policy(p_payload->>'jobKey',case when p_payload ? 'enabled' then (p_payload->>'enabled')::boolean else null end,case when p_payload ? 'intervalSeconds' then (p_payload->>'intervalSeconds')::int else null end);
      when 'live_sync' then v_result:=snooker_internal.run_sync_task('live_match_status',true);$new$);
  d:=replace(d,
    $old$when 'upcoming_sync' then v_result:=public.snooker_upcoming_schedule_sync_cycle();$old$,
    $new$when 'upcoming_sync' then v_result:=snooker_internal.run_sync_task('upcoming_schedule',true);$new$);
  execute d;
end $do$;
