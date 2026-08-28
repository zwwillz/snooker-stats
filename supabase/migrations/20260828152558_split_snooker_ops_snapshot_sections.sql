create or replace function public.snooker_ops_snapshot_section(p_token text, p_section text default 'overview')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid;
  v_username text;
  v_display_name text;
  v_must_change boolean;
  v_result jsonb := '{}'::jsonb;
begin
  select a.id, a.username, a.display_name, a.must_change_password
  into v_admin_id, v_username, v_display_name, v_must_change
  from public.snooker_ops_sessions s
  join public.snooker_ops_admins a on a.id = s.admin_id
  where s.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and s.expires_at > now()
    and a.status = 'active'
  limit 1;

  if v_admin_id is null then raise exception 'UNAUTHORIZED'; end if;
  if v_must_change then raise exception 'PASSWORD_CHANGE_REQUIRED'; end if;
  if p_section not in ('overview', 'analytics', 'sync', 'quality', 'logs') then
    raise exception 'INVALID_SECTION';
  end if;

  if p_section = 'overview' then
    with event_counts as (
      select season, count(*)::int as events from public.snooker_events group by season
    ), match_counts as (
      select e.season, count(*)::int as matches,
        count(*) filter (where m.frames_complete)::int as frames_complete,
        count(*) filter (where coalesce(m.source_status_meta, '') ilike '%walkover%')::int as walkovers
      from public.snooker_matches m join public.snooker_events e on e.id = m.event_id group by e.season
    ), frame_counts as (
      select e.season, count(*)::int as frames
      from public.snooker_frames f join public.snooker_matches m on m.id = f.match_id
      join public.snooker_events e on e.id = m.event_id group by e.season
    ), break_counts as (
      select e.season, count(*)::int as breaks,
        count(*) filter (where b.break_value >= 100)::int as centuries,
        count(*) filter (where b.break_value = 147)::int as maximums
      from public.snooker_breaks b join public.snooker_matches m on m.id = b.match_id
      join public.snooker_events e on e.id = m.event_id group by e.season
    ), aggregate_counts as (
      select season, count(*)::int as player_rows, round(avg(frame_data_coverage_pct), 2) as avg_coverage,
        max(calculated_at) as calculated_at
      from public.snooker_player_season_aggregates group by season
    ), seasons as (
      select coalesce(jsonb_agg(jsonb_build_object(
        'season', e.season, 'events', e.events, 'matches', coalesce(m.matches, 0),
        'frames', coalesce(f.frames, 0), 'breaks', coalesce(b.breaks, 0),
        'centuries', coalesce(b.centuries, 0), 'maximums', coalesce(b.maximums, 0),
        'framesCompleteMatches', coalesce(m.frames_complete, 0), 'walkovers', coalesce(m.walkovers, 0),
        'seasonPlayerRows', coalesce(a.player_rows, 0), 'avgFrameCoverage', coalesce(a.avg_coverage, 0),
        'calculatedAt', a.calculated_at
      ) order by split_part(e.season, '/', 1)::int desc), '[]'::jsonb) as rows
      from event_counts e left join match_counts m using (season) left join frame_counts f using (season)
      left join break_counts b using (season) left join aggregate_counts a using (season)
    )
    select jsonb_build_object(
      'overview', jsonb_build_object(
        'databaseSize', pg_size_pretty(pg_database_size(current_database())),
        'databaseBytes', pg_database_size(current_database()),
        'events', (select count(*) from public.snooker_events),
        'matches', (select count(*) from public.snooker_matches),
        'frames', (select count(*) from public.snooker_frames),
        'breaks', (select count(*) from public.snooker_breaks),
        'players', (select count(*) from public.snooker_players),
        'currentTourPlayers', (select count(*) from public.snooker_players where is_current_tour = true),
        'careerAggregates', (select count(*) from public.snooker_player_career_aggregates),
        'h2hPairs', (select count(*) from public.snooker_player_h2h_aggregates),
        'titles', (select count(*) from public.snooker_player_titles),
        'warehouseStart', (select min(season) from public.snooker_player_season_aggregates),
        'warehouseEnd', (select max(season) from public.snooker_player_season_aggregates)
      ),
      'seasons', (select rows from seasons)
    ) into v_result;

  elsif p_section = 'analytics' then
    select jsonb_build_object(
      'analytics', jsonb_build_array(
        jsonb_build_object('key','event','label','球员 × 赛事','table','snooker_player_event_aggregates','rows',(select count(*) from public.snooker_player_event_aggregates),'updatedAt',(select max(calculated_at) from public.snooker_player_event_aggregates)),
        jsonb_build_object('key','season','label','球员 × 赛季','table','snooker_player_season_aggregates','rows',(select count(*) from public.snooker_player_season_aggregates),'updatedAt',(select max(calculated_at) from public.snooker_player_season_aggregates)),
        jsonb_build_object('key','career','label','球员生涯','table','snooker_player_career_aggregates','rows',(select count(*) from public.snooker_player_career_aggregates),'updatedAt',(select max(calculated_at) from public.snooker_player_career_aggregates)),
        jsonb_build_object('key','titles','label','冠军记录','table','snooker_player_titles','rows',(select count(*) from public.snooker_player_titles),'updatedAt',(select max(calculated_at) from public.snooker_player_titles)),
        jsonb_build_object('key','h2h','label','H2H','table','snooker_player_h2h_aggregates','rows',(select count(*) from public.snooker_player_h2h_aggregates),'updatedAt',(select max(calculated_at) from public.snooker_player_h2h_aggregates))
      ),
      'syncTasks', coalesce((select jsonb_agg(jsonb_build_object(
        'jobKey', p.job_key, 'groupKey', p.group_key, 'displayNameZh', p.display_name_zh,
        'descriptionZh', p.description_zh, 'sourceName', p.source_name, 'enabled', p.enabled,
        'intervalSeconds', p.interval_seconds, 'scheduleMode', p.schedule_mode, 'configurable', p.configurable,
        'allowedIntervals', p.allowed_intervals, 'sortOrder', p.sort_order, 'lastStartedAt', s.last_started_at,
        'lastFinishedAt', s.last_finished_at, 'lastSuccessAt', s.last_success_at, 'lastChangeAt', s.last_change_at,
        'lastStatus', s.last_status, 'lastFetchedCount', s.last_fetched_count, 'lastChangedCount', s.last_changed_count,
        'lastDurationMs', s.last_duration_ms, 'consecutiveFailures', s.consecutive_failures,
        'nextRunAt', s.next_run_at, 'lastMessage', s.last_message, 'lastError', s.last_error, 'lastResult', s.last_result
      )) from public.snooker_sync_policies p left join public.snooker_sync_task_state s on s.job_key = p.job_key
      where p.job_key = 'analytics_current'), '[]'::jsonb)
    ) into v_result;

  elsif p_section = 'sync' then
    select jsonb_build_object(
      'rankings', coalesce((select jsonb_agg(jsonb_build_object('listKey',list_key,'titleZh',title_zh,'sourceName',source_name,'sourceUrl',source_url,'isLive',is_live,'isCurrent',is_current,'syncStatus',sync_status,'latestCapturedAt',latest_captured_at) order by is_current desc,title_zh) from public.snooker_ranking_lists), '[]'::jsonb),
      'syncTasks', coalesce((select jsonb_agg(jsonb_build_object(
        'jobKey',p.job_key,'groupKey',p.group_key,'displayNameZh',p.display_name_zh,'descriptionZh',p.description_zh,'sourceName',p.source_name,
        'enabled',p.enabled,'intervalSeconds',p.interval_seconds,'prestartIntervalSeconds',p.prestart_interval_seconds,'prestartWindowMinutes',p.prestart_window_minutes,
        'scheduleMode',p.schedule_mode,'configurable',p.configurable,'allowedIntervals',p.allowed_intervals,'sortOrder',p.sort_order,
        'parentJobKey',case when p.schedule_mode='covered_by_parent' then 'player_profiles' when p.schedule_mode='child' and p.group_key='rankings' then 'rankings_all' else null end,
        'lastStartedAt',s.last_started_at,'lastFinishedAt',s.last_finished_at,'lastSuccessAt',s.last_success_at,'lastChangeAt',s.last_change_at,'lastStatus',s.last_status,
        'lastFetchedCount',s.last_fetched_count,'lastChangedCount',s.last_changed_count,'lastDurationMs',s.last_duration_ms,'consecutiveFailures',s.consecutive_failures,
        'nextRunAt',s.next_run_at,'lastMessage',s.last_message,'lastError',s.last_error,'lastResult',s.last_result
      ) order by p.group_key,p.sort_order,p.job_key) from public.snooker_sync_policies p left join public.snooker_sync_task_state s on s.job_key=p.job_key), '[]'::jsonb),
      'cronJobs', coalesce((select jsonb_agg(jsonb_build_object('jobId',jobid,'jobName',jobname,'schedule',schedule,'command',command,'active',active) order by jobid) from cron.job where jobname like 'snooker-%'), '[]'::jsonb)
    ) into v_result;

  elsif p_section = 'quality' then
    select jsonb_build_object(
      'quality', jsonb_build_object(
        'currentTourMissingAvatar',(select count(*) from public.snooker_players where is_current_tour=true and avatar_url is null),
        'currentTourMissingChineseName',(select count(*) from public.snooker_players where is_current_tour=true and (name_zh is null or trim(name_zh)='')),
        'completedWstEventsMissingSourceId',(select count(*) from public.snooker_events where source_name='WST' and status='completed' and source_event_id is null),
        'completedMatchesWithoutFrames',(select count(*) from public.snooker_matches m where m.status='completed' and coalesce(m.source_status_meta,'') not ilike '%walkover%' and not exists(select 1 from public.snooker_frames f where f.match_id=m.id)),
        'currentRankingListsNotSynced',(select count(*) from public.snooker_ranking_lists where is_current=true and sync_status<>'synced'),
        'rankingConflictsOpen',(select count(*) from public.snooker_ranking_sync_conflicts where resolved_at is null)
      ),
      'audits', coalesce((select jsonb_agg(jsonb_build_object('season',scope_value,'status',status,'finishedAt',finished_at,'metrics',metrics) order by split_part(scope_value,'/',1)::int desc)
        from (select distinct on(scope_value) scope_value,status,finished_at,metrics from snooker_internal.analytics_runs where run_type='audit' and scope_value is not null order by scope_value,id desc) q), '[]'::jsonb)
    ) into v_result;

  else
    select jsonb_build_object(
      'syncLogs', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.started_at desc) from (select r.id,r.source_name,r.job_type,r.status,r.started_at,r.finished_at,r.fetched_count,r.changed_count,r.error_message,e.name_en event_name from public.snooker_sync_runs r left join public.snooker_events e on e.id=r.event_id order by r.started_at desc limit 50) x), '[]'::jsonb),
      'analyticsLogs', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.started_at desc) from (select id,run_type,scope_type,scope_value,aggregation_version,status,started_at,finished_at,metrics,error_message from snooker_internal.analytics_runs order by started_at desc limit 50) x), '[]'::jsonb),
      'actionLogs', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.started_at desc) from (select id,action,status,payload,result,error_message,started_at,finished_at from public.snooker_ops_action_logs order by started_at desc limit 50) x), '[]'::jsonb)
    ) into v_result;
  end if;

  return jsonb_build_object(
    'ok', true,
    'section', p_section,
    'generatedAt', now(),
    'viewer', jsonb_build_object('username', v_username, 'displayName', v_display_name, 'mustChangePassword', v_must_change)
  ) || v_result;
end
$function$;

revoke all on function public.snooker_ops_snapshot_section(text, text) from public, anon, authenticated;
grant execute on function public.snooker_ops_snapshot_section(text, text) to service_role;
