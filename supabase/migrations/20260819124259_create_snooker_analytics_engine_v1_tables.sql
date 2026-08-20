create schema if not exists snooker_internal;

create table if not exists public.snooker_player_event_aggregates (
  event_id uuid not null references public.snooker_events(id) on delete cascade,
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  season text not null,
  event_family text not null default 'other',
  event_is_ranking boolean not null default false,
  is_triple_crown_event boolean not null default false,
  match_entries integer not null default 0,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  matches_drawn integer not null default 0,
  walkovers_won integer not null default 0,
  walkovers_lost integer not null default 0,
  frames_won integer not null default 0,
  frames_lost integer not null default 0,
  frame_win_rate numeric(7,4),
  frame_data_matches integer not null default 0,
  frame_data_coverage_pct numeric(7,4),
  breaks_50_plus integer not null default 0,
  breaks_100_plus integer not null default 0,
  maximums integer not null default 0,
  highest_break integer,
  is_champion boolean not null default false,
  is_runner_up boolean not null default false,
  last_recorded_round_en text,
  last_recorded_round_zh text,
  data_through date,
  aggregation_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (event_id, player_id)
);

create index if not exists snooker_player_event_agg_player_season_idx on public.snooker_player_event_aggregates(player_id, season);
create index if not exists snooker_player_event_agg_season_champion_idx on public.snooker_player_event_aggregates(season, is_champion) where is_champion;
create index if not exists snooker_player_event_agg_family_idx on public.snooker_player_event_aggregates(event_family, player_id);

create table if not exists public.snooker_player_titles (
  event_id uuid not null references public.snooker_events(id) on delete cascade,
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  season text not null,
  title_date date,
  event_family text not null default 'other',
  event_type text,
  is_ranking_title boolean not null default false,
  is_triple_crown_title boolean not null default false,
  is_world_championship boolean not null default false,
  is_uk_championship boolean not null default false,
  is_masters boolean not null default false,
  aggregation_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (event_id, player_id)
);

create index if not exists snooker_player_titles_player_date_idx on public.snooker_player_titles(player_id, title_date desc);
create index if not exists snooker_player_titles_ranking_idx on public.snooker_player_titles(player_id, is_ranking_title) where is_ranking_title;
create index if not exists snooker_player_titles_triple_crown_idx on public.snooker_player_titles(player_id, is_triple_crown_title) where is_triple_crown_title;

create table if not exists public.snooker_player_season_aggregates (
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  season text not null,
  season_start_year smallint not null,
  event_entities_played integer not null default 0,
  match_entries integer not null default 0,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  matches_drawn integer not null default 0,
  match_win_rate numeric(7,4),
  walkovers_won integer not null default 0,
  walkovers_lost integer not null default 0,
  frames_won integer not null default 0,
  frames_lost integer not null default 0,
  frame_win_rate numeric(7,4),
  frame_data_matches integer not null default 0,
  frame_data_coverage_pct numeric(7,4),
  breaks_50_plus integer not null default 0,
  breaks_100_plus integer not null default 0,
  maximums integer not null default 0,
  highest_break integer,
  finals integer not null default 0,
  titles_total integer not null default 0,
  ranking_finals integer not null default 0,
  ranking_titles integer not null default 0,
  triple_crown_titles integer not null default 0,
  world_championship_titles integer not null default 0,
  uk_championship_titles integer not null default 0,
  masters_titles integer not null default 0,
  data_through date,
  is_final boolean not null default false,
  aggregation_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (player_id, season)
);

create index if not exists snooker_player_season_agg_season_wins_idx on public.snooker_player_season_aggregates(season, matches_won desc);
create index if not exists snooker_player_season_agg_season_centuries_idx on public.snooker_player_season_aggregates(season, breaks_100_plus desc);
create index if not exists snooker_player_season_agg_season_titles_idx on public.snooker_player_season_aggregates(season, titles_total desc);

