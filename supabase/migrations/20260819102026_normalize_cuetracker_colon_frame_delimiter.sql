do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='snooker_internal' and p.proname='import_cuetracker_event';

  v_def := replace(
    v_def,
    'cross join lateral regexp_split_to_table(trim(p.frame_scores),'';'') with ordinality',
    'cross join lateral regexp_split_to_table(trim(replace(p.frame_scores,'':'',''-'')),'';'') with ordinality'
  );
  execute v_def;
end $$;

revoke all on function snooker_internal.import_cuetracker_event(uuid) from public, anon, authenticated;
