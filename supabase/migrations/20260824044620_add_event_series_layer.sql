create table if not exists public.snooker_event_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  season text not null,
  name_en text not null,
  name_zh text not null,
  event_type text default 'ranking',
  start_date date,
  end_date date,
  source_name text,
  source_series_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.snooker_events
  add column if not exists series_id uuid references public.snooker_event_series(id);

create index if not exists idx_snooker_events_series_id on public.snooker_events(series_id);

create index if not exists idx_snooker_event_series_season on public.snooker_event_series(season);
