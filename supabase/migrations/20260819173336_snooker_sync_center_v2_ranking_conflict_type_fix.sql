do $$
declare d text;
begin
  select pg_get_functiondef('snooker_internal.sync_wpbsa_ranking_list(text)'::regprocedure) into d;
  d:=replace(d,'unmatched_player','player_not_found');
  execute d;
end $$;
