do $$
declare d text;
begin
  select pg_get_functiondef('public.snooker_sync_wst_tournament(text)'::regprocedure) into d;
  d:=replace(d,$q$source_status,source_status_meta,source_updated_at,realtime_finalized_at)$q$,$q$source_status,source_status_meta,source_updated_at,realtime_finalized_at,completed_detected_at)$q$);
  d:=replace(d,$q$v_match->>'status',v_match->>'statusMeta',now(),case when v_existing_id is null and v_status='completed' then now() else null end)$q$,$q$v_match->>'status',v_match->>'statusMeta',now(),null,case when v_status='completed' then coalesce((select completed_detected_at from public.snooker_matches where id=v_existing_id),now()) else null end)$q$);
  d:=replace(d,$q$source_status_meta=excluded.source_status_meta,source_updated_at=excluded.source_updated_at;$q$,$q$source_status_meta=excluded.source_status_meta,source_updated_at=excluded.source_updated_at,completed_detected_at=case when excluded.status='completed' then coalesce(public.snooker_matches.completed_detected_at,excluded.completed_detected_at) else public.snooker_matches.completed_detected_at end;$q$);
  execute d;

  select pg_get_functiondef('public.snooker_backfill_wst_match_detail_v2(uuid)'::regprocedure) into d;
  d:=regexp_replace(d,$q$,realtime_finalized_at=case when lower\(coalesce\(v_attr->>'status',''\)\)='completed' then coalesce\(realtime_finalized_at,now\(\)\) else realtime_finalized_at end$q$,'');
  execute d;
end $$;

create or replace function public.snooker_live_sync_cycle()
returns jsonb language plpgsql security definer set search_path='public','extensions','pg_catalog' as $$
declare
  v_now timestamptz:=now(); v_event record; v_match record; v_event_count int:=0; v_live_count int:=0; v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_live_sync_cycle')) then return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running'); end if;
  for v_event in
    select distinct e.id,e.source_event_id
    from public.snooker_events e join public.snooker_matches m on m.event_id=e.id
    where e.source_name='WST' and e.source_event_id is not null and e.data_ready=true
      and (m.status in ('live','session-break') or (m.status='upcoming' and m.scheduled_at between v_now-interval '30 minutes' and v_now+interval '20 minutes'))
      and m.realtime_finalized_at is null
  loop
    begin perform public.snooker_sync_wst_tournament(v_event.source_event_id); v_event_count:=v_event_count+1;
    exception when others then v_errors:=v_errors+1; continue; end;
    for v_match in select id from public.snooker_matches where event_id=v_event.id and status in ('live','session-break') and realtime_finalized_at is null loop
      begin perform public.snooker_sync_wst_match_frames(v_match.id); v_live_count:=v_live_count+1;
      exception when others then v_errors:=v_errors+1; end;
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'active_events',v_event_count,'live_matches_synced',v_live_count,'errors',v_errors,'external_requests_skipped',v_event_count=0);
end $$;

create or replace function public.snooker_post_match_finalize_cycle()
returns jsonb language plpgsql security definer set search_path='public','extensions','pg_catalog' as $$
declare
  v_grace int:=coalesce((select prestart_window_minutes from public.snooker_sync_policies where job_key='post_match_finalize'),60);
  v_match record; v_processed int:=0; v_finalized int:=0; v_errors int:=0;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_post_match_finalize_cycle')) then return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running'); end if;
  for v_match in
    select id,completed_detected_at from public.snooker_matches
    where status='completed' and completed_detected_at is not null and realtime_finalized_at is null
      and completed_detected_at>=now()-interval '24 hours'
    order by completed_detected_at
  loop
    begin
      perform public.snooker_backfill_wst_match_detail_v2(v_match.id);
      perform public.snooker_refresh_match_h2h(v_match.id);
      v_processed:=v_processed+1;
      if now()>=v_match.completed_detected_at+make_interval(mins=>v_grace) then
        update public.snooker_matches set realtime_finalized_at=now(),frames_complete=case when exists(select 1 from public.snooker_frames f where f.match_id=v_match.id) then true else frames_complete end,updated_at=now() where id=v_match.id;
        v_finalized:=v_finalized+1;
      end if;
    exception when others then v_errors:=v_errors+1; end;
  end loop;
  return jsonb_build_object('ok',true,'grace_minutes',v_grace,'processed',v_processed,'finalized',v_finalized,'errors',v_errors,'changed',v_processed);
