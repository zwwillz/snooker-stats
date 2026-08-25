-- Applied through Supabase MCP as production migration 20260824051746.
create table if not exists public.snooker_event_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  season text not null,
  name_en text not null,
  name_zh text not null,
  start_date date,
  end_date date,
  source_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists snooker_event_series_season_date_idx
  on public.snooker_event_series(season, start_date desc);

alter table public.snooker_event_series enable row level security;

drop policy if exists public_read_snooker_event_series on public.snooker_event_series;
create policy public_read_snooker_event_series
  on public.snooker_event_series for select to anon, authenticated using (true);

grant select on public.snooker_event_series to anon, authenticated;
revoke insert, update, delete, truncate on public.snooker_event_series from anon, authenticated;

alter table public.snooker_events
  add column if not exists series_id uuid references public.snooker_event_series(id) on delete restrict,
  add column if not exists stage_name_en text,
  add column if not exists stage_name_zh text,
  add column if not exists stage_order integer;

create index if not exists snooker_events_series_stage_idx
  on public.snooker_events(series_id, stage_order, start_date);

create schema if not exists snooker_internal;

create table if not exists snooker_internal.event_series_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  priority integer not null default 100,
  source_name_pattern text not null default '.*',
  season_pattern text not null default '.*',
  event_type_pattern text not null default '.*',
  event_name_pattern text not null,
  series_slug_template text not null,
  series_name_en_template text not null,
  series_name_zh_template text not null,
  stage_name_en_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table snooker_internal.event_series_rules enable row level security;
revoke all on snooker_internal.event_series_rules from public, anon, authenticated;

insert into snooker_internal.event_series_rules (
  rule_key, priority, source_name_pattern, event_type_pattern, event_name_pattern,
  series_slug_template, series_name_en_template, series_name_zh_template, stage_name_en_template
) values
  (
    'wst_championship_league_ranking_parenthesized', 10, '^WST$', '^ranking$',
    '^.*Championship League Snooker ([0-9]{4}) \((Stage .+)\)$',
    'championship-league-ranking-\1', 'Championship League Snooker \1', '\1斯诺克冠军联赛', '\2'
  ),
  (
    'wst_championship_league_ranking_hyphenated', 20, '^WST$', '^ranking$',
    '^.*Championship League Snooker ([0-9]{4})[[:space:]]*-[[:space:]]*(Stage .+)$',
    'championship-league-ranking-\1', 'Championship League Snooker \1', '\1斯诺克冠军联赛', '\2'
  ),
  (
    'wst_championship_league_ranking_base', 30, '^WST$', '^ranking$',
    '^.*Championship League Snooker ([0-9]{4})$',
    'championship-league-ranking-\1', 'Championship League Snooker \1', '\1斯诺克冠军联赛', 'Main Event'
  ),
  (
    'wst_championship_league_invitational_named', 40, '^WST$', '^invitational$',
    '^.*Championship League Snooker Invitational ([0-9]{4}) \((Group .+|Winners Group)\)$',
    'championship-league-invitational-\1', 'Championship League Snooker Invitational \1', '\1斯诺克冠军联赛邀请赛', '\2'
  ),
  (
    'wst_championship_league_invitational_legacy_groups', 50, '^WST$', '^invitational$',
    '^.*Championship League (Group ([0-9]+|One|Two|Three|Four|Five|Six|Seven)|Winners Group)$',
    'championship-league-invitational-{event_year}', 'Championship League Invitational {event_year}', '{event_year}斯诺克冠军联赛邀请赛', '\1'
  )
on conflict (rule_key) do update set
  priority = excluded.priority,
  source_name_pattern = excluded.source_name_pattern,
  event_type_pattern = excluded.event_type_pattern,
  event_name_pattern = excluded.event_name_pattern,
  series_slug_template = excluded.series_slug_template,
  series_name_en_template = excluded.series_name_en_template,
  series_name_zh_template = excluded.series_name_zh_template,
  stage_name_en_template = excluded.stage_name_en_template,
  enabled = excluded.enabled,
  updated_at = now();