create table if not exists public.snooker_player_career_aggregates (
  player_id uuid primary key references public.snooker_players(id) on delete cascade,
  seasons_played integer not null default 0,
  first_season text,
  last_season text,
  event_entities_played integer not null default 0,
  match_entries integer not null default 0,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  matches_lost integer not null default 0,
  matches_drawn integer not null default 0,
  match_win_rate numeric(7,4),
  walkovers_won integer not null default 0,
  walkovers_lost integer not null default 0,
  frames_won integer not null default 0,
  frames_lost integer not null default 0,
  frame_win_rate numeric(7,4),
  frame_data_matches integer not null default 0,
  frame_data_coverage_pct numeric(7,4),
  breaks_50_plus integer not null default 0,
  breaks_100_plus integer not null default 0,
  maximums integer not null default 0,
  highest_break integer,
  finals integer not null default 0,
  titles_total integer not null default 0,
  ranking_finals integer not null default 0,
  ranking_titles integer not null default 0,
  triple_crown_titles integer not null default 0,
  world_championship_titles integer not null default 0,
  uk_championship_titles integer not null default 0,
  masters_titles integer not null default 0,
  data_through date,
  aggregation_version text not null,
  calculated_at timestamptz not null default now()
);

create index if not exists snooker_player_career_agg_wins_idx on public.snooker_player_career_aggregates(matches_won desc);
create index if not exists snooker_player_career_agg_centuries_idx on public.snooker_player_career_aggregates(breaks_100_plus desc);
create index if not exists snooker_player_career_agg_titles_idx on public.snooker_player_career_aggregates(titles_total desc);
create index if not exists snooker_player_career_agg_ranking_titles_idx on public.snooker_player_career_aggregates(ranking_titles desc);

create table if not exists public.snooker_player_h2h_aggregates (
  player_low_id uuid not null references public.snooker_players(id) on delete cascade,
  player_high_id uuid not null references public.snooker_players(id) on delete cascade,
  match_records integer not null default 0,
  meetings_played integer not null default 0,
  player_low_wins integer not null default 0,
  player_high_wins integer not null default 0,
  draws integer not null default 0,
  player_low_walkovers integer not null default 0,
  player_high_walkovers integer not null default 0,
  player_low_frames integer not null default 0,
  player_high_frames integer not null default 0,
  first_meeting_date date,
  last_meeting_date date,
  aggregation_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (player_low_id, player_high_id),
  check (player_low_id < player_high_id)
);

create index if not exists snooker_h2h_low_idx on public.snooker_player_h2h_aggregates(player_low_id, meetings_played desc);
create index if not exists snooker_h2h_high_idx on public.snooker_player_h2h_aggregates(player_high_id, meetings_played desc);

create table if not exists snooker_internal.analytics_runs (
  id bigint generated always as identity primary key,
  run_type text not null,
  scope_type text,
  scope_value text,
  aggregation_version text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists analytics_runs_started_idx on snooker_internal.analytics_runs(started_at desc);

alter table public.snooker_player_event_aggregates enable row level security;
alter table public.snooker_player_titles enable row level security;
alter table public.snooker_player_season_aggregates enable row level security;
alter table public.snooker_player_career_aggregates enable row level security;
alter table public.snooker_player_h2h_aggregates enable row level security;

create policy public_read_snooker_player_event_aggregates on public.snooker_player_event_aggregates for select to anon, authenticated using (true);
create policy public_read_snooker_player_titles on public.snooker_player_titles for select to anon, authenticated using (true);
create policy public_read_snooker_player_season_aggregates on public.snooker_player_season_aggregates for select to anon, authenticated using (true);
create policy public_read_snooker_player_career_aggregates on public.snooker_player_career_aggregates for select to anon, authenticated using (true);
create policy public_read_snooker_player_h2h_aggregates on public.snooker_player_h2h_aggregates for select to anon, authenticated using (true);

grant select on public.snooker_player_event_aggregates, public.snooker_player_titles, public.snooker_player_season_aggregates, public.snooker_player_career_aggregates, public.snooker_player_h2h_aggregates to anon, authenticated;
revoke insert, update, delete, truncate on public.snooker_player_event_aggregates, public.snooker_player_titles, public.snooker_player_season_aggregates, public.snooker_player_career_aggregates, public.snooker_player_h2h_aggregates from anon, authenticated;
