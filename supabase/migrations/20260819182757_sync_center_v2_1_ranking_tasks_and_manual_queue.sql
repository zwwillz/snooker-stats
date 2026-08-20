create table if not exists public.snooker_sync_manual_queue (
  id bigint generated always as identity primary key,
  job_key text not null references public.snooker_sync_policies(job_key) on update cascade on delete restrict,
  requested_by uuid null references public.snooker_ops_admins(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','success','failed','cancelled')),
  requested_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  result jsonb not null default '{}'::jsonb,
  error_message text null,
  raw_error text null
);
alter table public.snooker_sync_manual_queue enable row level security;
revoke all on public.snooker_sync_manual_queue from anon, authenticated;
create index if not exists snooker_sync_manual_queue_status_requested_idx on public.snooker_sync_manual_queue(status,requested_at);

create or replace function snooker_internal.sync_error_message(p_error text)
returns text language plpgsql immutable set search_path='' as $$
declare e text:=coalesce(p_error,'');
begin
  if e='' then return '同步执行失败。';
  elsif lower(e) like '%statement timeout%' or lower(e) like '%query canceled%' or lower(e) like '%canceling statement%' then return '同步执行超时，任务已停止。请稍后重试；如果持续出现，请检查数据源响应速度。';
  elsif lower(e) like '%source_unavailable%' or lower(e) like '%source unavailable%' then return '数据源暂不可用。';
  elsif lower(e) like '%http %' or lower(e) like '%connection%' or lower(e) like '%could not connect%' then return '上游数据源请求失败，请稍后重试。';
  elsif lower(e) like '%unauthorized%' then return '登录状态已失效，请重新登录。';
  else return '同步执行失败，请查看详细日志。';
  end if;
end $$;

update public.snooker_sync_policies
set schedule_mode='manual', configurable=false, updated_at=now()
where job_key='rankings_all';

update public.snooker_sync_policies
set schedule_mode='interval', configurable=true,
    allowed_intervals='[3600,7200,21600,43200,86400,172800,604800]'::jsonb,
    updated_at=now()
where job_key in ('ranking_world_official','ranking_provisional_seeding','ranking_one_year','ranking_provisional_eos','ranking_race_masters','ranking_race_crucible','ranking_race_players','ranking_race_tour');

update public.snooker_sync_task_state s
set last_success_at=coalesce(s.last_success_at,(select last_success_at from public.snooker_sync_task_state where job_key='rankings_all')),
    last_change_at=coalesce(s.last_change_at,(
      select l.latest_captured_at from public.snooker_ranking_lists l where
      (s.job_key='ranking_world_official' and l.ranking_type='world_official') or
      (s.job_key='ranking_provisional_seeding' and l.ranking_type='provisional_seeding') or
      (s.job_key='ranking_one_year' and l.ranking_type='one_year') or
      (s.job_key='ranking_provisional_eos' and l.ranking_type='provisional_eos') or
      (s.job_key='ranking_race_masters' and l.ranking_type='race_masters') or
      (s.job_key='ranking_race_crucible' and l.ranking_type='race_crucible') or
      (s.job_key='ranking_race_players' and l.ranking_type='race_players_championship') or
      (s.job_key='ranking_race_tour' and l.ranking_type='race_tour_championship')
      order by l.is_current desc,l.latest_captured_at desc nulls last limit 1
    )),
    last_status=coalesce(s.last_status,'success'),
    last_message=coalesce(s.last_message,'沿用最近一次“全部排名”检查结果'),
    next_run_at=coalesce(s.next_run_at,(select last_success_at from public.snooker_sync_task_state where job_key='rankings_all'),now()) + make_interval(secs=>coalesce((select interval_seconds from public.snooker_sync_policies p where p.job_key=s.job_key),86400)),
    updated_at=now()
where s.job_key in ('ranking_world_official','ranking_provisional_seeding','ranking_one_year','ranking_provisional_eos','ranking_race_masters','ranking_race_crucible','ranking_race_players','ranking_race_tour');
update public.snooker_sync_task_state set next_run_at=null,updated_at=now() where job_key='rankings_all';

create or replace function snooker_internal.sync_rankings_all()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare x record; r jsonb; out jsonb:='{}'::jsonb; failures int:=0; result_key text;
begin
  for x in
    select job_key from public.snooker_sync_policies
    where group_key='rankings' and schedule_mode='interval' and enabled=true and job_key<>'ranking_world_live'
    order by sort_order,job_key
  loop
    result_key:=regexp_replace(x.job_key,'^ranking_','');
    begin
      r:=snooker_internal.run_sync_task(x.job_key,true);
      out:=out||jsonb_build_object(result_key,coalesce(r->'result',r));
      if coalesce((r->>'ok')::boolean,false)=false then failures:=failures+1; end if;
    exception when others then
      failures:=failures+1;
      out:=out||jsonb_build_object(result_key,jsonb_build_object('ok',false,'error',snooker_internal.sync_error_message(sqlerrm),'raw_error',sqlerrm));
    end;
  end loop;
  return jsonb_build_object('ok',failures=0,'failures',failures,'results',out);
end $$;

create or replace function snooker_internal.run_sync_task(p_job_key text,p_force boolean default false)
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare p public.snooker_sync_policies%rowtype; s public.snooker_sync_task_state%rowtype; v_start timestamptz:=clock_timestamp(); v_result jsonb; v_fetched int:=0; v_changed int:=0; v_interval int; v_fact_changed timestamptz; v_child record; v_error text;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null then raise exception 'unknown sync job %',p_job_key; end if;
  if not p.enabled and not p_force then return jsonb_build_object('ok',true,'skipped',true,'reason','disabled','job_key',p_job_key); end if;
  if not p_force and not snooker_internal.sync_task_due(p_job_key) then return jsonb_build_object('ok',true,'skipped',true,'reason','not_due','job_key',p_job_key); end if;
  insert into public.snooker_sync_task_state(job_key,last_started_at,last_status,last_error,last_message,updated_at)
  values(p_job_key,v_start,'running',null,'执行中',now())
  on conflict(job_key) do update set last_started_at=excluded.last_started_at,last_status='running',last_error=null,last_message='执行中',updated_at=now();
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
    v_fetched:=coalesce(nullif(v_result->>'fetched','')::int,nullif(v_result->>'rows','')::int,nullif(v_result->>'events_checked','')::int,nullif(v_result->>'processed','')::int,0);
    v_changed:=coalesce(nullif(v_result->>'changed','')::int,nullif(v_result->>'updated','')::int,nullif(v_result->>'live_matches_synced','')::int,nullif(v_result->>'h2h_created','')::int,0);
    if p_job_key='rankings_all' then select coalesce(sum(coalesce((value->>'rows')::int,0)),0),coalesce(sum(coalesce((value->>'changed')::int,0)),0) into v_fetched,v_changed from jsonb_each(v_result->'results'); end if;
    if p_job_key='analytics_current' and coalesce((v_result->>'skipped')::boolean,false)=false then v_changed:=1; end if;
    v_interval:=p.interval_seconds;
    if p.schedule_mode='adaptive' and p.prestart_interval_seconds is not null and exists(select 1 from public.snooker_matches m where m.status='upcoming' and m.scheduled_at between now() and now()+make_interval(mins=>coalesce(p.prestart_window_minutes,120))) then v_interval:=p.prestart_interval_seconds; end if;
    update public.snooker_sync_task_state set
      last_finished_at=clock_timestamp(),last_success_at=clock_timestamp(),
      last_change_at=case when v_changed>0 then clock_timestamp() else last_change_at end,
      last_status=case when p_job_key='rankings_all' and coalesce((v_result->>'ok')::boolean,true)=false then 'partial' when coalesce((v_result->>'skipped')::boolean,false) then 'skipped' else 'success' end,
      last_fetched_count=v_fetched,last_changed_count=v_changed,
      last_duration_ms=round(extract(epoch from(clock_timestamp()-v_start))*1000),consecutive_failures=0,
      next_run_at=case when p.schedule_mode in('child','covered_by_parent','client','manual') then null else clock_timestamp()+make_interval(secs=>v_interval) end,
      last_message=case when p_job_key='rankings_all' and coalesce((v_result->>'ok')::boolean,true)=false then '部分榜单同步失败' else coalesce(v_result->>'reason','完成') end,
      last_error=null,last_result=v_result,updated_at=now()
    where job_key=p_job_key;
    return jsonb_build_object('ok',coalesce((v_result->>'ok')::boolean,true),'job_key',p_job_key,'result',v_result,'duration_ms',round(extract(epoch from(clock_timestamp()-v_start))*1000));
  exception
    when query_canceled then
      v_error:='canceling statement due to statement timeout';
      update public.snooker_sync_task_state set last_finished_at=clock_timestamp(),last_status='failed',last_duration_ms=round(extract(epoch from(clock_timestamp()-v_start))*1000),consecutive_failures=consecutive_failures+1,last_error=snooker_internal.sync_error_message(v_error),last_message='执行超时',last_result=jsonb_build_object('raw_error',v_error),next_run_at=case when p.schedule_mode in('manual','child','client','covered_by_parent') then null else clock_timestamp()+make_interval(secs=>greatest(coalesce(p.interval_seconds,300),300)) end,updated_at=now() where job_key=p_job_key;
      return jsonb_build_object('ok',false,'job_key',p_job_key,'error',snooker_internal.sync_error_message(v_error),'raw_error',v_error);
    when others then
      v_error:=sqlerrm;
      update public.snooker_sync_task_state set last_finished_at=clock_timestamp(),last_status='failed',last_duration_ms=round(extract(epoch from(clock_timestamp()-v_start))*1000),consecutive_failures=consecutive_failures+1,last_error=snooker_internal.sync_error_message(v_error),last_message='执行失败',last_result=jsonb_build_object('raw_error',v_error),next_run_at=case when p.schedule_mode in('manual','child','client','covered_by_parent') then null else clock_timestamp()+make_interval(secs=>greatest(coalesce(p.interval_seconds,300),300)) end,updated_at=now() where job_key=p_job_key;
      return jsonb_build_object('ok',false,'job_key',p_job_key,'error',snooker_internal.sync_error_message(v_error),'raw_error',v_error);
  end;
end $$;

create or replace function snooker_internal.sync_supervisor_cycle()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare x record; r jsonb; out jsonb:='{}'::jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_sync_supervisor_cycle')) then return jsonb_build_object('ok',true,'skipped',true,'reason','previous_cycle_running'); end if;
  for x in select job_key from public.snooker_sync_policies where enabled=true and schedule_mode in('interval','adaptive') and job_key<>'live_match_status' order by case group_key when 'events' then 1 when 'players' then 2 when 'rankings' then 3 when 'analytics' then 4 else 9 end,sort_order,job_key loop
    r:=snooker_internal.run_sync_task(x.job_key,false);
    out:=out||jsonb_build_object(x.job_key,r);
  end loop;
  return jsonb_build_object('ok',true,'tasks',out);
end $$;

create or replace function snooker_internal.enqueue_sync_task(p_job_key text,p_requested_by uuid default null)
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare qid bigint; p public.snooker_sync_policies%rowtype;
begin
  select * into p from public.snooker_sync_policies where job_key=p_job_key;
  if p.job_key is null then raise exception 'unknown sync job %',p_job_key; end if;
  if exists(select 1 from public.snooker_sync_manual_queue where job_key=p_job_key and status in('queued','running')) then
    select id into qid from public.snooker_sync_manual_queue where job_key=p_job_key and status in('queued','running') order by requested_at desc limit 1;
    return jsonb_build_object('ok',true,'queued',true,'already_queued',true,'queue_id',qid,'job_key',p_job_key);
  end if;
  insert into public.snooker_sync_manual_queue(job_key,requested_by) values(p_job_key,p_requested_by) returning id into qid;
  insert into public.snooker_sync_task_state(job_key,last_status,last_message,last_result,updated_at) values(p_job_key,'queued','已加入手动同步队列',jsonb_build_object('queue_id',qid),now())
  on conflict(job_key) do update set last_status='queued',last_message='已加入手动同步队列',last_error=null,last_result=jsonb_build_object('queue_id',qid),updated_at=now();
  return jsonb_build_object('ok',true,'queued',true,'queue_id',qid,'job_key',p_job_key);
end $$;

create or replace function snooker_internal.sync_manual_queue_worker()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare q public.snooker_sync_manual_queue%rowtype; r jsonb; v_error text;
begin
  if not pg_try_advisory_xact_lock(hashtext('snooker_sync_manual_queue_worker')) then return jsonb_build_object('ok',true,'skipped',true,'reason','worker_busy'); end if;
  select * into q from public.snooker_sync_manual_queue where status='queued' order by requested_at,id for update skip locked limit 1;
  if q.id is null then return jsonb_build_object('ok',true,'skipped',true,'reason','queue_empty'); end if;
  update public.snooker_sync_manual_queue set status='running',started_at=clock_timestamp() where id=q.id;
  begin
    r:=snooker_internal.run_sync_task(q.job_key,true);
    if coalesce((r->>'ok')::boolean,false) then
      update public.snooker_sync_manual_queue set status='success',finished_at=clock_timestamp(),result=r,error_message=null,raw_error=null where id=q.id;
    else
      update public.snooker_sync_manual_queue set status='failed',finished_at=clock_timestamp(),result=r,error_message=coalesce(r->>'error','同步执行失败。'),raw_error=r->>'raw_error' where id=q.id;
    end if;
    return jsonb_build_object('ok',true,'queue_id',q.id,'job_key',q.job_key,'result',r);
  exception when others then
    v_error:=sqlerrm;
    update public.snooker_sync_manual_queue set status='failed',finished_at=clock_timestamp(),error_message=snooker_internal.sync_error_message(v_error),raw_error=v_error where id=q.id;
    update public.snooker_sync_task_state set last_status='failed',last_error=snooker_internal.sync_error_message(v_error),last_message='后台同步失败',last_result=jsonb_build_object('raw_error',v_error),updated_at=now() where job_key=q.job_key;
    return jsonb_build_object('ok',false,'queue_id',q.id,'job_key',q.job_key,'error',snooker_internal.sync_error_message(v_error));
  end;
end $$;

create or replace function public.snooker_ops_run_action(p_token text,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_admin_id uuid; v_must_change boolean; v_log_id bigint; v_result jsonb; v_season text; v_event_id uuid; v_source_event_id text;
begin
  select a.id,a.must_change_password into v_admin_id,v_must_change from public.snooker_ops_sessions s join public.snooker_ops_admins a on a.id=s.admin_id where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and a.status='active' limit 1;
  if v_admin_id is null then raise exception 'UNAUTHORIZED'; end if;
  if v_must_change then raise exception 'PASSWORD_CHANGE_REQUIRED'; end if;
  insert into public.snooker_ops_action_logs(admin_id,action,status,payload) values(v_admin_id,p_action,'running',coalesce(p_payload,'{}'::jsonb)) returning id into v_log_id;
  begin
    case p_action
      when 'analytics_refresh_current' then v_result:=snooker_internal.refresh_current_season_analytics();
      when 'analytics_audit' then v_result:=snooker_internal.analytics_audit(nullif(p_payload->>'season',''));
      when 'analytics_rebuild_season' then v_season:=p_payload->>'season'; if v_season is null then raise exception '缺少 season'; end if; v_result:=snooker_internal.rebuild_season_analytics(v_season,true,true);
      when 'analytics_rebuild_career' then v_result:=snooker_internal.rebuild_career_analytics();
      when 'analytics_rebuild_h2h' then v_result:=snooker_internal.rebuild_h2h_analytics();
      when 'sync_task' then v_result:=snooker_internal.enqueue_sync_task(p_payload->>'jobKey',v_admin_id);
      when 'sync_policy_update' then v_result:=snooker_internal.update_sync_policy(p_payload->>'jobKey',case when p_payload ? 'enabled' then (p_payload->>'enabled')::boolean else null end,case when p_payload ? 'intervalSeconds' then (p_payload->>'intervalSeconds')::int else null end);
      when 'live_sync' then v_result:=snooker_internal.enqueue_sync_task('live_match_status',v_admin_id);
      when 'upcoming_sync' then v_result:=snooker_internal.enqueue_sync_task('upcoming_schedule',v_admin_id);
      when 'event_sync' then v_event_id:=nullif(p_payload->>'eventId','')::uuid; select source_event_id into v_source_event_id from public.snooker_events where id=v_event_id and source_name='WST'; if v_source_event_id is null then raise exception '该赛事没有可用的 WST source_event_id'; end if; v_result:=public.snooker_sync_wst_tournament(v_source_event_id);
      else raise exception '不支持的操作: %',p_action;
    end case;
    update public.snooker_ops_action_logs set status='success',result=v_result,finished_at=now() where id=v_log_id;
    return jsonb_build_object('ok',true,'action',p_action,'result',v_result,'logId',v_log_id);
  exception when others then
    update public.snooker_ops_action_logs set status='failed',error_message=snooker_internal.sync_error_message(sqlerrm),result=jsonb_build_object('raw_error',sqlerrm),finished_at=now() where id=v_log_id;
    raise exception '%',snooker_internal.sync_error_message(sqlerrm);
  end;
end $$;
revoke execute on function public.snooker_ops_run_action(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.snooker_ops_run_action(text,text,jsonb) to service_role;

select cron.unschedule(jobid) from cron.job where jobname='snooker-manual-sync-worker-v2';
select cron.schedule('snooker-manual-sync-worker-v2','30 seconds',$$select snooker_internal.sync_manual_queue_worker();$$);
