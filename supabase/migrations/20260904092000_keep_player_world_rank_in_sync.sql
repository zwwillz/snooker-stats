-- Keep denormalized player ranking fields aligned with the canonical latest
-- WST/WPBSA world ranking snapshot used by the public ranking center.

create or replace function snooker_internal.sync_player_world_rank_from_snapshot()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_catalog'
as $$
begin
  update public.snooker_players
  set current_rank = new.rank,
      ranking_points = coalesce(new.ranking_money, new.points),
      updated_at = now()
  where id = new.player_id;

  return new;
end;
$$;

revoke all on function snooker_internal.sync_player_world_rank_from_snapshot() from public;

drop trigger if exists trg_snooker_world_rank_to_player on public.snooker_ranking_snapshots;
create trigger trg_snooker_world_rank_to_player
after insert on public.snooker_ranking_snapshots
for each row
when (new.ranking_type = 'world_official')
execute function snooker_internal.sync_player_world_rank_from_snapshot();

-- Repair existing drift immediately. The ranking snapshot is the canonical
-- source; snooker_players.current_rank / ranking_points are convenience fields.
update public.snooker_players p
set current_rank = r.rank,
    ranking_points = coalesce(r.ranking_money, r.points),
    updated_at = now()
from public.snooker_latest_rankings r
where r.list_key = 'world_official'
  and r.player_id = p.id
  and (
    p.current_rank is distinct from r.rank
    or p.ranking_points is distinct from coalesce(r.ranking_money, r.points)
  );
