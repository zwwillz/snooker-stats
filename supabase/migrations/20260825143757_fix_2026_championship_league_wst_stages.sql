do $$
declare
  v_wk1 uuid;
  v_wk2 uuid;
  v_wk3 uuid;
  v_s2w1 uuid;
  v_s2w2 uuid;
  v_final uuid;
begin
  select id into strict v_wk1 from public.snooker_events where source_name='WST' and source_event_id='221af158-c0f2-48cc-94a8-47b45a4a9c2d';
  select id into strict v_wk2 from public.snooker_events where source_name='WST' and source_event_id='130ef3b6-ef10-481f-b01b-541debd7e591';
  select id into strict v_wk3 from public.snooker_events where source_name='WST' and source_event_id='f377387b-3079-457f-8489-6f4629eb051d';
  select id into strict v_s2w1 from public.snooker_events where source_name='WST' and source_event_id='79bcd402-fe9a-4d16-930e-ce8f7eae2599';
  select id into strict v_s2w2 from public.snooker_events where source_name='WST' and source_event_id='24b1a5d3-bfe3-41df-b998-eacb7d83ce24';
  select id into strict v_final from public.snooker_events where source_name='WST' and source_event_id='a9c7a8a2-fc65-4ee5-9f15-752cdc8f2364';

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第一阶段·第1周）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='main', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage One/WK1', stage_name_zh='第一阶段 · 第1周', stage_order=1,
    data_ready=true, expected_match_count=72,
    previous_champion_player_id=null, previous_champion_name_zh=null, previous_champion_year=null,
    winner_prize=null, runner_up_prize=null, updated_at=now()
  where id=v_wk1;

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第一阶段·第2周）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='main', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage One/WK2', stage_name_zh='第一阶段 · 第2周', stage_order=2,
    data_ready=true, expected_match_count=72,
    previous_champion_player_id=null, previous_champion_name_zh=null, previous_champion_year=null,
    winner_prize=null, runner_up_prize=null, updated_at=now()
  where id=v_wk2;

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第一阶段·第3周）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='main', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage One/WK3', stage_name_zh='第一阶段 · 第3周', stage_order=3,
    data_ready=true, expected_match_count=48,
    previous_champion_player_id=null, previous_champion_name_zh=null, previous_champion_year=null,
    winner_prize=null, runner_up_prize=null, updated_at=now()
  where id=v_wk3;

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第二阶段·第1周）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='main', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage Two/WK1', stage_name_zh='第二阶段 · 第1周', stage_order=4,
    data_ready=true, expected_match_count=24,
    previous_champion_player_id=null, previous_champion_name_zh=null, previous_champion_year=null,
    winner_prize=null, runner_up_prize=null, updated_at=now()
  where id=v_s2w1;

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第二阶段·第2周）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='main', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage Two/WK2', stage_name_zh='第二阶段 · 第2周', stage_order=5,
    data_ready=true, expected_match_count=24,
    previous_champion_player_id=null, previous_champion_name_zh=null, previous_champion_year=null,
    winner_prize=null, runner_up_prize=null, updated_at=now()
  where id=v_s2w2;

  update public.snooker_events set
    name_zh='2026斯诺克冠军联赛（第三阶段及决赛）', sponsor_name='BetVictor', type_zh='排名赛',
    country_zh='英格兰', city_zh='莱斯特', venue_zh='马蒂奥利竞技场', venue_en='Mattioli Arena',
    event_type='ranking', event_stage='finals', ranking_status='ranking', ranking_event=true,
    stage_name_en='Stage Three & Final', stage_name_zh='第三阶段及决赛', stage_order=6,
    data_ready=true, expected_match_count=13, updated_at=now()
  where id=v_final;

  insert into public.snooker_rounds(event_id,round_key,label_en,label_zh,sort_order,best_of)
  values
    (v_wk1,'league-phase-stage-one','League Phase (STAGE ONE)','小组循环赛（第一阶段）',1,4),
    (v_wk2,'league-phase-stage-one','League Phase (STAGE ONE)','小组循环赛（第一阶段）',1,4),
    (v_wk3,'league-phase-stage-one','League Phase (STAGE ONE)','小组循环赛（第一阶段）',1,4),
    (v_s2w1,'league-phase-stage-two','League Phase (STAGE TWO)','小组循环赛（第二阶段）',1,4),
    (v_s2w2,'league-phase-stage-two','League Phase (STAGE TWO)','小组循环赛（第二阶段）',1,4),
    (v_final,'final','Final','决赛',1,5),
    (v_final,'league-phase-stage-three','League Phase (STAGE THREE)','小组循环赛（第三阶段）',2,4)
  on conflict(event_id,round_key) do update set
    label_en=excluded.label_en,label_zh=excluded.label_zh,sort_order=excluded.sort_order,best_of=excluded.best_of;

  update public.snooker_matches m
  set event_id=v_wk1,
      round_id=(select id from public.snooker_rounds where event_id=v_wk1 and round_key='league-phase-stage-one'),
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  where (m.scheduled_at at time zone 'UTC')::date between date '2026-06-22' and date '2026-06-27'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  update public.snooker_matches m
  set event_id=v_wk2,
      round_id=(select id from public.snooker_rounds where event_id=v_wk2 and round_key='league-phase-stage-one'),
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  where (m.scheduled_at at time zone 'UTC')::date between date '2026-06-29' and date '2026-07-04'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  update public.snooker_matches m
  set event_id=v_wk3,
      round_id=(select id from public.snooker_rounds where event_id=v_wk3 and round_key='league-phase-stage-one'),
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  where (m.scheduled_at at time zone 'UTC')::date between date '2026-07-06' and date '2026-07-09'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  update public.snooker_matches m
  set event_id=v_s2w1,
      round_id=(select id from public.snooker_rounds where event_id=v_s2w1 and round_key='league-phase-stage-two'),
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  where (m.scheduled_at at time zone 'UTC')::date between date '2026-07-10' and date '2026-07-11'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  update public.snooker_matches m
  set event_id=v_s2w2,
      round_id=(select id from public.snooker_rounds where event_id=v_s2w2 and round_key='league-phase-stage-two'),
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  where (m.scheduled_at at time zone 'UTC')::date between date '2026-07-13' and date '2026-07-14'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  update public.snooker_matches m
  set event_id=v_final,
      round_id=case when oldr.round_key='final'
        then (select id from public.snooker_rounds where event_id=v_final and round_key='final')
        else (select id from public.snooker_rounds where event_id=v_final and round_key='league-phase-stage-three') end,
      realtime_finalized_at=null,
      winner_id=case when m.score1 is not distinct from m.score2 then null else m.winner_id end,
      updated_at=now()
  from public.snooker_rounds oldr
  where m.round_id=oldr.id
    and (m.scheduled_at at time zone 'UTC')::date=date '2026-07-15'
    and m.source_match_id is not null
    and m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final);

  delete from public.snooker_rounds r
  where r.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final)
    and not exists(select 1 from public.snooker_matches m where m.round_id=r.id)
    and r.round_key not in ('league-phase-stage-one','league-phase-stage-two','league-phase-stage-three','final');

  update public.snooker_matches m
  set frames_complete=false
  where m.event_id in (v_wk1,v_wk2,v_wk3,v_s2w1,v_s2w2,v_final)
    and (select count(*) from public.snooker_frames f where f.match_id=m.id)
      < case when m.best_of=4 then 4 else coalesce(m.score1,0)+coalesce(m.score2,0) end;
end $$;
