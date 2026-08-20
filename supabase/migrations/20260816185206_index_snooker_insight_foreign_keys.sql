create index if not exists snooker_events_previous_champion_player_idx on public.snooker_events(previous_champion_player_id) where previous_champion_player_id is not null;
create index if not exists snooker_match_statistics_player_idx on public.snooker_match_statistics(player_id);
create index if not exists snooker_match_h2h_player2_idx on public.snooker_match_head_to_head(player2_id);
