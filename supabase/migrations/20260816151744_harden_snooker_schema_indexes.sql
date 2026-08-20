create index if not exists snooker_matches_round_id_idx on public.snooker_matches(round_id);
create index if not exists snooker_matches_winner_id_idx on public.snooker_matches(winner_id);
create index if not exists snooker_ranking_snapshots_player_idx on public.snooker_ranking_snapshots(player_id);
create index if not exists snooker_sync_runs_event_idx on public.snooker_sync_runs(event_id);

drop policy if exists "deny_client_access_source_map" on public.snooker_source_entity_map;
create policy "deny_client_access_source_map"
on public.snooker_source_entity_map
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "deny_client_access_sync_runs" on public.snooker_sync_runs;
create policy "deny_client_access_sync_runs"
on public.snooker_sync_runs
for all
to anon, authenticated
using (false)
with check (false);
