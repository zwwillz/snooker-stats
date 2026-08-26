do $$
declare d text;
begin
  update public.snooker_events set expected_match_count=78,updated_at=now() where slug='wuhan-open-qualifiers-2026';
  update public.snooker_events set expected_match_count=78,updated_at=now() where slug='shenzhen-open-qualifiers-2026';
  update public.snooker_events set expected_match_count=48,updated_at=now() where slug='british-open-qualifiers-2026';

  select pg_get_functiondef('snooker_internal.sync_wst_calendar()'::regprocedure) into d;
  d:=replace(d,
    'expected_match_count=case when v_match_count>0 then v_match_count else expected_match_count end,status=v_status',
    'expected_match_count=case when slug=''wuhan-open-qualifiers-2026'' then 78 when slug=''shenzhen-open-qualifiers-2026'' then 78 when slug=''british-open-qualifiers-2026'' then 48 when v_match_count>0 then v_match_count else expected_match_count end,status=v_status'
  );
  d:=replace(d,
    'or (v_match_count>0 and expected_match_count is distinct from v_match_count) or status is distinct from v_status)',
    'or (v_match_count>0 and expected_match_count is distinct from case when slug=''wuhan-open-qualifiers-2026'' then 78 when slug=''shenzhen-open-qualifiers-2026'' then 78 when slug=''british-open-qualifiers-2026'' then 48 else v_match_count end) or status is distinct from v_status)'
  );
  execute d;
end $$;
