create index if not exists snooker_breaks_frame_id_idx on public.snooker_breaks(frame_id) where frame_id is not null;
