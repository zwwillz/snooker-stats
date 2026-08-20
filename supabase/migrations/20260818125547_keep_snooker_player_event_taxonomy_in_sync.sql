create or replace function public.snooker_normalize_player_status()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.slug ~* '^china-wildcard-[0-9]+(?:-|$)'
     or new.slug ~* '(^|-)winner-(of-)?match-[0-9]+(?:-|$)'
     or new.name_en ~* '^China Wildcard #?[0-9]+$'
     or new.name_en ~* '^Winner of Match [0-9]+$'
     or new.name_zh ~ '^中国外卡[0-9]+号$'
     or new.name_zh ~ '^第[0-9]+场胜者$' then
    new.player_status := 'unknown';
    return new;
  end if;

  if new.is_current_tour then
    new.player_status := 'tour';
  elsif new.player_status = 'tour' or new.player_status = 'unknown' then
    if new.turned_pro is not null then
      new.player_status := 'former_pro';
    else
      new.player_status := 'amateur';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_snooker_normalize_player_status on public.snooker_players;
create trigger trg_snooker_normalize_player_status
before insert or update of is_current_tour, turned_pro, tour_status, player_status, slug, name_en, name_zh
on public.snooker_players
for each row execute function public.snooker_normalize_player_status();

create or replace function public.snooker_normalize_event_taxonomy()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.name_en ~* 'Q[ -]?School' or new.name_zh ~* 'Q[ -]?School' then
    new.event_type := 'pro_qualifier';
    new.event_stage := 'main';
    new.ranking_status := 'not_applicable';
    return new;
  end if;

  if new.event_type = 'ranking' and new.type_zh = '非排名赛' then
    new.event_type := 'invitational';
    new.ranking_status := 'non_ranking';
  end if;

  if new.event_type = 'ranking'
     and (new.type_zh = '资格赛' or new.name_en ~* 'Qualifiers?' or new.name_zh like '%资格赛%') then
    new.event_stage := 'qualifier';
    new.ranking_status := 'ranking';
  end if;

  if new.event_type = 'ranking' and new.ranking_status <> 'ranking' then
    new.ranking_status := 'ranking';
  elsif new.event_type = 'invitational' and new.ranking_status = 'ranking' then
    new.ranking_status := 'non_ranking';
  elsif new.event_type in ('exhibition','pro_qualifier') then
    new.ranking_status := 'not_applicable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_snooker_normalize_event_taxonomy on public.snooker_events;
create trigger trg_snooker_normalize_event_taxonomy
before insert or update of name_en, name_zh, type_zh, event_type, event_stage, ranking_status
on public.snooker_events
for each row execute function public.snooker_normalize_event_taxonomy();

create or replace function public.snooker_sync_event_entries_from_match()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_event_type text;
  v_round_key text;
  v_round_en text;
  v_round_zh text;
  v_player_id uuid;
  v_player_status text;
  v_entry_type text;
begin
  select e.event_type into v_event_type
  from public.snooker_events e
  where e.id = new.event_id;

  if new.round_id is not null then
    select r.round_key, r.label_en, r.label_zh
      into v_round_key, v_round_en, v_round_zh
    from public.snooker_rounds r
    where r.id = new.round_id;
  end if;

  foreach v_player_id in array array[new.player1_id,new.player2_id]
  loop
    select p.player_status into v_player_status
    from public.snooker_players p where p.id=v_player_id;

    if v_player_status is null or v_player_status='unknown' then
      continue;
    end if;

    v_entry_type := null;

    if v_event_type='invitational' then
      v_entry_type := case when v_player_status='amateur' then 'wildcard' else 'invited' end;
    elsif (coalesce(v_round_key,'') ilike '%wild%'
           or coalesce(v_round_en,'') ilike '%wild%'
           or coalesce(v_round_zh,'') like '%外卡%')
          and v_player_status='amateur' then
      v_entry_type := 'wildcard';
    end if;

    if v_entry_type is not null then
      insert into public.snooker_event_entries(event_id,player_id,entry_type,source_name,source_updated_at,raw)
      values(new.event_id,v_player_id,v_entry_type,'derived',now(),jsonb_build_object('match_id',new.id,'basis','match/event taxonomy'))
      on conflict(event_id,player_id) do update
      set entry_type = case
            when excluded.entry_type='wildcard' then 'wildcard'
            when public.snooker_event_entries.entry_type in ('standard','unknown') then excluded.entry_type
            else public.snooker_event_entries.entry_type
          end,
          source_updated_at=now(),
          updated_at=now();
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.snooker_sync_event_entries_from_match() from public, anon, authenticated;

drop trigger if exists trg_snooker_sync_event_entries_from_match on public.snooker_matches;
create trigger trg_snooker_sync_event_entries_from_match
after insert or update of event_id, round_id, player1_id, player2_id
on public.snooker_matches
for each row execute function public.snooker_sync_event_entries_from_match();
