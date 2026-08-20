alter table public.snooker_events
  add column if not exists previous_champion_player_id uuid references public.snooker_players(id) on delete set null,
  add column if not exists previous_champion_name_zh text,
  add column if not exists previous_champion_year integer;

create table if not exists public.snooker_event_prizes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.snooker_events(id) on delete cascade,
  prize_key text not null,
  label_zh text not null,
  label_en text,
  amount bigint not null check (amount >= 0),
  currency text not null default 'GBP',
  sort_order integer not null default 100,
  is_total boolean not null default false,
  source_name text not null default 'WST',
  source_url text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, prize_key)
);

create index if not exists snooker_event_prizes_event_idx
  on public.snooker_event_prizes(event_id, sort_order);

create table if not exists public.snooker_match_statistics (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.snooker_matches(id) on delete cascade,
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  side text not null check (side in ('home','away')),
  total_points integer,
  average_shot_time_seconds numeric(6,2),
  pot_rate numeric(6,2),
  breaks_50_plus integer,
  breaks_100_plus integer,
  highest_break integer,
  average_break numeric(8,2),
  shots_taken integer,
  time_on_table_pct numeric(6,2),
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, player_id)
);

create index if not exists snooker_match_statistics_match_idx
  on public.snooker_match_statistics(match_id);

create table if not exists public.snooker_match_head_to_head (
  match_id uuid primary key references public.snooker_matches(id) on delete cascade,
  player1_id uuid not null references public.snooker_players(id) on delete cascade,
  player2_id uuid not null references public.snooker_players(id) on delete cascade,
  meetings_before integer not null default 0,
  player1_wins integer not null default 0,
  player2_wins integer not null default 0,
  player1_frames integer not null default 0,
  player2_frames integer not null default 0,
  recent_meetings jsonb not null default '[]'::jsonb,
  source_name text not null default 'WST',
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists snooker_match_h2h_players_idx
  on public.snooker_match_head_to_head(player1_id, player2_id);

alter table public.snooker_event_prizes enable row level security;
alter table public.snooker_match_statistics enable row level security;
alter table public.snooker_match_head_to_head enable row level security;

drop policy if exists public_read_snooker_event_prizes on public.snooker_event_prizes;
create policy public_read_snooker_event_prizes on public.snooker_event_prizes
  for select to anon, authenticated using (true);

drop policy if exists public_read_snooker_match_statistics on public.snooker_match_statistics;
create policy public_read_snooker_match_statistics on public.snooker_match_statistics
  for select to anon, authenticated using (true);

drop policy if exists public_read_snooker_match_head_to_head on public.snooker_match_head_to_head;
create policy public_read_snooker_match_head_to_head on public.snooker_match_head_to_head
  for select to anon, authenticated using (true);

grant select on public.snooker_event_prizes, public.snooker_match_statistics, public.snooker_match_head_to_head to anon, authenticated;