end $$;

create or replace function snooker_internal.analytics_fact_changed_at()
returns timestamptz language sql stable set search_path='public','pg_catalog' as $$
  with ev as (select id from public.snooker_events where season=snooker_internal.current_season()),
  vals as (
    select max(updated_at) t from public.snooker_events where id in(select id from ev)
    union all select max(updated_at) from public.snooker_matches where event_id in(select id from ev)
    union all select max(f.updated_at) from public.snooker_frames f join public.snooker_matches m on m.id=f.match_id where m.event_id in(select id from ev)
    union all select max(b.updated_at) from public.snooker_breaks b join public.snooker_matches m on m.id=b.match_id where m.event_id in(select id from ev)
  ) select max(t) from vals
$$;

create or replace function snooker_internal.sync_task_due(p_job_key text)
returns boolean language plpgsql stable set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype; s public.snooker_sync_task_state%rowtype; v_interval int; v_now timestamptz:=now();
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null or not p.enabled or p.schedule_mode in ('child','covered_by_parent','client','manual') then return false; end if;
  select * into s from public.snooker_sync_task_state where job_key=p_job_key;
  v_interval:=p.interval_seconds;
  if p.schedule_mode='adaptive' and p.prestart_interval_seconds is not null and exists(
    select 1 from public.snooker_matches m where m.status='upcoming' and m.scheduled_at between v_now and v_now+make_interval(mins=>coalesce(p.prestart_window_minutes,120))
  ) then v_interval:=p.prestart_interval_seconds; end if;
  return s.last_finished_at is null or v_now>=coalesce(s.next_run_at,s.last_finished_at+make_interval(secs=>v_interval));
end $$;

