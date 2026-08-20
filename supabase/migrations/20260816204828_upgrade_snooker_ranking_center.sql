create table public.snooker_ranking_lists (
  id uuid primary key default gen_random_uuid(),
  list_key text not null,
  ranking_group text not null check (ranking_group in ('current','qualification','season_end','history')),
  ranking_type text not null,
  season text not null,
  title_zh text not null,
  title_en text not null,
  description_zh text,
  source_name text not null,
  source_url text,
  source_external_id text,
  cutoff_date date,
  qualification_limit integer,
  is_live boolean not null default false,
  is_current boolean not null default true,
  sync_status text not null default 'pending' check (sync_status in ('pending','synced','partial','unavailable','error')),
  latest_captured_at timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_key, season)
);

alter table public.snooker_ranking_lists enable row level security;
create policy public_read_snooker_ranking_lists
  on public.snooker_ranking_lists for select
  to anon, authenticated
  using (true);
revoke all on table public.snooker_ranking_lists from anon, authenticated;
grant select on table public.snooker_ranking_lists to anon, authenticated;
grant all on table public.snooker_ranking_lists to service_role;

insert into public.snooker_ranking_lists
(list_key,ranking_group,ranking_type,season,title_zh,title_en,description_zh,source_name,source_url,source_external_id,cutoff_date,qualification_limit,is_live,is_current,sync_status,meta)
values
('world_official','current','world_official','2026/27','世界排名','Official World Rankings','官方两年滚动世界排名','WPBSA','https://www.wpbsa.com/rankings/world-rankings/',null,null,null,false,true,'pending','{"display_order":1}'::jsonb),
('world_live','current','world_live','2026/27','即时排名','Live World Rankings','当前赛事进行中的即时世界排名','WST','https://www.wst.tv/rankings?showLive=true',null,null,null,true,true,'pending','{"display_order":2}'::jsonb),
('one_year','current','one_year','2026/27','单赛季排名','One-Year Rankings','仅计算本赛季排名赛奖金','WST','https://www.wst.tv/rankings/76f3a1d0-5652-5ece-94b0-ea142a8e2e2e?showLive=false','76f3a1d0-5652-5ece-94b0-ea142a8e2e2e',null,null,false,true,'pending','{"display_order":3}'::jsonb),
('provisional_seeding','current','provisional_seeding','2026/27','临时排名','Provisional Seedings','下一排名修订节点的预测种子排名','WPBSA','https://www.wpbsa.com/rankings/latest-provisional-seedings/','994932439',null,null,false,true,'pending','{"display_order":4,"sheet_gid":"994932439"}'::jsonb),
('race_masters_2027','qualification','race_masters','2026/27','大师赛资格排名','Race to the Masters 2027','截至英国锦标赛结束的2027大师赛资格排名','WPBSA','https://www.wpbsa.com/rankings/race-to-the-masters/','62399750','2026-12-07',16,false,true,'pending','{"display_order":1,"sheet_gid":"62399750"}'::jsonb),
('race_crucible_2027','qualification','race_crucible','2026/27','世锦赛资格排名','Race to the Crucible 2027','截至巡回锦标赛结束的2027世锦赛正赛资格排名','WPBSA','https://www.wpbsa.com/rankings/race-to-the-crucible/','431492904','2027-04-06',16,false,true,'pending','{"display_order":2,"sheet_gid":"431492904"}'::jsonb),
('race_players_championship','qualification','race_players_championship','2026/27','球员锦标赛资格排名','Race to the Players Championship','按单赛季排名决定球员锦标赛资格；等待本赛季官方截止口径确认','WST',null,null,null,null,false,true,'pending','{"display_order":3,"derived_from":"one_year"}'::jsonb),
('race_tour_championship','qualification','race_tour_championship','2026/27','巡回锦标赛资格排名','Race to the Tour Championship','按单赛季排名决定巡回锦标赛资格；等待本赛季官方截止口径确认','WST',null,null,null,null,false,true,'pending','{"display_order":4,"derived_from":"one_year"}'::jsonb),
('provisional_eos','season_end','provisional_eos','2026/27','赛季末预测排名','Provisional End of Season Rankings','按赛季结束口径计算的预测世界排名','WPBSA','https://www.wpbsa.com/rankings/latest-provisional-eos-rankings/','1749434620',null,null,false,true,'pending','{"display_order":1,"sheet_gid":"1749434620"}'::jsonb),
('end_of_season','history','end_of_season','2025/26','2025/26赛季末排名','End of Season Rankings 2025/26','2025/26赛季结束后的最终世界排名快照','WST','https://www.wst.tv/rankings',null,'2026-05-04',null,false,false,'pending','{"display_order":1,"historical":true}'::jsonb)
on conflict (list_key,season) do nothing;

