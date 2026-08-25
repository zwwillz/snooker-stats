-- WST profile sync must refresh English source facts without deleting reviewed Chinese text.

do $do$
declare
  d text;
  old_block text := $old$
      delete from public.snooker_player_career_highlights where player_id=r.player_id;
      seq := 0;
      if jsonb_typeof(a->'careerHighlights')='array' then
        for h in select value from jsonb_array_elements(a->'careerHighlights') loop
          seq := seq + 1;
          if nullif(h->>'description','') is not null then
            insert into public.snooker_player_career_highlights(player_id,highlight_year,sequence_no,description_en,source_name,source_updated_at,updated_at)
            values(r.player_id,nullif(h->>'year','')::smallint,seq,h->>'description','WST',now(),now());
          end if;
        end loop;
      end if;
$old$;
  new_block text := $new$
      -- Never delete career highlights here: deleting rows destroys reviewed Chinese translations.
      -- Update WST English source fields only; description_zh and translation_updated_at stay intact.
      seq := 0;
      if jsonb_typeof(a->'careerHighlights')='array' then
        for h in select value from jsonb_array_elements(a->'careerHighlights') loop
          seq := seq + 1;
          if nullif(h->>'description','') is not null then
            insert into public.snooker_player_career_highlights(
              player_id,highlight_year,sequence_no,description_en,source_name,source_updated_at,updated_at
            ) values (
              r.player_id,nullif(h->>'year','')::smallint,seq,h->>'description','WST',now(),now()
            )
            on conflict (player_id,sequence_no) do update set
              highlight_year=excluded.highlight_year,
              description_en=excluded.description_en,
              source_name=excluded.source_name,
              source_updated_at=excluded.source_updated_at,
              updated_at=now();
          end if;
        end loop;
      end if;
$new$;
begin
  select pg_get_functiondef('snooker_internal.sync_wst_player_profiles_batch(integer,integer)'::regprocedure) into d;
  if position(old_block in d)=0 then
    raise exception 'Expected destructive career-highlight sync block not found; migration aborted';
  end if;
  d := replace(d, old_block, new_block);
  execute d;
end $do$;

comment on function snooker_internal.sync_wst_player_profiles_batch(integer,integer) is
'WST player profile sync. Career highlight English source fields are upserted and reviewed Chinese translations are never deleted or overwritten.';
