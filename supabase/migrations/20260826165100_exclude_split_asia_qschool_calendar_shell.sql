do $$
declare d text;
begin
  select pg_get_functiondef('snooker_internal.sync_wst_calendar()'::regprocedure) into d;
  if position('af5ffef0-3e49-4698-9f23-f991f7cb0448' in d)=0 then
    d:=replace(d,
      'v_seen:=v_seen+1; v_match_count:=',
      'if v_id=''af5ffef0-3e49-4698-9f23-f991f7cb0448'' then continue; end if; v_seen:=v_seen+1; v_match_count:='
    );
    execute d;
  end if;
end $$;
