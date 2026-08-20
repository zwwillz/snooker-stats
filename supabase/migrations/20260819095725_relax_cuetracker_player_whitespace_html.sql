do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='snooker_internal' and p.proname='import_cuetracker_event';

  v_def := replace(
    v_def,
    $old$(?:<b>)?(?:<img[^>]*>\s*)?<a href="$old$,
    $new$\s*(?:<b>)?\s*(?:<img[^>]*>\s*)?<a href="$new$
  );
  execute v_def;
end $$;

revoke all on function snooker_internal.import_cuetracker_event(uuid) from public, anon, authenticated;
