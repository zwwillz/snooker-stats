alter table public.snooker_matches
  add column if not exists realtime_finalized_at timestamptz,
  add column if not exists frames_complete boolean not null default false;

create index if not exists snooker_matches_realtime_queue_idx
  on public.snooker_matches(status, scheduled_at)
  where realtime_finalized_at is null;

create table if not exists public.snooker_sync_policies (
  job_key text primary key,
  enabled boolean not null default true,
  interval_seconds integer not null check (interval_seconds >= 30),
  prestart_interval_seconds integer,
  prestart_window_minutes integer,
  write_only_on_change boolean not null default true,
  skip_finalized_matches boolean not null default true,
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.snooker_sync_policies
(job_key,enabled,interval_seconds,prestart_interval_seconds,prestart_window_minutes,write_only_on_change,skip_finalized_matches,notes)
values
('live_match_status',true,30,null,null,true,true,'进行中比赛：WST → 数据库约30秒；比赛完成并最终确认后退出实时同步队列。'),
('upcoming_schedule',true,1800,300,120,true,true,'待开始比赛平时每30分钟检查；开赛前2小时可提高到5分钟。'),
('rankings',true,86400,null,null,true,true,'排名每天检查一次，仅检测到变化时写入新的排名快照。'),
('calendar',true,21600,null,null,true,true,'赛历/赛事基础信息每6小时检查一次，仅变化时写入。'),
('player_profiles',true,604800,null,null,true,true,'球员静态资料每7天检查一次；人工中文名优先，不被自动同步覆盖。'),
('site_monitor',true,120,null,null,true,true,'监测页仅在页面打开且可见时每2分钟刷新；支持手动立即刷新。')
on conflict (job_key) do update set
  enabled=excluded.enabled,
  interval_seconds=excluded.interval_seconds,
  prestart_interval_seconds=excluded.prestart_interval_seconds,
  prestart_window_minutes=excluded.prestart_window_minutes,
  write_only_on_change=excluded.write_only_on_change,
  skip_finalized_matches=excluded.skip_finalized_matches,
  notes=excluded.notes,
  updated_at=now();

alter table public.snooker_sync_policies enable row level security;
drop policy if exists deny_client_access_sync_policies on public.snooker_sync_policies;
create policy deny_client_access_sync_policies on public.snooker_sync_policies
  for all to anon, authenticated using (false) with check (false);

-- The China Open baseline was imported after the event finished. Freeze all completed
-- matches so automatic realtime jobs never keep polling historical results.
update public.snooker_matches
set realtime_finalized_at=coalesce(realtime_finalized_at, now())
where status in ('completed','walkover');

-- Only the final has been fully imported frame-by-frame at this stage.
update public.snooker_matches
set frames_complete=true
where source_match_id='eb26d0bd-3b44-499c-a0bf-4ba2902991e2';

create or replace function public.snooker_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_snooker_sync_policies_updated_at on public.snooker_sync_policies;
create trigger set_snooker_sync_policies_updated_at
before update on public.snooker_sync_policies
for each row execute function public.snooker_set_updated_at();
