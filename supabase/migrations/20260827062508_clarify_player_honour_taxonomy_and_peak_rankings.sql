alter table public.snooker_events drop constraint if exists snooker_events_ranking_status_check;
alter table public.snooker_events add constraint snooker_events_ranking_status_check check (ranking_status in ('ranking','minor_ranking','non_ranking','not_applicable'));

create or replace function snooker_internal.is_minor_ranking_event(p_name text)
returns boolean language sql immutable set search_path to '' as $$
  select coalesce(p_name,'') ~* '^[0-9]{4}[[:space:]]+(PTC|EPTC|APTC)[[:space:]]*-[[:space:]]*Event[[:space:]]+[0-9]+$'
      or coalesce(p_name,'') ~* '^[0-9]{4}[[:space:]]+(European|Asian)[[:space:]]+Tour[[:space:]]*-[[:space:]]*Event[[:space:]]+[0-9]+$';
$$;

create or replace function snooker_internal.is_the_masters(p_name text)
returns boolean language sql immutable set search_path to '' as $$
  select coalesce(p_name,'') ~* '^[0-9]{4}[[:space:]]+Masters$'
      or coalesce(p_name,'') ~* '^The[[:space:]]+Masters[[:space:]]+[0-9]{4}$'
      or coalesce(p_name,'') ~* '^MrQ[[:space:]]+Masters[[:space:]]+[0-9]{4}$'
      or coalesce(p_name,'') ~* '^Johnstone''s[[:space:]]+Paint[[:space:]]+Masters[[:space:]]+[0-9]{4}$';
$$;

create or replace function public.snooker_normalize_event_taxonomy()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.name_en ~* 'Q[ -]?School' or new.name_zh ~* 'Q[ -]?School' then
    new.event_type := 'pro_qualifier'; new.event_stage := 'main'; new.ranking_status := 'not_applicable'; return new;
  end if;
  if snooker_internal.is_minor_ranking_event(new.name_en) then
    new.event_type := 'ranking'; new.ranking_status := 'minor_ranking'; return new;
  end if;
  if new.event_type = 'ranking' and new.type_zh = '非排名赛' then
    new.event_type := 'invitational'; new.ranking_status := 'non_ranking';
  end if;
  if new.event_type = 'ranking' and (new.type_zh = '资格赛' or new.name_en ~* 'Qualifiers?' or new.name_zh like '%资格赛%') then
    new.event_stage := 'qualifier'; new.ranking_status := 'ranking';
  end if;
  if new.event_type = 'ranking' and new.ranking_status not in ('ranking','minor_ranking') then
    new.ranking_status := 'ranking';
  elsif new.event_type = 'invitational' and new.ranking_status in ('ranking','minor_ranking') then
    new.ranking_status := 'non_ranking';
  elsif new.event_type in ('exhibition','pro_qualifier') then
    new.ranking_status := 'not_applicable';
  end if;
  return new;
end;
$$;

update public.snooker_events set ranking_status='minor_ranking' where snooker_internal.is_minor_ranking_event(name_en);

create or replace function snooker_internal.event_family(p_name text)
returns text language sql immutable set search_path to '' as $$
  select case
    when p_name ilike '%6-Reds World Championship%' or p_name ilike '%6 Reds World Championship%' then 'six_reds_world_championship'
    when p_name ilike '%World Championship%' then 'world_championship'
    when p_name ilike '%UK Championship%' then 'uk_championship'
    when snooker_internal.is_the_masters(p_name) then 'masters'
    when p_name ilike '%Shanghai Masters%' then 'shanghai_masters'
    when p_name ilike '%German Masters%' then 'german_masters'
    when p_name ilike '%Saudi Arabia%Masters%' then 'saudi_arabia_masters'
    when p_name ilike '%Hong Kong Masters%' then 'hong_kong_masters'
    when p_name ilike '%Romanian Masters%' then 'romanian_masters'
    when p_name ilike '%Turkish Masters%' then 'turkish_masters'
    when p_name ilike '%European Masters%' then 'european_masters'
    when p_name ilike '%Riga Masters%' then 'riga_masters'
    when p_name ilike '%Scottish Masters%' then 'scottish_masters'
    when p_name ilike '%Irish Masters%' then 'irish_masters'
    when p_name ilike '%Thailand Masters%' then 'thailand_masters'
    when p_name ilike '%Brazil Masters%' then 'brazil_masters'
    when p_name ilike '%Malta Masters%' then 'malta_masters'
    when p_name ilike '%Guangzhou Masters%' then 'guangzhou_masters'
    when p_name ilike '%Championship League%' then 'championship_league'
    when p_name ilike '%Players Championship%' then 'players_championship'
    when p_name ilike '%Tour Championship%' then 'tour_championship'
    when p_name ilike '%World Grand Prix%' then 'world_grand_prix'
    when p_name ilike '%World Open%' then 'world_open'
    when p_name ilike '%English Open%' then 'english_open'
    when p_name ilike '%British Open%' then 'british_open'
    when p_name ilike '%Northern Ireland Open%' then 'northern_ireland_open'
    when p_name ilike '%Scottish Open%' then 'scottish_open'
    when p_name ilike '%Welsh Open%' then 'welsh_open'
    when p_name ilike '%China Open%' then 'china_open'
    when p_name ilike '%International Championship%' then 'international_championship'
    when p_name ilike '%Champion of Champions%' then 'champion_of_champions'
    when p_name ilike '%Shoot Out%' then 'shoot_out'
    when p_name ilike '%Q School%' then 'q_school'
    else 'other' end;
