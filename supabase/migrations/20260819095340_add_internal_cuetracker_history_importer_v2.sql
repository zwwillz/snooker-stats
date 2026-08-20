create schema if not exists snooker_internal;
revoke all on schema snooker_internal from public, anon, authenticated;

create or replace function snooker_internal.import_cuetracker_event(p_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_event public.snooker_events%rowtype;
  v_html text;
  v_http_status int;
  v_player record;
  v_player_id uuid;
  v_player_slug text;
  v_profile_url text;
  v_parsed_matches int := 0;
  v_db_matches int := 0;
  v_frames int := 0;
  v_breaks int := 0;
  v_unmapped int := 0;
begin
  select * into v_event from public.snooker_events where id=p_event_id;
  if not found then
    return jsonb_build_object('ok',false,'error','event_not_found','event_id',p_event_id);
  end if;
  if coalesce(v_event.source_name,'') <> 'CueTracker' or v_event.source_url is null then
    return jsonb_build_object('ok',false,'error','not_cuetracker_event','event_id',p_event_id);
  end if;

  select status,content into v_http_status,v_html from extensions.http_get(v_event.source_url);
  if v_http_status <> 200 or v_html is null then
    return jsonb_build_object('ok',false,'error','http_error','status',v_http_status,'event_id',p_event_id,'url',v_event.source_url);
  end if;

  for v_player in
    with blocks as (
      select x block from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%'
    ), p as (
      select regexp_match(block,'player_1_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>') p1,
             regexp_match(block,'player_2_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>') p2
      from blocks
    ), players as (
      select trim(p1[2]) name_en,p1[1] url from p where p1 is not null
      union
      select trim(p2[2]),p2[1] from p where p2 is not null
    )
    select name_en,url,(regexp_match(url,'/players/([^/?]+)'))[1] source_id
    from players where name_en<>''
  loop
    v_player_id := null;
    if v_player.source_id is not null then
      select entity_id into v_player_id
      from public.snooker_source_entity_map
      where entity_type='player' and source_name='CueTracker' and source_id=v_player.source_id
      limit 1;
    end if;
    if v_player_id is null then
      v_player_id := public.snooker_find_player_id(v_player.name_en);
    end if;
    if v_player_id is null then
      v_player_slug := coalesce(v_player.source_id,trim(both '-' from lower(regexp_replace(v_player.name_en,'[^a-zA-Z0-9]+','-','g'))));
      if v_player_slug is null or v_player_slug='' then
        v_player_slug := 'cuetracker-'||substr(md5(v_player.name_en),1,12);
      end if;
      if exists(select 1 from public.snooker_players where slug=v_player_slug) then
        v_player_slug := v_player_slug||'-ct-'||substr(md5(v_player.name_en),1,6);
      end if;
      v_profile_url := regexp_replace(v_player.url,'/season/.*$','');
      insert into public.snooker_players(
        slug,name_en,name_zh,short_name_en,profile_source,is_current_tour,tour_status,tour_season,wst_published,player_status
      ) values (
        v_player_slug,v_player.name_en,v_player.name_en,v_player.name_en,v_profile_url,false,
        case when v_player.url ilike '%status=professional%' then 'inactive' when v_player.url ilike '%status=amateur%' then 'amateur' else 'unknown' end,
        v_event.season,null,
        case when v_player.url ilike '%status=professional%' then 'former_pro' when v_player.url ilike '%status=amateur%' then 'amateur' else 'unknown' end
      ) returning id into v_player_id;
    end if;
    if v_player.source_id is not null and v_player_id is not null then
      v_profile_url := regexp_replace(v_player.url,'/season/.*$','');
      insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
      values('player',v_player_id,'CueTracker',v_player.source_id,v_profile_url,0.9,'verified')
      on conflict(entity_type,source_name,source_id) do update
        set entity_id=excluded.entity_id,source_url=excluded.source_url,confidence=excluded.confidence,mapping_status=excluded.mapping_status,updated_at=now();
    end if;
  end loop;

  with blocks as (
    select x block from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%'
  ), stages as (
    select distinct trim((regexp_match(block,'<h5>([^<]+)</h5>'))[1]) stage from blocks
  ), prep as (
    select stage,
      trim(both '_' from lower(regexp_replace(stage,'[^a-zA-Z0-9]+','_','g'))) round_key,
      case
        when stage ~* '^Final$' then '决赛'
        when stage ~* 'Semi' then '半决赛'
        when stage ~* 'Quarter' then '1/4决赛'
        when stage ~* 'Last 16' then '16强'
        when stage ~* 'Last 32' then '32强'
        when stage ~* 'Last 64' then '64强'
        when stage ~* 'Last 128' then '128强'
        when stage ~* 'Last 144' then '144强'
        when stage ~* 'Last 96' then '96强'
        when stage ~* 'Round 4' then '第四轮'
        when stage ~* 'Round 3' then '第三轮'
        when stage ~* 'Round 2' then '第二轮'
        when stage ~* 'Round 1' then '第一轮'
        when stage ~* 'Qualif.*4' then '资格赛第四轮'
        when stage ~* 'Qualif.*3' then '资格赛第三轮'
        when stage ~* 'Qualif.*2' then '资格赛第二轮'
        when stage ~* 'Qualif.*1' then '资格赛第一轮'
        when stage ~* 'Prelim' then '预赛'
        when stage ~* 'Group' then '小组赛'
        else stage end label_zh,
      case
        when stage ~* '^Final$' then 700 when stage ~* 'Semi' then 600 when stage ~* 'Quarter' then 500
        when stage ~* 'Last 16' then 400 when stage ~* 'Last 32' then 300 when stage ~* 'Last 64' then 200
        when stage ~* 'Last 96' then 150 when stage ~* 'Last 128' then 120 when stage ~* 'Last 144' then 110
        when stage ~* 'Round 4' then 350 when stage ~* 'Round 3' then 300 when stage ~* 'Round 2' then 200 when stage ~* 'Round 1' then 100
        when stage ~* 'Qualif.*4' then 44 when stage ~* 'Qualif.*3' then 43 when stage ~* 'Qualif.*2' then 42 when stage ~* 'Qualif.*1' then 41
        when stage ~* 'Prelim' then 20 when stage ~* 'Group' then 50 else 250 end sort_order
    from stages where stage is not null and stage<>''
  )
  insert into public.snooker_rounds(event_id,round_key,label_en,label_zh,sort_order)
  select p_event_id,round_key,stage,label_zh,sort_order from prep
  on conflict(event_id,round_key) do update set label_en=excluded.label_en,label_zh=excluded.label_zh,sort_order=excluded.sort_order;

  with blocks as (
    select x block from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%'
  ), parsed as (
    select
      (regexp_match(block,'data-match-id="([0-9]+)"'))[1] source_match_id,
      trim((regexp_match(block,'<h5>([^<]+)</h5>'))[1]) stage,
      (regexp_match(block,'player_1_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>'))[2] player1,
      (regexp_match(block,'player_2_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>'))[2] player2,
      nullif((regexp_match(block,'player_1_score[^>]*>[^0-9]*([0-9]+)'))[1],'')::int score1,
      nullif((regexp_match(block,'player_2_score[^>]*>[^0-9]*([0-9]+)'))[1],'')::int score2,
      nullif((regexp_match(block,'best_of[^>]*>\(([0-9]+)\)'))[1],'')::int best_of,
      (regexp_match(block,'played_on[^>]*>\s*([0-9]{4}-[0-9]{2}-[0-9]{2})'))[1] played_on,
      coalesce((regexp_match(block,'(?s)<div class="player_1_name matchResultText mx-auto"[^>]*>(.*?)</div>'))[1],'') ilike '%Walkover%' p1_walkover,
      coalesce((regexp_match(block,'(?s)<div class="player_2_name matchResultText mx-auto"[^>]*>(.*?)</div>'))[1],'') ilike '%Walkover%' p2_walkover,
      block ilike '%Walkover%' is_walkover
    from blocks
  ), q as (
    select p.*,public.snooker_find_player_id(trim(player1)) player1_id,public.snooker_find_player_id(trim(player2)) player2_id,
      trim(both '_' from lower(regexp_replace(stage,'[^a-zA-Z0-9]+','_','g'))) round_key,
      row_number() over(order by played_on::date nulls last,source_match_id::bigint)::int match_no
    from parsed p where source_match_id is not null
  )
  insert into public.snooker_matches(event_id,round_id,source_match_id,match_no,player1_id,player2_id,score1,score2,best_of,status,scheduled_at,winner_id,note,source_updated_at,source_status,source_status_meta)
  select p_event_id,rd.id,q.source_match_id,q.match_no,q.player1_id,q.player2_id,q.score1,q.score2,q.best_of,'completed',
    case when q.played_on is null then null else ((q.played_on::date::timestamp + time '12:00') at time zone 'UTC') end,
    case when q.score1>q.score2 then q.player1_id when q.score2>q.score1 then q.player2_id when q.p1_walkover then q.player1_id when q.p2_walkover then q.player2_id else null end,
    case when q.is_walkover then 'Walkover' else null end,
    now(),'Completed',case when q.is_walkover then 'CueTracker:walkover' else 'CueTracker' end
  from q left join public.snooker_rounds rd on rd.event_id=p_event_id and rd.round_key=q.round_key
  where q.player1_id is not null and q.player2_id is not null
  on conflict(event_id,source_match_id) do update set
    round_id=excluded.round_id,match_no=excluded.match_no,player1_id=excluded.player1_id,player2_id=excluded.player2_id,
    score1=excluded.score1,score2=excluded.score2,best_of=excluded.best_of,status=excluded.status,scheduled_at=excluded.scheduled_at,
    winner_id=excluded.winner_id,note=excluded.note,source_updated_at=now(),source_status='Completed',source_status_meta=excluded.source_status_meta,updated_at=now();

  insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
  select 'match',m.id,'CueTracker',m.source_match_id,v_event.source_url,0.9,'verified'
  from public.snooker_matches m where m.event_id=p_event_id and m.source_match_id is not null
  on conflict(entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,confidence=excluded.confidence,mapping_status=excluded.mapping_status,updated_at=now();

  with blocks as (
    select x block from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%'
  ), p as (
    select (regexp_match(block,'data-match-id="([0-9]+)"'))[1] source_match_id,
           (regexp_match(block,'(?s)frame_scores[^>]*>\s*([^<]+)'))[1] frame_scores
    from blocks
  ), f as (
    select p.source_match_id,z.ordinality::int frame_no,trim(z.x) frame_text
    from p cross join lateral regexp_split_to_table(trim(p.frame_scores),';') with ordinality as z(x,ordinality)
    where p.frame_scores is not null and trim(z.x)<>'' and z.x like '%-%'
  ), parsed as (
    select f.*,
      nullif((regexp_match(split_part(frame_text,'-',1),'^\s*([0-9]+)'))[1],'')::int score1,
      nullif((regexp_match(split_part(frame_text,'-',2),'^\s*([0-9]+)'))[1],'')::int score2,
      (regexp_match(split_part(frame_text,'-',1),'\(([0-9,]+)\)'))[1] breaks1,
      (regexp_match(split_part(frame_text,'-',2),'\(([0-9,]+)\)'))[1] breaks2
    from f
  ), ready as (
    select m.id match_id,p.frame_no,p.score1,p.score2,
      (select max(v::int) from regexp_split_to_table(coalesce(p.breaks1,''),',') v where v~'^[0-9]+$') break1,
      (select max(v::int) from regexp_split_to_table(coalesce(p.breaks2,''),',') v where v~'^[0-9]+$') break2
    from parsed p join public.snooker_matches m on m.event_id=p_event_id and m.source_match_id=p.source_match_id
    where p.score1 is not null and p.score2 is not null
  )
  insert into public.snooker_frames(match_id,frame_no,score1,score2,break1,break2,status,source_updated_at)
  select match_id,frame_no,score1,score2,break1,break2,'completed',now() from ready
  on conflict(match_id,frame_no) do update set score1=excluded.score1,score2=excluded.score2,break1=excluded.break1,break2=excluded.break2,status='completed',source_updated_at=now(),updated_at=now();

  with blocks as (
    select x block from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%'
  ), p as (
    select (regexp_match(block,'data-match-id="([0-9]+)"'))[1] source_match_id,
      (regexp_match(block,'player_1_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>'))[2] player1,
      (regexp_match(block,'player_2_name matchResultText mx-auto"[^>]*>(?:<b>)?<img[^>]*>\s*<a href="([^"]+)">([^<]+)</a>'))[2] player2,
      (regexp_match(block,'(?s)frame_scores[^>]*>\s*([^<]+)'))[1] frame_scores
    from blocks
  ), f as (
    select p.*,z.ordinality::int frame_no,trim(z.x) frame_text
    from p cross join lateral regexp_split_to_table(trim(p.frame_scores),';') with ordinality as z(x,ordinality)
    where p.frame_scores is not null and trim(z.x)<>'' and z.x like '%-%'
  ), br as (
    select source_match_id,frame_no,public.snooker_find_player_id(trim(player1)) player_id,v::int break_value
    from f cross join lateral regexp_split_to_table(coalesce((regexp_match(split_part(frame_text,'-',1),'\(([0-9,]+)\)'))[1],''),',') v
    where v~'^[0-9]+$' and v::int>=50
    union all
    select source_match_id,frame_no,public.snooker_find_player_id(trim(player2)),v::int
    from f cross join lateral regexp_split_to_table(coalesce((regexp_match(split_part(frame_text,'-',2),'\(([0-9,]+)\)'))[1],''),',') v
    where v~'^[0-9]+$' and v::int>=50
  ), ready as (
    select m.id match_id,fr.id frame_id,br.player_id,br.frame_no,br.break_value
    from br join public.snooker_matches m on m.event_id=p_event_id and m.source_match_id=br.source_match_id
    join public.snooker_frames fr on fr.match_id=m.id and fr.frame_no=br.frame_no
    where br.player_id is not null
  )
  insert into public.snooker_breaks(match_id,frame_id,player_id,frame_no,break_value,source_name,source_updated_at)
  select match_id,frame_id,player_id,frame_no,break_value,'CueTracker',now() from ready
  on conflict(match_id,frame_no,player_id,break_value) do update set frame_id=excluded.frame_id,source_name='CueTracker',source_updated_at=now(),updated_at=now();

  with target as (
    select m.id,m.score1,m.score2,count(f.id) frame_count
    from public.snooker_matches m left join public.snooker_frames f on f.match_id=m.id
    where m.event_id=p_event_id
    group by m.id,m.score1,m.score2
  )
  update public.snooker_matches m set
    frames_complete=(t.frame_count=coalesce(t.score1,0)+coalesce(t.score2,0) and t.frame_count>0),updated_at=now()
  from target t where m.id=t.id;

  select count(*) into v_parsed_matches
  from regexp_split_to_table(v_html,'<div class="match row') x where x like '%data-match-id=%';
  select count(*) into v_db_matches from public.snooker_matches where event_id=p_event_id;
  select count(*) into v_frames from public.snooker_frames f join public.snooker_matches m on m.id=f.match_id where m.event_id=p_event_id;
  select count(*) into v_breaks from public.snooker_breaks b join public.snooker_matches m on m.id=b.match_id where m.event_id=p_event_id and b.source_name='CueTracker';
  v_unmapped := greatest(v_parsed_matches-v_db_matches,0);

  update public.snooker_events set expected_match_count=v_parsed_matches,data_ready=(v_unmapped=0),updated_at=now() where id=p_event_id;

  return jsonb_build_object('ok',true,'event_id',p_event_id,'event',v_event.name_en,'parsed_matches',v_parsed_matches,'db_matches',v_db_matches,'unmapped',v_unmapped,'frames',v_frames,'breaks',v_breaks,'data_ready',(v_unmapped=0));
end;
$$;

revoke all on function snooker_internal.import_cuetracker_event(uuid) from public, anon, authenticated;
