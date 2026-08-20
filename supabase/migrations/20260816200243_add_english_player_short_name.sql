alter table public.snooker_players
  add column if not exists short_name_en text;

comment on column public.snooker_players.short_name_en is
  'Preferred compact English display name for rankings, match cards and other dense UI; curated and not necessarily identical to the source surname field.';

update public.snooker_players
set short_name_en = case
  when slug like 'china-wildcard-%' then name_en
  when slug like 'wuhan-winner-match-%' then name_en
  when name_en = 'Linhao Liu' then 'Liu'
  when name_en = 'Cheung Ka Wai' then 'Cheung'
  when country_code in ('CN', 'CHN') then split_part(trim(name_en), ' ', 1)
  else regexp_replace(trim(name_en), '^.*\s', '')
end,
updated_at = now();

update public.snooker_player_names n
set short_name = p.short_name_en,
    updated_at = now()
from public.snooker_players p
where n.player_id = p.id
  and n.locale = 'en';