create or replace function snooker_internal.run_sync_task(p_job_key text,p_force boolean default false)
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype; s public.snooker_sync_task_state%rowtype; v_start timestamptz:=clock_timestamp(); v_result jsonb; v_fetched int:=0; v_changed int:=0; v_interval int; v_fact_changed timestamptz; v_child record;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null then raise exception 'unknown sync job %',p_job_key; end if;
  if not p.enabled and not p_force then return jsonb_build_object('ok',true,'skipped',true,'reason','disabled','job_key',p_job_key); end if;
  if not p_force and not snooker_internal.sync_task_due(p_job_key) then return jsonb_build_object('ok',true,'skipped',true,'reason','not_due','job_key',p_job_key); end if;

  insert into public.snooker_sync_task_state(job_key,last_started_at,last_status,last_error,updated_at) values(p_job_key,v_start,'running',null,now())
  on conflict(job_key) do update set last_started_at=excluded.last_started_at,last_status='running',last_error=null,updated_at=now();

  begin
    case p_job_key
      when 'calendar' then v_result:=snooker_internal.sync_wst_calendar();
      when 'upcoming_schedule' then v_result:=public.snooker_upcoming_schedule_sync_cycle();
      when 'live_match_status' then v_result:=public.snooker_live_sync_cycle();
      when 'post_match_finalize' then v_result:=public.snooker_post_match_finalize_cycle();
      when 'player_master' then v_result:=snooker_internal.sync_wst_player_master();
      when 'player_profiles' then v_result:=snooker_internal.sync_wst_player_profiles_all();
      when 'rankings_all' then v_result:=snooker_internal.sync_rankings_all();
      when 'analytics_current' then
        select * into s from public.snooker_sync_task_state where job_key=p_job_key;
        v_fact_changed:=snooker_internal.analytics_fact_changed_at();
        if not p_force and s.last_success_at is not null and (v_fact_changed is null or v_fact_changed<=s.last_success_at) then v_result:=jsonb_build_object('ok',true,'skipped',true,'reason','source_unchanged','fact_changed_at',v_fact_changed);
        else v_result:=snooker_internal.refresh_current_season_analytics(); end if;
      when 'analytics_audit' then v_result:=snooker_internal.analytics_audit(null);
      when 'ranking_world_official','ranking_provisional_seeding','ranking_one_year','ranking_provisional_eos','ranking_race_masters','ranking_race_crucible' then
        select list_key into v_child from public.snooker_ranking_lists where ranking_type=case p_job_key when 'ranking_world_official' then 'world_official' when 'ranking_provisional_seeding' then 'provisional_seeding' when 'ranking_one_year' then 'one_year' when 'ranking_provisional_eos' then 'provisional_eos' when 'ranking_race_masters' then 'race_masters' else 'race_crucible' end and is_current=true limit 1;
        v_result:=snooker_internal.sync_wpbsa_ranking_list(v_child.list_key);
      when 'ranking_race_players' then v_result:=snooker_internal.sync_derived_ranking('race_players_championship','one_year');
      when 'ranking_race_tour' then v_result:=snooker_internal.sync_derived_ranking('race_tour_championship','one_year');
      when 'ranking_world_live' then v_result:=jsonb_build_object('ok',false,'skipped',true,'reason','source_unavailable');
      when 'player_season_stats','player_career_stats' then v_result:=snooker_internal.sync_wst_player_profiles_all();
      else raise exception 'unsupported sync job %',p_job_key;
    end case;

    v_fetched:=coalesce(nullif(v_result->>'fetched','')::int,nullif(v_result->>'events_checked','')::int,nullif(v_result->>'processed','')::int,0);
    v_changed:=coalesce(nullif(v_result->>'changed','')::int,nullif(v_result->>'updated','')::int,nullif(v_result->>'live_matches_synced','')::int,nullif(v_result->>'h2h_created','')::int,0);
    if p_job_key='rankings_all' then select coalesce(sum(coalesce((value->>'rows')::int,0)),0),coalesce(sum(coalesce((value->>'changed')::int,0)),0) into v_fetched,v_changed from jsonb_each(v_result->'results'); end if;
    if p_job_key='analytics_current' and coalesce((v_result->>'skipped')::boolean,false)=false then v_changed:=1; end if;

    v_interval:=p.interval_seconds;
    if p.schedule_mode='adaptive' and p.prestart_interval_seconds is not null and exists(select 1 from public.snooker_matches m where m.status='upcoming' and m.scheduled_at between now() and now()+make_interval(mins=>coalesce(p.prestart_window_minutes,120))) then v_interval:=p.prestart_interval_seconds; end if;
    update public.snooker_sync_task_state set last_finished_at=clock_timestamp(),last_success_at=clock_timestamp(),last_change_at=case when v_changed>0 then clock_timestamp() else last_change_at end,last_status=case when coalesce((v_result->>'skipped')::boolean,false) then 'skipped' else 'success' end,last_fetched_count=v_fetched,last_changed_count=v_changed,last_duration_ms=round(extract(epoch from(clock_timestamp()-v_start))*1000),consecutive_failures=0,next_run_at=case when p.schedule_mode in('child','covered_by_parent','client','manual') then null else clock_timestamp()+make_interval(secs=>v_interval) end,last_message=coalesce(v_result->>'reason','完成'),last_error=null,last_result=v_result,updated_at=now() where job_key=p_job_key;
    return jsonb_build_object('ok',true,'job_key',p_job_key,'result',v_result,'duration_ms',round(extract(epoch from(clock_timestamp()-v_start))*1000));
  exception when others then
    update public.snooker_sync_task_state set last_finished_at=clock_timestamp(),last_status='failed',last_duration_ms=round(extract(epoch from(clock_timestamp()-v_start))*1000),consecutive_failures=consecutive_failures+1,last_error=sqlerrm,last_message='执行失败',next_run_at=clock_timestamp()+make_interval(secs=>greatest(coalesce(p.interval_seconds,300),300)),updated_at=now() where job_key=p_job_key;
    raise;
  end;