create or replace function snooker_internal.localize_event_series_stage(p_stage text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_stage ~* '^Stage One/WK[0-9]+$' then '第一阶段 · 第' || substring(p_stage from '[0-9]+$') || '周'
    when p_stage ~* '^Stage Two/WK[0-9]+$' then '第二阶段 · 第' || substring(p_stage from '[0-9]+$') || '周'
    when p_stage ~* '^Stage Three[[:space:]]*&[[:space:]]*Final$' then '第三阶段及决赛'
    when p_stage ~* '^Stage One$' then '第一阶段'
    when p_stage ~* '^Stage Two[[:space:]]*&[[:space:]]*Three$' then '第二、三阶段'
    when p_stage ~* '^Group [0-9]+$' then '第' || substring(p_stage from '[0-9]+$') || '组'
    when p_stage ~* '^Winners Group$' then '胜者组'
    when p_stage ~* '^Main Event$' then '主赛事'
    else p_stage
  end
$$;

create or replace function snooker_internal.assign_event_series()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_rule snooker_internal.event_series_rules%rowtype;
  v_event_year text := coalesce(extract(year from new.start_date)::integer::text, split_part(new.season, '/', 1));
  v_season_start text := split_part(new.season, '/', 1);
  v_series_slug text;
  v_series_name_en text;
  v_series_name_zh text;
  v_stage_name_en text;
  v_series_id uuid;
begin
  select * into v_rule
  from snooker_internal.event_series_rules r
  where r.enabled
    and coalesce(new.source_name, '') ~* r.source_name_pattern
    and new.season ~* r.season_pattern
    and coalesce(new.event_type, '') ~* r.event_type_pattern
    and new.name_en ~* r.event_name_pattern
  order by r.priority, r.rule_key
  limit 1;

  if found then
    v_series_slug := pg_catalog.regexp_replace(new.name_en, v_rule.event_name_pattern, v_rule.series_slug_template, 'i');
    v_series_name_en := pg_catalog.regexp_replace(new.name_en, v_rule.event_name_pattern, v_rule.series_name_en_template, 'i');
    v_series_name_zh := pg_catalog.regexp_replace(new.name_en, v_rule.event_name_pattern, v_rule.series_name_zh_template, 'i');
    v_stage_name_en := pg_catalog.regexp_replace(new.name_en, v_rule.event_name_pattern, v_rule.stage_name_en_template, 'i');
  else
    if new.series_id is not null and exists (select 1 from public.snooker_event_series s where s.id = new.series_id) then
      new.stage_name_en := coalesce(nullif(new.stage_name_en, ''), new.name_en);
      new.stage_name_zh := coalesce(nullif(new.stage_name_zh, ''), new.name_zh);
      new.stage_order := coalesce(new.stage_order, 1);
      return new;
    end if;
    v_series_slug := 'event-' || new.slug;
    v_series_name_en := new.name_en;
    v_series_name_zh := new.name_zh;
    v_stage_name_en := new.name_en;
  end if;

  v_series_slug := pg_catalog.replace(pg_catalog.replace(v_series_slug, '{event_year}', v_event_year), '{season_start}', v_season_start);
  v_series_name_en := pg_catalog.replace(pg_catalog.replace(v_series_name_en, '{event_year}', v_event_year), '{season_start}', v_season_start);
  v_series_name_zh := pg_catalog.replace(pg_catalog.replace(v_series_name_zh, '{event_year}', v_event_year), '{season_start}', v_season_start);
  v_series_slug := pg_catalog.btrim(pg_catalog.lower(pg_catalog.regexp_replace(v_series_slug, '[^a-zA-Z0-9]+', '-', 'g')), '-');

  insert into public.snooker_event_series (slug, season, name_en, name_zh, start_date, end_date, source_name)
  values (v_series_slug, new.season, v_series_name_en, v_series_name_zh, new.start_date, new.end_date, new.source_name)
  on conflict (slug) do update set
    season = excluded.season,
    name_en = excluded.name_en,
    name_zh = excluded.name_zh,
    source_name = coalesce(excluded.source_name, public.snooker_event_series.source_name),
    updated_at = now()
  returning id into v_series_id;

  new.series_id := v_series_id;
  new.stage_name_en := coalesce(nullif(v_stage_name_en, ''), new.name_en);
  new.stage_name_zh := snooker_internal.localize_event_series_stage(new.stage_name_en);
  new.stage_order := coalesce(new.stage_order, 1);
  return new;
end;
$$;

create or replace function snooker_internal.refresh_event_series_bounds()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_series_id uuid;
  v_series_ids uuid[];
begin
  if tg_op = 'INSERT' then
    v_series_ids := array[new.series_id];
  elsif tg_op = 'DELETE' then
    v_series_ids := array[old.series_id];
  else
    v_series_ids := array[old.series_id, new.series_id];
  end if;

  foreach v_series_id in array v_series_ids
  loop
    if v_series_id is null then continue; end if;
    if exists (select 1 from public.snooker_events e where e.series_id = v_series_id) then
      update public.snooker_event_series s
      set start_date = a.start_date,
          end_date = a.end_date,
          updated_at = now()
      from (
        select min(e.start_date) as start_date, max(e.end_date) as end_date
        from public.snooker_events e
        where e.series_id = v_series_id
      ) a
      where s.id = v_series_id;
    else
      delete from public.snooker_event_series s where s.id = v_series_id;
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists assign_snooker_event_series on public.snooker_events;
create trigger assign_snooker_event_series
before insert or update of slug, season, name_en, name_zh, source_name, event_type, start_date, end_date
on public.snooker_events
for each row execute function snooker_internal.assign_event_series();

update public.snooker_events set name_en = name_en;

with ordered as (
  select id, row_number() over (partition by series_id order by start_date nulls last, end_date nulls last, slug)::integer as stage_order
  from public.snooker_events
)
update public.snooker_events e
set stage_order = ordered.stage_order
from ordered
where ordered.id = e.id;

update public.snooker_event_series s
set start_date = a.start_date,
    end_date = a.end_date,
    updated_at = now()
from (
  select series_id, min(start_date) as start_date, max(end_date) as end_date
  from public.snooker_events
  group by series_id
) a
where s.id = a.series_id;

delete from public.snooker_event_series s
where s.slug like 'event-%'
  and not exists (select 1 from public.snooker_events e where e.series_id = s.id);

alter table public.snooker_events alter column series_id set not null;
alter table public.snooker_events alter column stage_name_en set not null;
alter table public.snooker_events alter column stage_name_zh set not null;
alter table public.snooker_events alter column stage_order set not null;
alter table public.snooker_events add constraint snooker_events_stage_order_positive check (stage_order > 0) not valid;
alter table public.snooker_events validate constraint snooker_events_stage_order_positive;

drop trigger if exists refresh_snooker_event_series_bounds on public.snooker_events;
create trigger refresh_snooker_event_series_bounds
after insert or update of series_id, start_date, end_date or delete
on public.snooker_events
for each row execute function snooker_internal.refresh_event_series_bounds();

revoke all on function snooker_internal.localize_event_series_stage(text) from public, anon, authenticated;
revoke all on function snooker_internal.assign_event_series() from public, anon, authenticated;
revoke all on function snooker_internal.refresh_event_series_bounds() from public, anon, authenticated;

comment on table public.snooker_event_series is 'User-facing tournament editions. One series contains one or more source events/stages.';
comment on table snooker_internal.event_series_rules is 'Data-driven grouping rules used by the generic event-to-series trigger; source-specific cases are configuration, not application branches.';
comment on column public.snooker_events.series_id is 'User-facing tournament series while event_id remains the immutable WST/CueTracker stage identity.';
