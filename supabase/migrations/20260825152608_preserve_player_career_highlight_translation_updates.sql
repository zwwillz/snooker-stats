-- Preserve reviewed Chinese career-highlight translations when English source data is refreshed.

create or replace function public.snooker_preserve_career_highlight_translation()
returns trigger
language plpgsql
set search_path = public
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
