alter table public.snooker_players
  add column if not exists player_status text not null default 'unknown';

alter table public.snooker_events
  add column if not exists event_type text not null default 'ranking',
  add column if not exists event_stage text not null default 'main',
  add column if not exists ranking_status text not null default 'ranking';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.snooker_players'::regclass
      and conname = 'snooker_players_player_status_check'
  ) then
    alter table public.snooker_players
      add constraint snooker_players_player_status_check
      check (player_status in ('tour','former_pro','amateur','unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.snooker_events'::regclass
      and conname = 'snooker_events_event_type_check'
  ) then
    alter table public.snooker_events
      add constraint snooker_events_event_type_check
      check (event_type in ('ranking','invitational','exhibition','pro_qualifier'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.snooker_events'::regclass
      and conname = 'snooker_events_event_stage_check'
  ) then
    alter table public.snooker_events
      add constraint snooker_events_event_stage_check
      check (event_stage in ('main','qualifier','finals'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.snooker_events'::regclass
      and conname = 'snooker_events_ranking_status_check'
  ) then
    alter table public.snooker_events
      add constraint snooker_events_ranking_status_check
      check (ranking_status in ('ranking','non_ranking','not_applicable'));
  end if;
end $$;

update public.snooker_players
set player_status = case
  when is_current_tour then 'tour'
  when slug ~* '^china-wildcard-[0-9]+(?:-|$)'
    or slug ~* '(^|-)winner-(of-)?match-[0-9]+(?:-|$)'
    or name_en ~* '^China Wildcard #?[0-9]+$'
    or name_en ~* '^Winner of Match [0-9]+$'
    or name_zh ~ '^中国外卡[0-9]+号$'
    or name_zh ~ '^第[0-9]+场胜者$'
    then 'unknown'
  when turned_pro is not null then 'former_pro'
  else 'amateur'
end;

update public.snooker_events
set
  event_type = case
    when name_en ~* 'Q[ -]?School' or name_zh ~* 'Q[ -]?School' then 'pro_qualifier'
    when type_zh = '非排名赛' then 'invitational'
    else 'ranking'
  end,
  event_stage = case
    when not (name_en ~* 'Q[ -]?School' or name_zh ~* 'Q[ -]?School')
      and (name_en ~* 'Qualifiers?' or name_zh like '%资格赛%')
      then 'qualifier'
    else 'main'
  end,
  ranking_status = case
    when name_en ~* 'Q[ -]?School' or name_zh ~* 'Q[ -]?School' then 'not_applicable'
    when type_zh = '非排名赛' then 'non_ranking'
    else 'ranking'
  end;

create table if not exists public.snooker_event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.snooker_events(id) on delete cascade,
  player_id uuid not null references public.snooker_players(id) on delete cascade,
  entry_type text not null default 'standard'
    check (entry_type in ('standard','qualifier','wildcard','invited','amateur_topup','unknown')),
  source_name text not null default 'curated',
  source_updated_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, player_id)
);

alter table public.snooker_event_entries enable row level security;

grant select on public.snooker_event_entries to anon, authenticated;
revoke insert, update, delete on public.snooker_event_entries from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='snooker_event_entries'
      and policyname='public_read_snooker_event_entries'
  ) then
    create policy public_read_snooker_event_entries
      on public.snooker_event_entries
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

create index if not exists idx_snooker_players_player_status
  on public.snooker_players(player_status, current_rank nulls last);
create index if not exists idx_snooker_events_taxonomy
  on public.snooker_events(season, event_type, event_stage, start_date);
create index if not exists idx_snooker_event_entries_player
  on public.snooker_event_entries(player_id, event_id);

comment on column public.snooker_players.player_status is
  'User-facing player identity classification: tour, former_pro, amateur, unknown. Event entry method is stored separately.';
comment on column public.snooker_events.event_type is
  'Primary event nature: ranking, invitational, exhibition, pro_qualifier.';
comment on column public.snooker_events.event_stage is
  'Event stage: main, qualifier, finals.';
comment on column public.snooker_events.ranking_status is
  'Whether the event belongs to the ranking system: ranking, non_ranking, not_applicable.';
comment on table public.snooker_event_entries is
  'Per-event participant entry method. Keeps wildcard/invited/qualifier context separate from persistent player identity.';

create or replace function public.snooker_player_detail_public(p_slug text)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'name_en', p.name_en,
      'name_zh', p.name_zh,
      'short_name_zh', p.short_name_zh,
      'nationality_zh', p.nationality_zh,
      'country_code', p.country_code,
      'date_of_birth', p.date_of_birth,
      'turned_pro', p.turned_pro,
      'current_rank', p.current_rank,
      'ranking_points', p.ranking_points,
      'avatar_url', p.avatar_url,
      'is_current_tour', p.is_current_tour,
      'tour_status', p.tour_status,
      'player_status', p.player_status
    ),
    'profile', (
      select jsonb_build_object(
        'nickname_en', d.nickname_en,
        'nickname_zh', d.nickname_zh,
        'biography_html_en', d.biography_html_en,
        'biography_html_zh', d.biography_html_zh,
        'quote_en', d.quote_en,
        'quote_zh', d.quote_zh
      )
      from public.snooker_player_profile_details d
      where d.player_id = p.id
      limit 1
    ),
    'career', (
      select jsonb_build_object(
        'ranking_titles', c.ranking_titles,
        'ranking_finals', c.ranking_finals,
        'highest_ranking', c.highest_ranking,
        'masters_titles', c.masters_titles,
        'uk_championship_titles', c.uk_championship_titles,
        'world_championship_titles', c.world_championship_titles,
        'triple_crown_titles', c.triple_crown_titles,
        'career_147s', c.career_147s,
        'last_tournament_win', c.last_tournament_win,
        'last_tournament_win_zh', c.last_tournament_win_zh
      )
      from public.snooker_player_career_stats c
      where c.player_id = p.id
      limit 1
    ),
    'seasons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season_start_year', s.season_start_year,
        'season_label', s.season_label,
        'ranking', s.ranking,
        'tournaments_won', s.tournaments_won,
        'points_scored', s.points_scored,
        'matches_played', s.matches_played,
        'matches_won', s.matches_won,
        'match_win_rate', s.match_win_rate,
        'average_shot_time', s.average_shot_time,
        'breaks_50_plus', s.breaks_50_plus,
        'breaks_100_plus', s.breaks_100_plus,
        'highest_break', s.highest_break,
        'season_147s', s.season_147s,
        'average_break', s.average_break,
        'is_final', s.is_final
      ) order by s.season_start_year desc)
      from public.snooker_player_season_stats s
      where s.player_id = p.id
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'highlight_year', h.highlight_year,
        'sequence_no', h.sequence_no,
        'description_en', h.description_en,
        'description_zh', h.description_zh
      ) order by h.highlight_year desc nulls last, h.sequence_no asc)
      from public.snooker_player_career_highlights h
      where h.player_id = p.id
    ), '[]'::jsonb),
    'official_ranking', (
      select jsonb_build_object(
        'player_id', r.player_id,
        'rank', r.rank,
        'points', r.points,
        'ranking_money', r.ranking_money
      )
      from public.snooker_latest_rankings r
      where r.player_id = p.id and r.list_key = 'world_official'
      order by r.rank asc
      limit 1
    )
  )
  from public.snooker_players p
  where p.slug = p_slug
  limit 1;
$function$;
