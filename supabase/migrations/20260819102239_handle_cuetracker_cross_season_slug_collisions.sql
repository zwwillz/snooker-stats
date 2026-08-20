do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='snooker_internal' and p.proname='register_cuetracker_season';

  v_def := replace(
    v_def,
    'select slug_base,v_season_db,name_en,name_zh,',
    'select case when exists(select 1 from public.snooker_events sx where sx.slug=n.slug_base) then n.slug_base||''-''||n.tourn_id else n.slug_base end,v_season_db,name_en,name_zh,'
  );
  execute v_def;
end $$;

revoke all on function snooker_internal.register_cuetracker_season(text) from public, anon, authenticated;
