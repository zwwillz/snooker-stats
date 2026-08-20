alter table public.snooker_breaks
  add column if not exists break_seq integer not null default 1;

alter table public.snooker_breaks
  drop constraint if exists snooker_breaks_match_id_frame_no_player_id_break_value_key;

alter table public.snooker_breaks
  drop constraint if exists snooker_breaks_break_seq_check;

alter table public.snooker_breaks
  add constraint snooker_breaks_break_seq_check check (break_seq > 0);

alter table public.snooker_breaks
  add constraint snooker_breaks_match_frame_player_value_seq_key
  unique (match_id,frame_no,player_id,break_value,break_seq);

-- Patch the private CueTracker importer so equal-valued breaks get stable sequence numbers.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='snooker_internal' and p.proname='import_cuetracker_event';

  v_def := replace(
    v_def,
    'select m.id match_id,fr.id frame_id,br.player_id,br.frame_no,br.break_value',
    'select m.id match_id,fr.id frame_id,br.player_id,br.frame_no,br.break_value,row_number() over(partition by m.id,br.frame_no,br.player_id,br.break_value order by br.break_value)::int break_seq'
  );
  v_def := replace(
    v_def,
    'insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at)',
    'insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,break_seq,source_name,source_updated_at)'
  );
  v_def := replace(
    v_def,
    'select match_id,frame_id,player_id,frame_no,break_value,''CueTracker'',now() from ready',
    'select match_id,frame_id,player_id,frame_no,break_value,break_seq,''CueTracker'',now() from ready'
  );
  v_def := replace(
    v_def,
    'on conflict(match_id,frame_no,player_id,break_value) do update',
    'on conflict(match_id,frame_no,player_id,break_value,break_seq) do update'
  );
  execute v_def;
end $$;

revoke all on function snooker_internal.import_cuetracker_event(uuid) from public, anon, authenticated;
