alter table public.snooker_events add column if not exists expected_match_count integer;
update public.snooker_events set expected_match_count=23 where slug='shanghai-masters-2026';
update public.snooker_events set expected_match_count=33 where slug='china-open-2026';
update public.snooker_events set expected_match_count=51 where slug='wuhan-open-2026';
