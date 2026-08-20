create or replace function snooker_internal.register_cuetracker_season(p_season text)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_html text;
  v_status int;
  v_season_db text;
  v_inserted int := 0;
  v_total int := 0;
begin
  if p_season !~ '^20[0-9]{2}-20[0-9]{2}$' then
    return jsonb_build_object('ok',false,'error','invalid_season','season',p_season);
  end if;
  v_season_db := substr(p_season,1,4)||'/'||substr(p_season,8,2);
  select status,content into v_status,v_html from extensions.http_get('https://cuetracker.net/Seasons/'||p_season);
  if v_status<>200 or v_html is null then
    return jsonb_build_object('ok',false,'error','http_error','status',v_status,'season',p_season);
  end if;

  with rows as (
    select m[1] dates,m[2] country,m[3] url,m[4]::int event_year,m[5] tourn_id,trim(m[6]) name_en,trim(m[7]) category
    from regexp_matches(v_html,'(?s)<tr>\s*<td>([^<]+)</td>\s*<td><img[^>]+alt="([^"]+)"[^>]*>\s*<a href="(https://cuetracker\.net/tournaments/[^"]+/(\d{4})/(\d+))">([^<]+)</a></td>\s*<td>([^<]+)</td>','g') m
  ), p as (
    select *,regexp_match(dates,'(\d{2})-(\d{2})\s*-\s*(\d{2})-(\d{2})') dm from rows
  ), prep as (
    select *,
      make_date(case when dm[2]::int>dm[4]::int then event_year-1 else event_year end,dm[2]::int,dm[1]::int) start_date,
      make_date(event_year,dm[4]::int,dm[3]::int) end_date,
      trim(both '-' from lower(regexp_replace(name_en,'[^a-zA-Z0-9]+','-','g'))) slug_base,
      substring(name_en from '^([0-9]{4})') event_year_text,
      case when category ilike '%Tour Qualifier%' then 'pro_qualifier'
           when category ilike '%Invitational%' or category ilike '%6-red%' or category ilike '%Non-Ranking%' then 'invitational'
           else 'ranking' end event_type
    from p where dm is not null
  ), named as (
    select *,case
      when name_en ilike '%Q School Asia-Oceania%Event 1%' then event_year_text||'亚太Q School 第1站'
      when name_en ilike '%Q School Asia-Oceania%Event 2%' then event_year_text||'亚太Q School 第2站'
      when name_en ilike '%Q School%Event 1%' then event_year_text||' Q School 第1站'
      when name_en ilike '%Q School%Event 2%' then event_year_text||' Q School 第2站'
      when name_en ilike '%Q School%Event 3%' then event_year_text||' Q School 第3站'
      when name_en ilike '%English Open%' then event_year_text||'英格兰公开赛'
      when name_en ilike '%Scottish Open%' then event_year_text||'苏格兰公开赛'
      when name_en ilike '%Northern Ireland Open%' then event_year_text||'北爱尔兰公开赛'
      when name_en ilike '%British Open%' then event_year_text||'英国公开赛'
      when name_en ilike '%European Masters%' then event_year_text||'欧洲大师赛'
      when name_en ilike '%German Masters%' then event_year_text||'德国大师赛'
      when name_en ilike '%Turkish Masters%' then event_year_text||'土耳其大师赛'
      when name_en ilike '%Gibraltar Open%' then event_year_text||'直布罗陀公开赛'
      when name_en ilike '%Hong Kong Masters%' then event_year_text||'香港大师赛'
      when name_en ilike '%Champion of Champions%' then event_year_text||'斯诺克冠中冠'
      when name_en ilike '%UK Championship%' then event_year_text||'斯诺克英国锦标赛'
      when name_en ilike '%World Grand Prix%' then event_year_text||'斯诺克世界大奖赛'
      when name_en ilike '%Players Championship%' then event_year_text||'斯诺克球员锦标赛'
      when name_en ilike '%Tour Championship%' then event_year_text||'斯诺克巡回锦标赛'
      when name_en ilike '%Snooker Shoot Out%' or name_en ilike '%Shoot Out%' then event_year_text||'斯诺克单局限时赛'
      when name_en ilike '%6-Reds World Championship%' then event_year_text||'六红球世界锦标赛'
      when name_en ilike '%WST Classic%' then event_year_text||' WST精英赛'
      when name_en ilike '%World Championship%' then event_year_text||'斯诺克世界锦标赛'
      when name_en ilike '%Masters%' and name_en not ilike '%German%' and name_en not ilike '%European%' and name_en not ilike '%Turkish%' and name_en not ilike '%Hong Kong%' then event_year_text||'斯诺克大师赛'
      when name_en ilike '%Championship League%' then case when event_type='invitational' then event_year_text||'斯诺克冠军联赛邀请赛' else event_year_text||'斯诺克冠军联赛' end
      else name_en end name_zh
    from prep
  ), ins as (
    insert into public.snooker_events(
      slug,season,name_en,name_zh,type_zh,status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,currency,
      source_name,source_event_id,source_url,source_updated_at,ranking_event,data_ready,expected_match_count,event_type,event_stage,ranking_status
    )
    select slug_base,v_season_db,name_en,name_zh,
      case when event_type='pro_qualifier' then '资格赛' when event_type='invitational' then '非排名赛' else '排名赛' end,
      'completed',start_date,end_date,
      case country when 'England' then '英格兰' when 'Thailand' then '泰国' when 'Germany' then '德国' when 'Hong Kong' then '中国香港'
        when 'Northern Ireland' then '北爱尔兰' when 'Scotland' then '苏格兰' when 'Wales' then '威尔士' when 'Turkey' then '土耳其'
        when 'Gibraltar' then '直布罗陀' when 'China' then '中国' when 'Saudi Arabia' then '沙特阿拉伯' else country end,
      '','',null,'GBP','CueTracker',tourn_id,url,now(),event_type='ranking',false,null,event_type,'main',
      case when event_type='pro_qualifier' then 'not_applicable' when event_type='invitational' then 'non_ranking' else 'ranking' end
    from named n
    where not exists(select 1 from public.snooker_events e where e.source_name='CueTracker' and e.source_event_id=n.tourn_id)
    returning id
  )
  select count(*) into v_inserted from ins;

  insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
  select 'event',id,'CueTracker',source_event_id,source_url,0.9,'verified'
  from public.snooker_events where season=v_season_db and source_name='CueTracker'
  on conflict(entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,confidence=excluded.confidence,mapping_status=excluded.mapping_status,updated_at=now();

  select count(*) into v_total from public.snooker_events where season=v_season_db and source_name='CueTracker';
  return jsonb_build_object('ok',true,'season',v_season_db,'inserted',v_inserted,'events',v_total);
end;
$$;

revoke all on function snooker_internal.register_cuetracker_season(text) from public, anon, authenticated;
