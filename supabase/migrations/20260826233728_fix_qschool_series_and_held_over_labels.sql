do $$
declare
  v_asia2_series uuid;
  v_q2_series uuid;
  d text;
begin
  update public.snooker_event_series
  set name_en='Asia-Oceania Q School 2026 - Event 1', name_zh='2026亚太Q School第1站',
      event_type='pro_qualifier',start_date='2026-05-14',end_date='2026-05-18',updated_at=now()
  where slug='asia-oceania-q-school-2026';

  insert into public.snooker_event_series(slug,season,name_en,name_zh,event_type,start_date,end_date,source_name,source_series_id)
  values('asia-oceania-q-school-2026-event-2','2026/27','Asia-Oceania Q School 2026 - Event 2','2026亚太Q School第2站','pro_qualifier','2026-05-20','2026-05-24','snooker.org','2751')
  on conflict(slug) do update set name_en=excluded.name_en,name_zh=excluded.name_zh,event_type=excluded.event_type,start_date=excluded.start_date,end_date=excluded.end_date,source_name=excluded.source_name,source_series_id=excluded.source_series_id,updated_at=now()
  returning id into v_asia2_series;
  update public.snooker_events set series_id=v_asia2_series,stage_order=1,stage_name_en='Event 2',stage_name_zh='第2站',updated_at=now() where slug='asia-oceania-q-school-2026-event-2';

  update public.snooker_event_series
  set name_en='Q School 2026 - Event 1',name_zh='2026 Q School职业资格赛第1站',
      event_type='pro_qualifier',start_date='2026-05-20',end_date='2026-05-25',updated_at=now()
  where slug='q-school-2026';

  insert into public.snooker_event_series(slug,season,name_en,name_zh,event_type,start_date,end_date,source_name,source_series_id)
  values('q-school-2026-event-2','2026/27','Q School 2026 - Event 2','2026 Q School职业资格赛第2站','pro_qualifier','2026-05-26','2026-05-31','WST','c7efb48a-45a3-48a0-9109-2de97ba97c64')
  on conflict(slug) do update set name_en=excluded.name_en,name_zh=excluded.name_zh,event_type=excluded.event_type,start_date=excluded.start_date,end_date=excluded.end_date,source_name=excluded.source_name,source_series_id=excluded.source_series_id,updated_at=now()
  returning id into v_q2_series;
  update public.snooker_events set series_id=v_q2_series,stage_order=1,stage_name_en='Event 2',stage_name_zh='第2站',updated_at=now() where slug='q-school-2026-event-2';

  update public.snooker_rounds r set label_en='Round 1 (Held Over)',label_zh='延期资格赛',sort_order=1
  from public.snooker_events e where r.event_id=e.id and e.slug='wuhan-open-2026' and r.round_key='round-1-held-over';
  update public.snooker_rounds r set label_en='Round 2 (Held Over)',label_zh='延期首轮',sort_order=2
  from public.snooker_events e where r.event_id=e.id and e.slug='wuhan-open-2026' and r.round_key='round-2-held-over';

  select pg_get_functiondef('public.snooker_sync_wst_tournament(text)'::regprocedure) into d;
  d:=replace(d,
    $old$values(v_event_id,v_round_key,v_match->>'round',v_match->>'round',90,coalesce(nullif(v_match->>'numberOfFrames','')::int,0))$old$,
    $new$values(v_event_id,v_round_key,v_match->>'round',case v_match->>'round' when 'Round 1 (Held Over)' then '延期资格赛' when 'Round 2 (Held Over)' then '延期首轮' when 'Wildcard Round' then '外卡轮' when 'Final' then '决赛' when 'Semi Finals' then '半决赛' when 'Quarter Finals' then '1/4决赛' else v_match->>'round' end,case v_match->>'round' when 'Round 1 (Held Over)' then 1 when 'Round 2 (Held Over)' then 2 else 90 end,coalesce(nullif(v_match->>'numberOfFrames','')::int,0))$new$
  );
  execute d;
end $$;