$$;

create or replace function snooker_internal.title_eligible(p_name text, p_event_type text, p_event_stage text)
returns boolean language sql immutable set search_path to '' as $$
  select case
    when coalesce(p_event_stage,'main') <> 'main' then false
    when coalesce(p_event_type,'') in ('pro_qualifier','qualifier','exhibition') then false
    when coalesce(p_name,'') ~* 'Qualif(ying|ier|iers|ication)' then false
    when p_name ilike '%Q School%' then false
    when p_name ilike '%Championship League%Winners Group%' then true
    when p_name ~* 'Championship League.*(\(Group [1-7]\)|Group (One|Two|Three|Four|Five|Six|Seven|[1-7]))' then false
    else true end;
$$;

create or replace function snooker_internal.honour_title_class(p_name text, p_event_type text, p_ranking_status text, p_event_stage text)
returns text language sql immutable set search_path to '' as $$
  select case
    when not snooker_internal.title_eligible(p_name,p_event_type,p_event_stage) then 'not_applicable'
    when snooker_internal.is_minor_ranking_event(p_name) or coalesce(p_ranking_status,'')='minor_ranking' then 'minor_ranking'
    when coalesce(p_event_type,'')='ranking' and coalesce(p_ranking_status,'ranking')='ranking' then 'ranking'
    else 'non_ranking' end;
$$;

alter table public.snooker_player_titles add column if not exists title_class text;
alter table public.snooker_player_titles drop constraint if exists snooker_player_titles_title_class_check;
alter table public.snooker_player_titles add constraint snooker_player_titles_title_class_check check (title_class in ('ranking','minor_ranking','non_ranking'));
alter table public.snooker_player_season_aggregates add column if not exists minor_ranking_titles integer, add column if not exists non_ranking_titles integer, add column if not exists professional_titles integer;
alter table public.snooker_player_career_aggregates add column if not exists minor_ranking_titles integer, add column if not exists non_ranking_titles integer, add column if not exists professional_titles integer;

create table if not exists public.snooker_player_peak_rankings (
  player_id uuid primary key references public.snooker_players(id) on delete cascade,
  highest_world_rank integer not null check (highest_world_rank > 0),
  source_name text not null,
  source_url text,
  source_note text,
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.snooker_player_peak_rankings enable row level security;
grant select on public.snooker_player_peak_rankings to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='snooker_player_peak_rankings' and policyname='public_read_snooker_player_peak_rankings') then
    create policy public_read_snooker_player_peak_rankings on public.snooker_player_peak_rankings for select to anon,authenticated using (true);
  end if;
end $$;

insert into public.snooker_player_peak_rankings(player_id,highest_world_rank,source_name,source_url,source_note)
select id,1,'WPBSA Ranking Records','https://www.wpbsa.com/rankings/ranking-records/','Official record of players who have held the world number one position'
from public.snooker_players
where slug in ('ray-reardon','cliff-thorburn','steve-davis','stephen-hendry','john-higgins','mark-williams','ronnie-osullivan','neil-robertson','mark-selby','judd-trump','ding-junhui','mark-allen')
on conflict(player_id) do update set highest_world_rank=excluded.highest_world_rank,source_name=excluded.source_name,source_url=excluded.source_url,source_note=excluded.source_note,verified_at=now(),updated_at=now();

create or replace function snooker_internal.normalize_player_title()
returns trigger language plpgsql set search_path to '' as $$
declare v_event public.snooker_events%rowtype; v_family text; v_class text;
begin
  select * into v_event from public.snooker_events where id=new.event_id;
  if not found or not snooker_internal.title_eligible(v_event.name_en,v_event.event_type,v_event.event_stage) then return null; end if;
  v_family := snooker_internal.event_family(v_event.name_en);
  v_class := snooker_internal.honour_title_class(v_event.name_en,v_event.event_type,v_event.ranking_status,v_event.event_stage);
  if v_class='not_applicable' then return null; end if;
  new.event_family := v_family; new.event_type := v_event.event_type; new.title_class := v_class;
  new.is_ranking_title := v_class='ranking';
  new.is_world_championship := v_family='world_championship';
  new.is_uk_championship := v_family='uk_championship';
  new.is_masters := v_family='masters';
  new.is_triple_crown_title := v_family in ('world_championship','uk_championship','masters');
  return new;
