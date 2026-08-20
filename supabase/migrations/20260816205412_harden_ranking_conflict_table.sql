create index if not exists snooker_ranking_conflicts_list_idx
  on public.snooker_ranking_sync_conflicts(ranking_list_id);
create index if not exists snooker_ranking_conflicts_resolved_player_idx
  on public.snooker_ranking_sync_conflicts(resolved_player_id)
  where resolved_player_id is not null;

create policy deny_public_snooker_ranking_conflicts
  on public.snooker_ranking_sync_conflicts
  for select
  to anon, authenticated
  using (false);
