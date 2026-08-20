do $$
declare v_def text;
begin
  select pg_get_functiondef('public.snooker_refresh_match_h2h(uuid)'::regprocedure) into v_def;
  v_def := replace(v_def,'page.size=200&sort=desc','page.size=1000&sort=desc');
  execute v_def;
end $$;
