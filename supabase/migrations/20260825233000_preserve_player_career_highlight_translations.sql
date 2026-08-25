-- Preserve curated Chinese career-highlight translations across WST profile refreshes.
-- Root cause: sync_wst_player_profiles_batch deleted all highlight rows and reinserted
-- English-only rows, which erased description_zh and translation_updated_at.

create or replace function public.snooker_preserve_career_highlight_translation()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.description_zh is null or btrim(new.description_zh) = '' then
    new.description_zh := old.description_zh;
  end if;
  if new.translation_updated_at is null then
    new.translation_updated_at := old.translation_updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_snooker_preserve_career_highlight_translation
  on public.snooker_player_career_highlights;
create trigger trg_snooker_preserve_career_highlight_translation
before update on public.snooker_player_career_highlights
for each row execute function public.snooker_preserve_career_highlight_translation();

-- IMPORTANT: the upstream profile sync must use UPSERT by (player_id, sequence_no),
-- not DELETE + INSERT. This trigger protects UPDATE paths; DELETE would still destroy
-- translations. The sync-function replacement is applied in production and should be
-- kept aligned with this migration when regenerated.