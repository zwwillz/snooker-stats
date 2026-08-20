create or replace function snooker_internal.csv_fields(p_line text)
returns text[] language plpgsql immutable set search_path='' as $$
declare
  v_out text[] := array[]::text[]; v_buf text:=''; v_in_quotes boolean:=false; v_i int:=1; v_len int:=length(coalesce(p_line,'')); v_c text;
begin
  while v_i<=v_len loop
    v_c:=substr(p_line,v_i,1);
    if v_c='"' then
      if v_in_quotes and v_i<v_len and substr(p_line,v_i+1,1)='"' then v_buf:=v_buf||'"'; v_i:=v_i+1;
      else v_in_quotes:=not v_in_quotes; end if;
    elsif v_c=',' and not v_in_quotes then v_out:=array_append(v_out,v_buf); v_buf:='';
    else v_buf:=v_buf||v_c; end if;
    v_i:=v_i+1;
  end loop;
  return array_append(v_out,regexp_replace(v_buf,E'\r$',''));
end $$;

create or replace function snooker_internal.money_value(p_text text)
returns bigint language sql immutable set search_path='' as $$
  select coalesce(nullif(regexp_replace(coalesce(p_text,''),'[^0-9]','','g'),''),'0')::bigint
$$;

create or replace function snooker_internal.sync_wpbsa_ranking_list(p_list_key text)
returns jsonb language plpgsql set search_path='public','extensions','pg_catalog' as $$
declare
  v_list public.snooker_ranking_lists%rowtype; v_html text; v_google text; v_csv_url text; v_csv text; v_header text[]; v_fields text[]; v_line text;
  v_money_idx int; v_current_money_header text; v_rank int; v_name text; v_money bigint; v_player uuid; v_rows int:=0; v_conflicts int:=0; v_changed int:=0;
  v_capture timestamptz:=clock_timestamp(); v_latest timestamptz; v_prev int; v_is_one_year boolean:=false;
