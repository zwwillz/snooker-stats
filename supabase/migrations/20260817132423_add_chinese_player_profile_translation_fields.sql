alter table public.snooker_player_profile_details
  add column if not exists nickname_zh text,
  add column if not exists biography_html_zh text,
  add column if not exists quote_zh text,
  add column if not exists quote_source_zh text,
  add column if not exists translation_updated_at timestamptz;

alter table public.snooker_player_career_highlights
  add column if not exists description_zh text,
  add column if not exists translation_updated_at timestamptz;

alter table public.snooker_player_career_stats
  add column if not exists last_tournament_win_zh text,
  add column if not exists translation_updated_at timestamptz;
