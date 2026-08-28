drop index if exists public.snooker_frames_match_idx;

create or replace function snooker_internal.rebuild_cuetracker_match_source_map(p_dry_run boolean default false)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_candidate_count bigint := 0;
  v_existing_count bigint := 0;
  v_affected_count bigint := 0;
begin
  select count(*) into v_candidate_count
  from public.snooker_matches m
  join public.snooker_events e on e.id = m.event_id
  where e.source_name = 'CueTracker'
    and m.source_match_id is not null;

  select count(*) into v_existing_count
  from public.snooker_source_entity_map sem
  where sem.entity_type = 'match'
    and sem.source_name = 'CueTracker';

  if p_dry_run then
    return jsonb_build_object(
      'ok', true,
      'dry_run', true,
      'candidate_count', v_candidate_count,
      'existing_count', v_existing_count
    );
  end if;

  insert into public.snooker_source_entity_map(
    entity_type, entity_id, source_name, source_id, source_url, confidence, mapping_status
  )
  select
    'match', m.id, 'CueTracker', m.source_match_id, e.source_url, 0.9, 'verified'
  from public.snooker_matches m
  join public.snooker_events e on e.id = m.event_id
  where e.source_name = 'CueTracker'
    and m.source_match_id is not null
  on conflict(entity_type, source_name, source_id) do update
    set entity_id = excluded.entity_id,
        source_url = excluded.source_url,
        confidence = excluded.confidence,
        mapping_status = excluded.mapping_status,
        updated_at = now()
  where (public.snooker_source_entity_map.entity_id,
         public.snooker_source_entity_map.source_url,
         public.snooker_source_entity_map.confidence,
         public.snooker_source_entity_map.mapping_status)
        is distinct from
        (excluded.entity_id,
         excluded.source_url,
         excluded.confidence,
         excluded.mapping_status);

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'dry_run', false,
    'candidate_count', v_candidate_count,
    'existing_before', v_existing_count,
    'affected_count', v_affected_count,
    'existing_after', (
      select count(*)
      from public.snooker_source_entity_map sem
      where sem.entity_type = 'match'
        and sem.source_name = 'CueTracker'
    )
  );
end;
$$;

revoke all on function snooker_internal.rebuild_cuetracker_match_source_map(boolean) from public;
revoke all on function snooker_internal.rebuild_cuetracker_match_source_map(boolean) from anon;
revoke all on function snooker_internal.rebuild_cuetracker_match_source_map(boolean) from authenticated;

comment on function snooker_internal.rebuild_cuetracker_match_source_map(boolean)
is 'Recovery utility for CueTracker match source mappings. Reconstructs mappings from snooker_matches + CueTracker event metadata; intentionally does not preserve historical mapping created_at/updated_at values.';

do $do$
declare
  v_def text;
  v_marker text;
  v_start integer;
  v_next integer;
  v_new_def text;
begin
  v_def := pg_get_functiondef('snooker_internal.import_cuetracker_event(uuid)'::regprocedure);
  v_marker := 'insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)' || E'\n  select ''match'',m.id,''CueTracker'',m.source_match_id,v_event.source_url,0.9,''verified''';
  v_start := strpos(v_def, v_marker);
  if v_start = 0 then
    raise exception 'CueTracker match mapping write block was not found; importer not modified';
  end if;

  v_next := strpos(substring(v_def from v_start), E'\n\n  with blocks as (');
  if v_next = 0 then
    raise exception 'Could not find end of CueTracker match mapping write block; importer not modified';
  end if;

  v_new_def := substring(v_def from 1 for v_start - 1)
            || substring(v_def from v_start + v_next - 1);

  if strpos(v_new_def, 'select ''match'',m.id,''CueTracker'',m.source_match_id,v_event.source_url,0.9,''verified''') <> 0 then
    raise exception 'CueTracker match mapping write block removal verification failed';
  end if;

  if strpos(v_new_def, 'values(''player'',v_player_id,''CueTracker''') = 0 then
    raise exception 'CueTracker player mapping block unexpectedly missing; aborting';
  end if;

  execute v_new_def;
end;
$do$;
