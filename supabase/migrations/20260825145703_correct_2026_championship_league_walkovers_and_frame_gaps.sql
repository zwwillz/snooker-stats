do $$
declare
  v_match uuid;
begin
  -- Championship League's official Stage 1 results mark all three Kyren Wilson fixtures as WD.
  -- WST tournament JSON reports the awarded 0-3 score but one historical frame-history payload is contradictory;
  -- preserve the official awarded match result and remove non-played/contradictory frame rows.
  for v_match in
    select id from public.snooker_matches
    where source_match_id in (
      'ea7135e1-d870-4f94-86ac-d4b287c4474f',
      '205e0f9d-bf1f-4286-96e9-a961d16bb9ff',
      '2fdff36f-2aa7-4dec-b750-e8d8971d70d9'
    )
  loop
    delete from public.snooker_frames where match_id=v_match;
  end loop;

  update public.snooker_matches
  set status='walkover',
      winner_id=player2_id,
      note='凯伦·威尔逊退赛，WST按0比3判负',
      frames_complete=true,
      realtime_finalized_at=coalesce(realtime_finalized_at,now()),
      updated_at=now()
  where source_match_id in (
    'ea7135e1-d870-4f94-86ac-d4b287c4474f',
    '205e0f9d-bf1f-4286-96e9-a961d16bb9ff',
    '2fdff36f-2aa7-4dec-b750-e8d8971d70d9'
  );

  -- These two WST historical match-history payloads contain a final tied/zero placeholder frame
  -- while the tournament endpoint has the authoritative completed match score. Remove only the
  -- incomplete placeholder row and flag the frame detail as partial instead of inventing points.
  delete from public.snooker_frames f
  using public.snooker_matches m
  where f.match_id=m.id
    and m.source_match_id='c12823d3-7804-4d9c-944d-58bb825ff3ac'
    and f.frame_no=4
    and f.score1=f.score2;

  delete from public.snooker_frames f
  using public.snooker_matches m
  where f.match_id=m.id
    and m.source_match_id='c06a07a6-802a-487f-8fa6-7112600ae9b6'
    and f.frame_no=4
    and f.score1=f.score2;

  update public.snooker_matches
  set frames_complete=false,
      note='WST逐局历史未完整发布',
      updated_at=now()
  where source_match_id in (
    'c12823d3-7804-4d9c-944d-58bb825ff3ac',
    'c06a07a6-802a-487f-8fa6-7112600ae9b6'
  );
end $$;

select snooker_internal.refresh_current_season_analytics();
