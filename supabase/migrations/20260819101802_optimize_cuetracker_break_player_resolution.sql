do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='snooker_internal' and p.proname='import_cuetracker_event';

  v_def := replace(
    v_def,
    'select source_match_id,frame_no,public.snooker_find_player_id(trim(player1)) player_id,v::int break_value',
    'select source_match_id,frame_no,1::int player_side,v::int break_value'
  );
  v_def := replace(
    v_def,
    'select source_match_id,frame_no,public.snooker_find_player_id(trim(player2)),v::int',
    'select source_match_id,frame_no,2::int,v::int'
  );
  v_def := replace(
    v_def,
    'select m.id match_id,fr.id frame_id,br.player_id,br.frame_no,br.break_value,row_number() over(partition by m.id,br.frame_no,br.player_id,br.break_value order by br.break_value)::int break_seq',
    'select m.id match_id,fr.id frame_id,case when br.player_side=1 then m.player1_id else m.player2_id end player_id,br.frame_no,br.break_value,row_number() over(partition by m.id,br.frame_no,case when br.player_side=1 then m.player1_id else m.player2_id end,br.break_value order by br.break_value)::int break_seq'
  );
  v_def := replace(
    v_def,
    'where br.player_id is not null',
    'where (case when br.player_side=1 then m.player1_id else m.player2_id end) is not null'
  );
  execute v_def;
end $$;

revoke all on function snooker_internal.import_cuetracker_event(uuid) from public, anon, authenticated;
