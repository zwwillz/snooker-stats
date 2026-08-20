alter table public.snooker_players
  add column if not exists is_current_tour boolean not null default false,
  add column if not exists tour_status text not null default 'unknown',
  add column if not exists tour_season text,
  add column if not exists wst_published boolean;

alter table public.snooker_players
  drop constraint if exists snooker_players_tour_status_check;
alter table public.snooker_players
  add constraint snooker_players_tour_status_check
  check (tour_status in ('professional','amateur','wildcard','unknown','inactive'));

create table if not exists public.snooker_player_profile_details (
  player_id uuid primary key references public.snooker_players(id) on delete cascade,
  nickname_en text,
  biography_html_en text,
  quote_en text,
  quote_source_en text,
  sponsors jsonb not null default '[]'::jsonb,
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.snooker_player_career_stats (
  player_id uuid primary key references public.snooker_players(id) on delete cascade,
  ranking_titles integer,
  ranking_finals integer,
  highest_ranking integer,
  profile_current_ranking integer,
  masters_titles integer,
  uk_championship_titles integer,
  world_championship_titles integer,
  triple_crown_titles integer,
  career_triple_crown boolean,
  career_147s integer,
  last_tournament_win text,
  hide_stats boolean not null default false,
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.snooker_player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  season_start_year smallint not null,
  season_label text not null,
  ranking integer,
  tournaments_won integer,
  points_scored bigint,
  matches_played integer,
  matches_won integer,
  match_win_rate numeric(6,2),
  average_shot_time numeric(7,2),
  breaks_50_plus integer,
  breaks_100_plus integer,
  highest_break integer,
  season_147s integer,
  average_break numeric(7,2),
  is_final boolean not null default false,
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, season_start_year)
);

create table if not exists public.snooker_player_career_highlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  highlight_year smallint,
  sequence_no integer not null,
  description_en text not null,
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, sequence_no)
);

create index if not exists idx_snooker_players_current_tour on public.snooker_players(is_current_tour, current_rank);
create index if not exists idx_snooker_player_season_stats_season on public.snooker_player_season_stats(season_start_year, ranking);
create index if not exists idx_snooker_player_career_highlights_player_year on public.snooker_player_career_highlights(player_id, highlight_year);

alter table public.snooker_player_profile_details enable row level security;
alter table public.snooker_player_career_stats enable row level security;
alter table public.snooker_player_season_stats enable row level security;
alter table public.snooker_player_career_highlights enable row level security;

create policy "public_read_snooker_player_profile_details"
  on public.snooker_player_profile_details for select to anon, authenticated using (true);
create policy "public_read_snooker_player_career_stats"
  on public.snooker_player_career_stats for select to anon, authenticated using (true);
create policy "public_read_snooker_player_season_stats"
  on public.snooker_player_season_stats for select to anon, authenticated using (true);
create policy "public_read_snooker_player_career_highlights"
  on public.snooker_player_career_highlights for select to anon, authenticated using (true);

grant select on public.snooker_player_profile_details to anon, authenticated;
grant select on public.snooker_player_career_stats to anon, authenticated;
grant select on public.snooker_player_season_stats to anon, authenticated;
grant select on public.snooker_player_career_highlights to anon, authenticated;