begin
  select * into v_list from public.snooker_ranking_lists where list_key=p_list_key limit 1;
  if v_list.id is null then raise exception 'ranking list % not found',p_list_key; end if;
  if v_list.source_name<>'WPBSA' then raise exception 'ranking list % is not WPBSA direct source',p_list_key; end if;

  create temporary table if not exists pg_temp.rank_stage(player_id uuid,source_name text,source_rank int,money bigint) on commit drop;
  truncate pg_temp.rank_stage;

  select content into v_html from extensions.http_get(v_list.source_url::varchar);
  if p_list_key='world_official' then
    for v_line in select x from regexp_split_to_table(v_html,'</tr>') x where x like '%class="rank"%' and x like '%class="name"%' and x like '%class="total"%' loop
      v_rank:=nullif((regexp_match(v_line,'class="rank">\s*([0-9]+)</td>'))[1],'')::int;
      v_name:=nullif(trim((regexp_match(v_line,'class="name">.*?>([^<]+)</a></td>'))[1]),'');
      v_money:=snooker_internal.money_value((regexp_match(v_line,'class="total">([^<]+)</td>'))[1]);
      if v_rank is null or v_name is null then continue; end if;
      v_player:=public.snooker_find_player_id(v_name);
      if v_player is null then
        v_conflicts:=v_conflicts+1;
        if not exists(select 1 from public.snooker_ranking_sync_conflicts where ranking_list_id=v_list.id and source_player_name=v_name and resolved_at is null and conflict_type='unmatched_player') then
          insert into public.snooker_ranking_sync_conflicts(ranking_list_id,ranking_type,source_name,source_player_name,source_rank,source_money,conflict_type,details,captured_at)
          values(v_list.id,v_list.ranking_type,'WPBSA',v_name,v_rank,v_money,'unmatched_player','{}'::jsonb,v_capture);
        end if;
      else
        insert into pg_temp.rank_stage values(v_player,v_name,v_rank,v_money); v_rows:=v_rows+1;
      end if;
    end loop;
  else
    v_google:=substring(v_html from 'https://docs.google.com[^"'' ]+');
    if v_google is null then raise exception 'WPBSA sheet iframe not found for %',p_list_key; end if;
    v_csv_url:=regexp_replace(v_google,'pubhtml\?.*$','pub')||'?output=csv&gid='||coalesce(v_list.source_external_id,substring(v_google from 'gid=([0-9]+)'));
    select content into v_csv from extensions.http_get(v_csv_url::varchar);
    v_header:=snooker_internal.csv_fields(split_part(v_csv,E'\n',1));
    v_is_one_year:=p_list_key='one_year';
    if v_is_one_year then
      v_current_money_header:=right(split_part(v_list.season,'/',1),2)||'/'||split_part(v_list.season,'/',2)||' Money';
      v_money_idx:=array_position(v_header,v_current_money_header);
    else v_money_idx:=array_position(v_header,'TOTAL'); end if;
    if v_money_idx is null then raise exception 'money column not found for %',p_list_key; end if;

    create temporary table if not exists pg_temp.rank_raw(player_id uuid,source_name text,source_rank int,money bigint) on commit drop;
    truncate pg_temp.rank_raw;
    for v_line in select x from regexp_split_to_table(v_csv,E'\n') with ordinality t(x,n) where n>1 and trim(x)<>'' loop
      v_fields:=snooker_internal.csv_fields(v_line);
      if cardinality(v_fields)<greatest(2,v_money_idx) then continue; end if;
      v_rank:=nullif(regexp_replace(coalesce(v_fields[1],''),'[^0-9]','','g'),'')::int;
      v_name:=nullif(trim(v_fields[2]),'');
      v_money:=snooker_internal.money_value(v_fields[v_money_idx]);
      if v_name is null then continue; end if;
      v_player:=public.snooker_find_player_id(v_name);
      if v_player is null then
        v_conflicts:=v_conflicts+1;
        if not exists(select 1 from public.snooker_ranking_sync_conflicts where ranking_list_id=v_list.id and source_player_name=v_name and resolved_at is null and conflict_type='unmatched_player') then
          insert into public.snooker_ranking_sync_conflicts(ranking_list_id,ranking_type,source_name,source_player_name,source_rank,source_money,conflict_type,details,captured_at)
          values(v_list.id,v_list.ranking_type,'WPBSA',v_name,v_rank,v_money,'unmatched_player',jsonb_build_object('csv_url',v_csv_url),v_capture);
        end if;
      else insert into pg_temp.rank_raw values(v_player,v_name,v_rank,v_money); end if;
    end loop;
    if v_is_one_year then
      insert into pg_temp.rank_stage(player_id,source_name,source_rank,money)
      select player_id,source_name,row_number() over(order by money desc,source_name)::int,money from pg_temp.rank_raw order by money desc,source_name;
    else insert into pg_temp.rank_stage select * from pg_temp.rank_raw; end if;
    select count(*) into v_rows from pg_temp.rank_stage;
  end if;

  select max(captured_at) into v_latest from public.snooker_ranking_snapshots where ranking_list_id=v_list.id;
  if v_latest is null then v_changed:=v_rows;
  else
    select count(*) into v_changed from (
      select coalesce(s.player_id,o.player_id) player_id
      from pg_temp.rank_stage s full join (select player_id,rank,ranking_money from public.snooker_ranking_snapshots where ranking_list_id=v_list.id and captured_at=v_latest) o on o.player_id=s.player_id
      where o.player_id is null or s.player_id is null or o.rank is distinct from s.source_rank or o.ranking_money is distinct from s.money
    ) q;
  end if;

  if v_changed>0 then
    insert into public.snooker_ranking_snapshots(season,captured_at,player_id,rank,points,source_name,ranking_list_id,ranking_type,ranking_money,source_url,source_player_name,previous_rank,rank_change,cutoff_date,meta)
    select v_list.season,v_capture,s.player_id,s.source_rank,s.money,'WPBSA',v_list.id,v_list.ranking_type,s.money,v_list.source_url,s.source_name,
      p.rank,case when p.rank is null then null else p.rank-s.source_rank end,v_list.cutoff_date,jsonb_build_object('sync','Sync Center v2')
    from pg_temp.rank_stage s
    left join lateral (select rank from public.snooker_ranking_snapshots x where x.ranking_list_id=v_list.id and x.player_id=s.player_id order by captured_at desc limit 1) p on true;
    update public.snooker_ranking_lists set latest_captured_at=v_capture,sync_status=case when v_conflicts=0 then 'synced' else 'partial' end,
      meta=meta||jsonb_build_object('last_checked_at',v_capture,'last_sync_rows',v_rows,'last_sync_conflicts',v_conflicts,'last_change_at',v_capture),updated_at=now() where id=v_list.id;
  else
    update public.snooker_ranking_lists set sync_status=case when v_conflicts=0 then 'synced' else 'partial' end,
      meta=meta||jsonb_build_object('last_checked_at',v_capture,'last_sync_rows',v_rows,'last_sync_conflicts',v_conflicts),updated_at=now() where id=v_list.id;
  end if;
  return jsonb_build_object('list_key',p_list_key,'rows',v_rows,'conflicts',v_conflicts,'changed',v_changed,'captured',v_changed>0);
end $$;