end $$;
drop trigger if exists trg_snooker_normalize_player_title on public.snooker_player_titles;
create trigger trg_snooker_normalize_player_title before insert or update of event_id on public.snooker_player_titles for each row execute function snooker_internal.normalize_player_title();

delete from public.snooker_player_titles t using public.snooker_events e where e.id=t.event_id and not snooker_internal.title_eligible(e.name_en,e.event_type,e.event_stage);
update public.snooker_player_titles set event_id=event_id;
alter table public.snooker_player_titles alter column title_class set not null;

create or replace function snooker_internal.normalize_season_honours()
returns trigger language plpgsql set search_path to '' as $$
declare v_total int; v_rank int; v_minor int; v_non int; v_tc int; v_world int; v_uk int; v_masters int; v_rank_finals int;
begin
  select count(*)::int,
         count(*) filter(where title_class='ranking')::int,
         count(*) filter(where title_class='minor_ranking')::int,
         count(*) filter(where title_class='non_ranking')::int,
         count(*) filter(where is_triple_crown_title)::int,
         count(*) filter(where is_world_championship)::int,
         count(*) filter(where is_uk_championship)::int,
         count(*) filter(where is_masters)::int
    into v_total,v_rank,v_minor,v_non,v_tc,v_world,v_uk,v_masters
  from public.snooker_player_titles where player_id=new.player_id and season=new.season;
  select count(*)::int into v_rank_finals
  from public.snooker_player_event_aggregates a join public.snooker_events e on e.id=a.event_id
  where a.player_id=new.player_id and a.season=new.season and (a.is_champion or a.is_runner_up)
    and snooker_internal.honour_title_class(e.name_en,e.event_type,e.ranking_status,e.event_stage)='ranking';
  new.titles_total:=v_total; new.professional_titles:=v_total; new.ranking_titles:=v_rank; new.minor_ranking_titles:=v_minor; new.non_ranking_titles:=v_non;
  new.ranking_finals:=v_rank_finals; new.triple_crown_titles:=v_tc; new.world_championship_titles:=v_world; new.uk_championship_titles:=v_uk; new.masters_titles:=v_masters;
  return new;
end $$;
drop trigger if exists trg_snooker_normalize_season_honours on public.snooker_player_season_aggregates;
create trigger trg_snooker_normalize_season_honours before insert or update on public.snooker_player_season_aggregates for each row execute function snooker_internal.normalize_season_honours();
update public.snooker_player_season_aggregates set calculated_at=calculated_at;

create or replace function snooker_internal.normalize_career_honours()
returns trigger language plpgsql set search_path to '' as $$
declare v_total int; v_rank int; v_minor int; v_non int; v_tc int; v_world int; v_uk int; v_masters int; v_rank_finals int;
begin
  select count(*)::int,
         count(*) filter(where title_class='ranking')::int,
         count(*) filter(where title_class='minor_ranking')::int,
         count(*) filter(where title_class='non_ranking')::int,
         count(*) filter(where is_triple_crown_title)::int,
         count(*) filter(where is_world_championship)::int,
         count(*) filter(where is_uk_championship)::int,
         count(*) filter(where is_masters)::int
    into v_total,v_rank,v_minor,v_non,v_tc,v_world,v_uk,v_masters
  from public.snooker_player_titles where player_id=new.player_id;
  select coalesce(sum(ranking_finals),0)::int into v_rank_finals from public.snooker_player_season_aggregates where player_id=new.player_id;
  new.titles_total:=v_total; new.professional_titles:=v_total; new.ranking_titles:=v_rank; new.minor_ranking_titles:=v_minor; new.non_ranking_titles:=v_non;
  new.ranking_finals:=v_rank_finals; new.triple_crown_titles:=v_tc; new.world_championship_titles:=v_world; new.uk_championship_titles:=v_uk; new.masters_titles:=v_masters;
  return new;
end $$;
drop trigger if exists trg_snooker_normalize_career_honours on public.snooker_player_career_aggregates;
create trigger trg_snooker_normalize_career_honours before insert or update on public.snooker_player_career_aggregates for each row execute function snooker_internal.normalize_career_honours();
update public.snooker_player_career_aggregates set calculated_at=calculated_at;