alter table public.snooker_ranking_snapshots
  add column ranking_list_id uuid,
  add column ranking_type text,
  add column ranking_money bigint,
  add column source_url text,
  add column source_player_name text,
  add column previous_rank integer,
  add column rank_change integer,
  add column cutoff_date date,
  add column meta jsonb not null default '{}'::jsonb;

update public.snooker_ranking_snapshots s
set ranking_list_id=l.id,
    ranking_type='world_official',
    ranking_money=s.points
from public.snooker_ranking_lists l
where l.list_key='world_official' and l.season=s.season;

alter table public.snooker_ranking_snapshots
  alter column ranking_list_id set not null,
  alter column ranking_type set not null,
  alter column ranking_money set not null,
  add constraint snooker_ranking_snapshots_ranking_list_id_fkey
    foreign key (ranking_list_id) references public.snooker_ranking_lists(id) on delete cascade;

alter table public.snooker_ranking_snapshots
  drop constraint snooker_ranking_snapshots_captured_at_player_id_key;

alter table public.snooker_ranking_snapshots
  add constraint snooker_ranking_snapshots_list_capture_player_key
  unique (ranking_list_id,captured_at,player_id);

create index snooker_ranking_snapshots_type_capture_rank_idx
  on public.snooker_ranking_snapshots(ranking_type,captured_at desc,rank);
create index snooker_ranking_snapshots_list_capture_rank_idx
  on public.snooker_ranking_snapshots(ranking_list_id,captured_at desc,rank);
create index snooker_ranking_snapshots_player_type_capture_idx
  on public.snooker_ranking_snapshots(player_id,ranking_type,captured_at desc);

create table public.snooker_ranking_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  ranking_list_id uuid references public.snooker_ranking_lists(id) on delete cascade,
  ranking_type text not null,
  source_name text not null,
  source_player_name text,
  source_rank integer,
  source_money bigint,
  conflict_type text not null check (conflict_type in ('player_not_found','ambiguous_player','source_parse_error','duplicate_rank','duplicate_player','source_unavailable')),
  details jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_player_id uuid references public.snooker_players(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.snooker_ranking_sync_conflicts enable row level security;
revoke all on table public.snooker_ranking_sync_conflicts from anon, authenticated;
grant all on table public.snooker_ranking_sync_conflicts to service_role;
create index snooker_ranking_conflicts_open_idx
  on public.snooker_ranking_sync_conflicts(ranking_type,captured_at desc)
  where resolved_at is null;

create or replace view public.snooker_latest_rankings
with (security_invoker=true) as
with latest as (
  select ranking_list_id,max(captured_at) captured_at
  from public.snooker_ranking_snapshots
  group by ranking_list_id
)
select s.*,l.list_key,l.ranking_group,l.title_zh,l.title_en,l.qualification_limit,l.cutoff_date as list_cutoff_date
from public.snooker_ranking_snapshots s
join latest x on x.ranking_list_id=s.ranking_list_id and x.captured_at=s.captured_at
join public.snooker_ranking_lists l on l.id=s.ranking_list_id;

revoke all on public.snooker_latest_rankings from anon,authenticated;
grant select on public.snooker_latest_rankings to anon,authenticated;
grant all on public.snooker_latest_rankings to service_role;
