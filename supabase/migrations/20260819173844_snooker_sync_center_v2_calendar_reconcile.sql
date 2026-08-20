do $$
declare r record;
begin
  for r in
    select a.id old_id,b.id new_id
    from public.snooker_events a
    join public.snooker_events b on a.season=b.season and a.start_date=b.start_date and a.id<>b.id
    where a.season=snooker_internal.current_season() and a.source_event_id is null and b.source_event_id is not null
      and not exists(select 1 from public.snooker_matches m where m.event_id=b.id)
      and not exists(select 1 from public.snooker_rounds rr where rr.event_id=b.id)
  loop
    update public.snooker_events a set
      source_name='WST',source_event_id=b.source_event_id,source_url=b.source_url,source_updated_at=b.source_updated_at,
      end_date=coalesce(b.end_date,a.end_date),country_zh=coalesce(nullif(b.country_zh,''),a.country_zh),city_zh=coalesce(nullif(b.city_zh,''),a.city_zh),
      venue_en=coalesce(nullif(b.venue_en,''),a.venue_en),expected_match_count=coalesce(b.expected_match_count,a.expected_match_count),
      event_type=coalesce(b.event_type,a.event_type),event_stage=coalesce(b.event_stage,a.event_stage),ranking_status=coalesce(b.ranking_status,a.ranking_status),updated_at=now()
    from public.snooker_events b where a.id=r.old_id and b.id=r.new_id;

    update public.snooker_source_entity_map set entity_id=r.old_id,updated_at=now() where entity_type='event' and entity_id=r.new_id;
    delete from public.snooker_events where id=r.new_id;
  end loop;
end $$;

create or replace function snooker_internal.sync_wst_calendar()
returns jsonb language plpgsql set search_path='public','extensions','pg_catalog' as $$
declare
  v_page int; v_resp extensions.http_response; v_item jsonb; v_id text; v_name text; v_start date; v_end date; v_existing uuid; v_slug text;
  v_seen int:=0; v_inserted int:=0; v_updated int:=0; v_linked int:=0; v_season text:=snooker_internal.current_season(); v_start_year int:=split_part(v_season,'/',1)::int;
  v_event_type text; v_event_stage text; v_status text; v_match_count int; v_candidates int;
begin
  for v_page in 1..2 loop
    v_resp:=extensions.http_get(('https://tournaments.snooker.web.gc.wstservices.co.uk/v2?page.number='||v_page)::varchar);
    if v_resp.status<>200 then raise exception 'WST calendar HTTP % page %',v_resp.status,v_page; end if;
    for v_item in select value from jsonb_array_elements(v_resp.content::jsonb->'data') loop
      v_id:=v_item->>'id'; v_name:=v_item#>>'{attributes,name}';
      v_start:=nullif(v_item#>>'{attributes,startDate}','')::date; v_end:=nullif(v_item#>>'{attributes,endDate}','')::date;
      if v_start is null or v_start<make_date(v_start_year,5,1) or v_start>make_date(v_start_year+1,5,31) then continue; end if;
      v_seen:=v_seen+1; v_match_count:=coalesce(nullif(v_item#>>'{attributes,matchCount}','')::int,0);
      select id into v_existing from public.snooker_events where source_name='WST' and source_event_id=v_id limit 1;
      if v_existing is null then
        select count(*),min(id) into v_candidates,v_existing from public.snooker_events where season=v_season and start_date=v_start and source_event_id is null;
        if v_candidates<>1 then v_existing:=null; else v_linked:=v_linked+1; end if;
      end if;
      v_event_type:=case when v_name~*'Q[ -]?School' then 'pro_qualifier' when v_name~*'Shanghai Masters|Champion of Champions|Riyadh Season|Invitational|World Mixed Doubles' or (v_name~*'Masters' and v_name!~*'German|Saudi') then 'invitational' else 'ranking' end;
      v_event_stage:=case when v_name~*'Qualifiers?' then 'qualifier' else 'main' end;
      v_status:=case when current_date<v_start then 'upcoming' when current_date>v_end then 'completed' else 'live' end;
      if v_existing is null then
        v_slug:=trim(both '-' from lower(regexp_replace(v_name,'[^a-zA-Z0-9]+','-','g')));
        if exists(select 1 from public.snooker_events where slug=v_slug) then v_slug:=v_slug||'-'||left(v_id,8); end if;
        insert into public.snooker_events(slug,season,name_en,name_zh,type_zh,status,start_date,end_date,country_zh,city_zh,venue_zh,venue_en,currency,source_name,source_event_id,source_url,source_updated_at,ranking_event,data_ready,expected_match_count,event_type,event_stage,ranking_status)
        values(v_slug,v_season,v_name,v_name,case when v_event_stage='qualifier' or v_event_type='pro_qualifier' then '资格赛' when v_event_type='invitational' then '非排名赛' else '排名赛' end,v_status,v_start,v_end,
          coalesce(v_item#>>'{attributes,country}',''),coalesce(v_item#>>'{attributes,city}',''),coalesce(v_item#>>'{attributes,venue}',''),nullif(v_item#>>'{attributes,venue}',''),'GBP','WST',v_id,'https://www.wst.tv/matches/'||v_id,now(),v_event_type='ranking' and v_event_stage='main',false,v_match_count,v_event_type,v_event_stage,case when v_event_type='ranking' then 'ranking' when v_event_type='invitational' then 'non_ranking' else 'not_applicable' end)
        returning id into v_existing;
        v_inserted:=v_inserted+1;
      else
        update public.snooker_events set source_name='WST',source_event_id=coalesce(source_event_id,v_id),source_url=coalesce(source_url,'https://www.wst.tv/matches/'||v_id),
          start_date=v_start,end_date=v_end,country_zh=coalesce(nullif(v_item#>>'{attributes,country}',''),country_zh),city_zh=coalesce(nullif(v_item#>>'{attributes,city}',''),city_zh),venue_en=coalesce(nullif(v_item#>>'{attributes,venue}',''),venue_en),
          expected_match_count=case when v_match_count>0 then v_match_count else expected_match_count end,status=v_status,source_updated_at=now(),updated_at=now()
        where id=v_existing and (source_event_id is null or start_date is distinct from v_start or end_date is distinct from v_end or (v_match_count>0 and expected_match_count is distinct from v_match_count) or status is distinct from v_status);
        if found then v_updated:=v_updated+1; end if;
      end if;
      insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
      values('event',v_existing,'WST',v_id,'https://www.wst.tv/matches/'||v_id,1.0,'verified') on conflict(entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,updated_at=now();
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'season',v_season,'fetched',v_seen,'inserted',v_inserted,'linked_placeholders',v_linked,'updated',v_updated,'changed',v_inserted+v_updated);
end $$;
