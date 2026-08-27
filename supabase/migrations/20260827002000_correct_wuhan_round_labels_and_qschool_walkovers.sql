do $$
declare
  d text;
begin
  update public.snooker_rounds r
  set label_en='Round 1 (Held Over)', label_zh='第一轮（延期）', sort_order=1
  from public.snooker_events e
  where r.event_id=e.id and e.slug='wuhan-open-2026' and r.round_key='round-1-held-over';

  update public.snooker_rounds r
  set label_en='Round 2 (Held Over)', label_zh='第二轮', sort_order=2
  from public.snooker_events e
  where r.event_id=e.id and e.slug='wuhan-open-2026' and r.round_key='round-2-held-over';

  update public.snooker_matches m
  set status='walkover', updated_at=now()
  from public.snooker_events e
  where m.event_id=e.id
    and e.slug in ('asia-oceania-q-school-2026','asia-oceania-q-school-2026-event-2')
    and m.note ilike '%w/o%'
    and m.winner_id is not null
    and (m.score1 is null or m.score2 is null);

  select pg_get_functiondef('public.snooker_sync_wst_tournament(text)'::regprocedure) into d;
  d:=replace(d, '延期资格赛', '第一轮（延期）');
  d:=replace(d, '延期首轮', '第二轮');
  execute d;
end $$;