end $$;

create or replace function snooker_internal.sync_supervisor_cycle()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare k text; r jsonb; out jsonb:='{}'::jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_sync_supervisor_cycle')) then return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running'); end if;
  foreach k in array array['post_match_finalize','upcoming_schedule','calendar','player_master','player_profiles','rankings_all','analytics_current','analytics_audit'] loop
    begin r:=snooker_internal.run_sync_task(k,false); out:=out||jsonb_build_object(k,r);
    exception when others then out:=out||jsonb_build_object(k,jsonb_build_object('ok',false,'error',sqlerrm)); end;
  end loop;
  return jsonb_build_object('ok',true,'tasks',out);
end $$;

create or replace function snooker_internal.update_sync_policy(p_job_key text,p_enabled boolean,p_interval_seconds int default null)
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null then raise exception 'unknown sync job %',p_job_key; end if;
  if p_interval_seconds is not null and p.configurable and not (p.allowed_intervals @> to_jsonb(array[p_interval_seconds])) then raise exception 'interval % is not allowed for %',p_interval_seconds,p_job_key; end if;
  update public.snooker_sync_policies set enabled=coalesce(p_enabled,enabled),interval_seconds=case when p_interval_seconds is not null and configurable then p_interval_seconds else interval_seconds end,updated_at=now() where job_key=p_job_key;
  update public.snooker_sync_task_state set next_run_at=case when coalesce(p_enabled,enabled)=false then null when p_interval_seconds is not null then coalesce(last_success_at,now())+make_interval(secs=>p_interval_seconds) else next_run_at end,updated_at=now() where job_key=p_job_key;
  return jsonb_build_object('ok',true,'job_key',p_job_key,'enabled',(select enabled from public.snooker_sync_policies where job_key=p_job_key),'interval_seconds',(select interval_seconds from public.snooker_sync_policies where job_key=p_job_key));
end $$;

do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname in ('snooker-live-sync-30s','snooker-upcoming-schedule-6h','snooker-analytics-current-refresh-v1','snooker-analytics-nightly-audit-v1','snooker-live-sync-v2','snooker-sync-supervisor-v2') loop perform cron.unschedule(j.jobid); end loop;
end $$;
select cron.schedule('snooker-live-sync-v2','30 seconds',$$select snooker_internal.run_sync_task('live_match_status',false);$$);
select cron.schedule('snooker-sync-supervisor-v2','*/5 * * * *',$$select snooker_internal.sync_supervisor_cycle();$$);

update public.snooker_sync_task_state s set last_status='success',last_success_at=now(),last_finished_at=now(),next_run_at=now()+make_interval(secs=>p.interval_seconds),last_message='Sync Center v2 初始化',updated_at=now()
from public.snooker_sync_policies p where p.job_key=s.job_key and p.schedule_mode in('interval','adaptive') and s.job_key in('calendar','upcoming_schedule','live_match_status','post_match_finalize','rankings_all','analytics_current','analytics_audit');
update public.snooker_sync_task_state set last_success_at=(select max(finished_at) from public.snooker_sync_runs where job_type='player_full_profile_import'),last_finished_at=(select max(finished_at) from public.snooker_sync_runs where job_type='player_full_profile_import'),last_status='success',next_run_at=coalesce((select max(finished_at) from public.snooker_sync_runs where job_type='player_full_profile_import'),now())+interval '7 days',last_message='沿用既有球员资料同步记录',updated_at=now() where job_key='player_profiles';
update public.snooker_sync_task_state set last_success_at=(select max(finished_at) from public.snooker_sync_runs where job_type='player_master_import'),last_finished_at=(select max(finished_at) from public.snooker_sync_runs where job_type='player_master_import'),last_status='success',next_run_at=now(),last_message='待下一轮 Supervisor 检查',updated_at=now() where job_key='player_master';
