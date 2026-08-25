update public.snooker_events
set slug='betvictor-championship-league-snooker-2026-stage-one-wk1',updated_at=now()
where source_name='WST' and source_event_id='221af158-c0f2-48cc-94a8-47b45a4a9c2d';

update public.snooker_matches m
set winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
    frames_complete=((select count(*) from public.snooker_frames f where f.match_id=m.id) >= coalesce(m.score1,0)+coalesce(m.score2,0)),
    realtime_finalized_at=case when m.status in ('completed','walkover') then coalesce(m.realtime_finalized_at,now()) else m.realtime_finalized_at end,
    updated_at=now()
where m.event_id in (
  select id from public.snooker_events where source_event_id in (
    '221af158-c0f2-48cc-94a8-47b45a4a9c2d','130ef3b6-ef10-481f-b01b-541debd7e591','f377387b-3079-457f-8489-6f4629eb051d','79bcd402-fe9a-4d16-930e-ce8f7eae2599','24b1a5d3-bfe3-41df-b998-eacb7d83ce24','a9c7a8a2-fc65-4ee5-9f15-752cdc8f2364'
  )
);

select snooker_internal.refresh_current_season_analytics();