create or replace function snooker_internal.sync_derived_ranking(p_target_type text,p_source_type text default 'one_year')
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare v_target public.snooker_ranking_lists%rowtype; v_source public.snooker_ranking_lists%rowtype; v_source_capture timestamptz; v_target_capture timestamptz; v_capture timestamptz:=clock_timestamp(); v_rows int:=0; v_changed int:=0;
begin
  select * into v_target from public.snooker_ranking_lists where ranking_type=p_target_type and is_current=true order by updated_at desc limit 1;
  select * into v_source from public.snooker_ranking_lists where ranking_type=p_source_type and is_current=true order by updated_at desc limit 1;
  if v_target.id is null or v_source.id is null then raise exception 'ranking list missing for % <- %',p_target_type,p_source_type; end if;
  select max(captured_at) into v_source_capture from public.snooker_ranking_snapshots where ranking_list_id=v_source.id;
  if v_source_capture is null then raise exception 'source ranking % has no snapshot',p_source_type; end if;
  select count(*) into v_rows from public.snooker_ranking_snapshots where ranking_list_id=v_source.id and captured_at=v_source_capture;
  select max(captured_at) into v_target_capture from public.snooker_ranking_snapshots where ranking_list_id=v_target.id;
  if v_target_capture is null then v_changed:=v_rows;
  else
    select count(*) into v_changed from public.snooker_ranking_snapshots s
    left join public.snooker_ranking_snapshots t on t.ranking_list_id=v_target.id and t.captured_at=v_target_capture and t.player_id=s.player_id
    where s.ranking_list_id=v_source.id and s.captured_at=v_source_capture and (t.player_id is null or t.rank is distinct from s.rank or t.ranking_money is distinct from s.ranking_money);
  end if;
  if v_changed>0 then
    insert into public.snooker_ranking_snapshots(season,captured_at,player_id,rank,points,source_name,ranking_list_id,ranking_type,ranking_money,source_url,source_player_name,previous_rank,rank_change,cutoff_date,meta)
    select v_target.season,v_capture,s.player_id,s.rank,s.ranking_money,'Calculated',v_target.id,v_target.ranking_type,s.ranking_money,v_target.source_url,s.source_player_name,p.rank,case when p.rank is null then null else p.rank-s.rank end,v_target.cutoff_date,jsonb_build_object('derived_from',v_source.list_key,'source_capture',v_source_capture)
    from public.snooker_ranking_snapshots s
    left join lateral (select rank from public.snooker_ranking_snapshots x where x.ranking_list_id=v_target.id and x.player_id=s.player_id order by captured_at desc limit 1) p on true
    where s.ranking_list_id=v_source.id and s.captured_at=v_source_capture;
    update public.snooker_ranking_lists set source_name='Calculated',latest_captured_at=v_capture,sync_status='synced',meta=meta||jsonb_build_object('last_checked_at',v_capture,'last_sync_rows',v_rows,'last_change_at',v_capture,'derived_from',v_source.list_key),updated_at=now() where id=v_target.id;
  else update public.snooker_ranking_lists set source_name='Calculated',sync_status='synced',meta=meta||jsonb_build_object('last_checked_at',v_capture,'last_sync_rows',v_rows,'derived_from',v_source.list_key),updated_at=now() where id=v_target.id; end if;
  return jsonb_build_object('ranking_type',p_target_type,'rows',v_rows,'changed',v_changed,'captured',v_changed>0);
end $$;

create or replace function snooker_internal.sync_rankings_all()
returns jsonb language plpgsql set search_path='public','pg_catalog' as $$
declare v_result jsonb:='{}'::jsonb; r jsonb; v_list_key text;
begin
  if (select enabled from public.snooker_sync_policies where job_key='ranking_world_official') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='world_official' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('world_official',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_provisional_seeding') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='provisional_seeding' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('provisional_seeding',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_one_year') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='one_year' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('one_year',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_provisional_eos') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='provisional_eos' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('provisional_eos',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_race_masters') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='race_masters' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('race_masters',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_race_crucible') then
    select list_key into v_list_key from public.snooker_ranking_lists where ranking_type='race_crucible' and is_current=true limit 1;
    r:=snooker_internal.sync_wpbsa_ranking_list(v_list_key); v_result:=v_result||jsonb_build_object('race_crucible',r);
  end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_race_players') then r:=snooker_internal.sync_derived_ranking('race_players_championship','one_year'); v_result:=v_result||jsonb_build_object('race_players',r); end if;
  if (select enabled from public.snooker_sync_policies where job_key='ranking_race_tour') then r:=snooker_internal.sync_derived_ranking('race_tour_championship','one_year'); v_result:=v_result||jsonb_build_object('race_tour',r); end if;
  return jsonb_build_object('ok',true,'results',v_result);
end $$;
