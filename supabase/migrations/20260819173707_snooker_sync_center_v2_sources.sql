create or replace function snooker_internal.sync_wst_calendar()
returns jsonb language plpgsql set search_path='public','extensions','pg_catalog' as $$
declare
  v_page int; v_resp extensions.http_response; v_item jsonb; v_id text; v_name text; v_start date; v_end date; v_existing uuid; v_slug text;
  v_seen int:=0; v_inserted int:=0; v_updated int:=0; v_season text:=snooker_internal.current_season(); v_start_year int:=split_part(v_season,'/',1)::int;
  v_event_type text; v_event_stage text; v_status text; v_match_count int;
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
        insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
        values('event',v_existing,'WST',v_id,'https://www.wst.tv/matches/'||v_id,1.0,'verified') on conflict(entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,updated_at=now();
        v_inserted:=v_inserted+1;
      else
        update public.snooker_events set name_en=v_name,start_date=v_start,end_date=v_end,
          country_zh=coalesce(nullif(v_item#>>'{attributes,country}',''),country_zh),city_zh=coalesce(nullif(v_item#>>'{attributes,city}',''),city_zh),venue_en=coalesce(nullif(v_item#>>'{attributes,venue}',''),venue_en),
          expected_match_count=case when v_match_count>0 then v_match_count else expected_match_count end,status=v_status,source_updated_at=now(),updated_at=now()
        where id=v_existing and (name_en is distinct from v_name or start_date is distinct from v_start or end_date is distinct from v_end or (v_match_count>0 and expected_match_count is distinct from v_match_count) or status is distinct from v_status);
        if found then v_updated:=v_updated+1; end if;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'season',v_season,'fetched',v_seen,'inserted',v_inserted,'updated',v_updated,'changed',v_inserted+v_updated);
end $$;

create or replace function snooker_internal.sync_wst_player_master()
returns jsonb language plpgsql set search_path='public','extensions','pg_catalog' as $$
declare
  v_page int; v_resp extensions.http_response; v_item jsonb; a jsonb; v_sid text; v_name text; v_player uuid; v_slug text; v_fetched int:=0; v_inserted int:=0; v_updated int:=0; v_mapped int:=0;
begin
  for v_page in 1..2 loop
    v_resp:=extensions.http_get(('https://players.snooker.web.gc.wstservices.co.uk/v2?page.number='||v_page)::varchar);
    if v_resp.status<>200 then raise exception 'WST players HTTP % page %',v_resp.status,v_page; end if;
    for v_item in select value from jsonb_array_elements(v_resp.content::jsonb->'data') loop
      v_fetched:=v_fetched+1; v_sid:=v_item->>'id'; a:=v_item->'attributes';
      v_name:=trim(concat_ws(' ',coalesce(nullif(a->>'customFirstName',''),nullif(a->>'firstName','')),nullif(a->>'middleName',''),coalesce(nullif(a->>'customSurname',''),nullif(a->>'surname',''))));
      select entity_id into v_player from public.snooker_source_entity_map where entity_type='player' and source_name='WST' and source_id=v_sid limit 1;
      if v_player is null then v_player:=public.snooker_find_player_id(v_name); end if;
      if v_player is null then
        v_slug:=coalesce(nullif(a->>'playerSlug',''),trim(both '-' from lower(regexp_replace(v_name,'[^a-zA-Z0-9]+','-','g')))||'-'||left(v_sid,8));
        if exists(select 1 from public.snooker_players where slug=v_slug) then v_slug:=v_slug||'-'||left(v_sid,8); end if;
        insert into public.snooker_players(slug,name_en,name_zh,short_name_en,nationality_zh,country_code,date_of_birth,turned_pro,profile_source,is_current_tour,tour_status,wst_published,player_status)
        values(v_slug,v_name,v_name,v_name,nullif(a->>'country',''),nullif(a->>'countryCode',''),nullif(a->>'dob','')::date,coalesce(nullif(a->>'customTurnedPro','')::int,nullif(a->>'turnedPro','')::int),'WST',false,'unknown',coalesce((a->>'published')::boolean,false),'unknown') returning id into v_player;
        v_inserted:=v_inserted+1;
      else
        update public.snooker_players set name_en=coalesce(nullif(v_name,''),name_en),short_name_en=coalesce(nullif(v_name,''),short_name_en),nationality_zh=coalesce(nullif(a->>'country',''),nationality_zh),country_code=coalesce(nullif(a->>'countryCode',''),country_code),date_of_birth=coalesce(nullif(a->>'dob','')::date,date_of_birth),turned_pro=coalesce(nullif(a->>'customTurnedPro','')::int,nullif(a->>'turnedPro','')::int,turned_pro),wst_published=coalesce((a->>'published')::boolean,wst_published),profile_source='WST',updated_at=now()
        where id=v_player and (name_en is distinct from coalesce(nullif(v_name,''),name_en) or wst_published is distinct from coalesce((a->>'published')::boolean,wst_published) or country_code is distinct from coalesce(nullif(a->>'countryCode',''),country_code));
        if found then v_updated:=v_updated+1; end if;
      end if;
      insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
      values('player',v_player,'WST',v_sid,'https://www.wst.tv/players/'||v_sid,1.0,'verified') on conflict(entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,updated_at=now();
      v_mapped:=v_mapped+1;
    end loop;
  end loop;
  return jsonb_build_object('ok',true,'fetched',v_fetched,'inserted',v_inserted,'updated',v_updated,'mapped',v_mapped,'changed',v_inserted+v_updated);
end $$;

do $$
declare d text;
begin
  select pg_get_functiondef('snooker_internal.sync_wst_player_profiles_batch(integer,integer)'::regprocedure) into d;
  d:=replace(d,$q$where m.entity_type='player' and m.source_name='WST'$q$,$q$where m.entity_type='player' and m.source_name='WST' and p.is_current_tour=true$q$);
  execute d;
end $$;

create or replace function snooker_internal.sync_wst_player_profiles_all()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare v_offset int:=0; v_batch jsonb; v_attempted int; v_total int:=0; v_success int:=0; v_failed int:=0;
begin
  loop
    v_batch:=snooker_internal.sync_wst_player_profiles_batch(v_offset,25);
    v_attempted:=coalesce((v_batch->>'attempted')::int,0);
    v_total:=v_total+v_attempted; v_success:=v_success+coalesce((v_batch->>'success')::int,0); v_failed:=v_failed+coalesce((v_batch->>'failed')::int,0);
    exit when v_attempted<25; v_offset:=v_offset+25;
  end loop;
  return jsonb_build_object('ok',v_failed=0,'fetched',v_total,'success',v_success,'failed',v_failed,'changed',v_success);
end $$;
