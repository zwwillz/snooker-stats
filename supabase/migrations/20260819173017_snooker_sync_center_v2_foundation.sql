alter table public.snooker_sync_policies
  add column if not exists group_key text not null default 'other',
  add column if not exists display_name_zh text,
  add column if not exists description_zh text,
  add column if not exists source_name text,
  add column if not exists schedule_mode text not null default 'interval',
  add column if not exists configurable boolean not null default true,
  add column if not exists allowed_intervals jsonb not null default '[]'::jsonb,
  add column if not exists sort_order integer not null default 100;

create table if not exists public.snooker_sync_task_state (
  job_key text primary key references public.snooker_sync_policies(job_key) on update cascade on delete cascade,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_success_at timestamptz,
  last_change_at timestamptz,
  last_status text,
  last_fetched_count integer,
  last_changed_count integer,
  last_duration_ms integer,
  consecutive_failures integer not null default 0,
  next_run_at timestamptz,
  last_message text,
  last_error text,
  last_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.snooker_sync_task_state enable row level security;
revoke all on public.snooker_sync_task_state from anon,authenticated;

alter table public.snooker_matches add column if not exists completed_detected_at timestamptz;

update public.snooker_sync_policies set job_key='rankings_all' where job_key='rankings';

insert into public.snooker_sync_policies(job_key,enabled,interval_seconds,prestart_interval_seconds,prestart_window_minutes,write_only_on_change,skip_finalized_matches,notes,group_key,display_name_zh,description_zh,source_name,schedule_mode,configurable,allowed_intervals,sort_order)
values
('calendar',true,21600,null,null,true,true,'WST赛事目录与基础信息。','events','赛事日历','同步 WST 赛事列表及基础信息，包括赛事名称、日期、场馆、城市、国家、赛事状态和 WST source ID。','WST','interval',true,'[3600,7200,21600,43200,86400,172800,604800]'::jsonb,10),
('upcoming_schedule',true,1800,300,120,true,true,'未来赛程自适应同步。','events','未来赛程','同步未来 14 天的比赛安排、开赛时间、轮次、对阵和赛前 H2H；平时按基础频率，开赛前窗口自动提高频率。','WST','adaptive',true,'[300,900,1800,3600,7200,21600]'::jsonb,20),
('live_match_status',true,30,null,null,true,true,'进行中比赛实时同步。','events','实时比赛','仅同步当前正在进行的比赛，包括实时比分、比赛状态、当前局及可用的逐局数据；没有 Live 比赛时不访问比赛详情。','WST','interval',true,'[30,60,120,300]'::jsonb,30),
('post_match_finalize',true,300,null,60,true,true,'赛后确认窗口。','events','赛后确认','比赛完成后进入 60 分钟确认期，每次补齐最终比分、Frame、50+、Match Stats 和 H2H；确认期结束后 Finalize，之后退出自动同步。','WST','interval',true,'[300,600,900,1800]'::jsonb,40),
('player_master',true,86400,null,null,true,true,'WST球员目录。','players','球员名单','检查 WST 发布的球员目录及基础字段，更新 WST source mapping；不会覆盖人工中文名，也不会自动把历史球员误设为当前巡回赛球员。','WST','interval',true,'[21600,43200,86400,172800,604800]'::jsonb,10),
('player_profiles',true,604800,null,null,true,true,'当前巡回球员完整资料。','players','球员资料','同步当前巡回球员的 WST 个人资料、简介、昵称、Career Highlights，并同时更新 WST 官方赛季统计和职业生涯统计。','WST','interval',true,'[86400,172800,604800,1209600,2592000]'::jsonb,20),
('player_season_stats',true,86400,null,null,true,true,'由球员资料任务一并更新。','players','WST赛季统计','WST 官方球员赛季统计。为减少重复请求，已并入“球员资料”同步任务，本项用于说明与状态展示。','WST','covered_by_parent',false,'[]'::jsonb,30),
('player_career_stats',true,604800,null,null,true,true,'由球员资料任务一并更新。','players','WST生涯统计','WST 官方职业生涯统计，用于 Official vs Calculated 交叉核验。已并入“球员资料”同步任务。','WST','covered_by_parent',false,'[]'::jsonb,40),
('rankings_all',true,86400,null,null,true,true,'全部已启用官方排名。','rankings','全部排名','统一同步所有已启用的排名列表。直接榜单优先读取 WPBSA 官方数据，资格榜可从官方 One-Year 数据派生。','WPBSA','interval',true,'[3600,7200,21600,43200,86400,172800,604800]'::jsonb,10),
('ranking_world_official',true,86400,null,null,true,true,null,'rankings','世界排名','WPBSA 官方两年滚动世界排名，排名赛结束后官方更新。','WPBSA','child',false,'[]'::jsonb,20),
('ranking_provisional_seeding',true,86400,null,null,true,true,null,'rankings','临时排名','WPBSA Latest Provisional Seedings，反映下一排名节点的预测种子顺序。','WPBSA','child',false,'[]'::jsonb,30),
('ranking_one_year',true,86400,null,null,true,true,null,'rankings','单赛季排名','当前赛季排名赛奖金榜，用于 World Grand Prix、Players Championship、Tour Championship 等资格计算。','WPBSA','child',false,'[]'::jsonb,40),
('ranking_provisional_eos',true,86400,null,null,true,true,null,'rankings','赛季末预测排名','WPBSA Provisional End of Season Rankings，扣除赛季末前将失效奖金后的预测排名。','WPBSA','child',false,'[]'::jsonb,50),
('ranking_race_masters',true,86400,null,null,true,true,null,'rankings','大师赛资格排名','WPBSA Race to the Masters，预测大师赛 Top 16 资格。','WPBSA','child',false,'[]'::jsonb,60),
('ranking_race_crucible',true,86400,null,null,true,true,null,'rankings','世锦赛资格排名','WPBSA Race to the Crucible，预测世锦赛正赛 Top 16 资格。','WPBSA','child',false,'[]'::jsonb,70),
('ranking_race_players',true,86400,null,null,true,true,null,'rankings','球员锦标赛资格排名','基于当前 One-Year Ranking 派生的 Players Championship 资格序列。','Calculated','child',false,'[]'::jsonb,80),
('ranking_race_tour',true,86400,null,null,true,true,null,'rankings','巡回锦标赛资格排名','基于当前 One-Year Ranking 派生的 Tour Championship 资格序列。','Calculated','child',false,'[]'::jsonb,90),
('ranking_world_live',false,86400,null,null,true,true,null,'rankings','即时排名','WST Live Ranking 当前官方接口未稳定开放，保留任务定义但默认停用。','WST','child',false,'[]'::jsonb,100),
('analytics_current',true,86400,null,null,true,true,'当前赛季产品统计。','analytics','当前赛季 Analytics','将事实层重算为球员赛季、生涯、冠军和 H2H 产品数据。默认每天一次，也可手动立即刷新。','Calculated','interval',true,'[3600,7200,21600,43200,86400,172800,604800]'::jsonb,10),
('analytics_audit',true,86400,null,null,true,true,'事实层与聚合层一致性审计。','analytics','Analytics 审计','核对 Fact Warehouse 与 Analytics 的关键指标，例如比赛参与数和破百数，发现聚合偏差。','Calculated','interval',true,'[21600,43200,86400,172800,604800]'::jsonb,20),
('site_monitor',true,120,null,null,true,true,'控制台页面自动刷新。','system','控制台自动刷新','仅控制 Data Ops 页面打开时的状态刷新频率，不是外部数据同步任务。','Internal','client',true,'[60,120,300,600]'::jsonb,10)
on conflict(job_key) do update set
  enabled=excluded.enabled,
  interval_seconds=excluded.interval_seconds,
  prestart_interval_seconds=excluded.prestart_interval_seconds,
  prestart_window_minutes=excluded.prestart_window_minutes,
  write_only_on_change=excluded.write_only_on_change,
  skip_finalized_matches=excluded.skip_finalized_matches,
  notes=excluded.notes,
  group_key=excluded.group_key,
  display_name_zh=excluded.display_name_zh,
  description_zh=excluded.description_zh,
  source_name=excluded.source_name,
  schedule_mode=excluded.schedule_mode,
  configurable=excluded.configurable,
  allowed_intervals=excluded.allowed_intervals,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.snooker_sync_task_state(job_key)
select job_key from public.snooker_sync_policies
on conflict(job_key) do nothing;

create index if not exists snooker_sync_task_state_status_idx on public.snooker_sync_task_state(last_status,last_finished_at desc);
