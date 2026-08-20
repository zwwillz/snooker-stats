create schema if not exists snooker_internal;
revoke all on schema snooker_internal from public, anon, authenticated;

create or replace function snooker_internal.sync_wst_player_profiles_batch(p_offset integer default 0, p_limit integer default 20)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  r record;
  resp jsonb;
  a jsonb;
  cs jsonb;
  ss jsonb;
  h jsonb;
  seq integer;
  attempted integer := 0;
  success_count integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  for r in
    select p.id player_id, p.name_en, m.source_id wst_uuid
    from public.snooker_source_entity_map m
    join public.snooker_players p on p.id=m.entity_id
    where m.entity_type='player' and m.source_name='WST'
    order by p.name_en
    offset greatest(p_offset,0) limit greatest(least(p_limit,25),1)
  loop
    attempted := attempted + 1;
    begin
      select content::jsonb into resp
      from extensions.http_get(('https://players.snooker.web.gc.wstservices.co.uk/v2/'||r.wst_uuid)::varchar);
      a := resp->'data'->'attributes';
      if a is null then raise exception 'missing attributes'; end if;

      insert into public.snooker_player_profile_details(player_id,nickname_en,biography_html_en,quote_en,quote_source_en,sponsors,source_name,source_updated_at,raw,updated_at)
      values(r.player_id,coalesce(nullif(a->>'customNickname',''),nullif(a->>'nickname','')),a->'bio'->>'biography',a->'bio'->>'quote',a->'bio'->>'quoteSource',coalesce(a->'sponsors','[]'::jsonb),'WST',now(),a,now())
      on conflict (player_id) do update set
        nickname_en=excluded.nickname_en, biography_html_en=excluded.biography_html_en,
        quote_en=excluded.quote_en, quote_source_en=excluded.quote_source_en,
        sponsors=excluded.sponsors, source_updated_at=excluded.source_updated_at,
        raw=excluded.raw, updated_at=now();

      cs := a->'careerStats';
      if jsonb_typeof(cs)='object' then
        insert into public.snooker_player_career_stats(player_id,ranking_titles,ranking_finals,highest_ranking,profile_current_ranking,masters_titles,uk_championship_titles,world_championship_titles,triple_crown_titles,career_triple_crown,career_147s,last_tournament_win,hide_stats,source_name,source_updated_at,raw,updated_at)
        values(r.player_id,nullif(cs->>'rankingTitles','')::int,nullif(cs->>'rankingFinals','')::int,nullif(cs->>'highestRanking','')::int,nullif(cs->>'currentRanking','')::int,nullif(cs->>'masters','')::int,nullif(cs->>'ukChampionships','')::int,nullif(cs->>'worldChampionships','')::int,nullif(cs->>'tripleCrownTitles','')::int,coalesce((cs->>'careerTripleCrown')::boolean,false),nullif(cs->>'maxBreaks','')::int,cs->>'lastTournamentWin',coalesce((cs->>'hideStats')::boolean,false),'WST',now(),cs,now())
        on conflict (player_id) do update set
          ranking_titles=excluded.ranking_titles, ranking_finals=excluded.ranking_finals,
          highest_ranking=excluded.highest_ranking, profile_current_ranking=excluded.profile_current_ranking,
          masters_titles=excluded.masters_titles, uk_championship_titles=excluded.uk_championship_titles,
          world_championship_titles=excluded.world_championship_titles, triple_crown_titles=excluded.triple_crown_titles,
          career_triple_crown=excluded.career_triple_crown, career_147s=excluded.career_147s,
          last_tournament_win=excluded.last_tournament_win, hide_stats=excluded.hide_stats,
          source_updated_at=excluded.source_updated_at, raw=excluded.raw, updated_at=now();
      end if;

      if jsonb_typeof(a->'seasonStats')='array' then
        for ss in select value from jsonb_array_elements(a->'seasonStats') loop
          if nullif(ss->>'season','') is not null then
            insert into public.snooker_player_season_stats(player_id,season_start_year,season_label,ranking,tournaments_won,points_scored,matches_played,matches_won,match_win_rate,average_shot_time,breaks_50_plus,breaks_100_plus,highest_break,season_147s,average_break,is_final,source_name,source_updated_at,raw,updated_at)
            values(r.player_id,(ss->>'season')::smallint,(ss->>'season')||'/'||right(((ss->>'season')::int+1)::text,2),nullif(ss->>'ranking','')::int,nullif(ss->>'tournamentsWon','')::int,nullif(ss->>'pointsScored','')::bigint,nullif(ss->>'matchesPlayed','')::int,nullif(ss->>'matchesWon','')::int,case when coalesce(nullif(ss->>'matchesPlayed','')::numeric,0)>0 then round(100.0*coalesce(nullif(ss->>'matchesWon','')::numeric,0)/nullif(ss->>'matchesPlayed','')::numeric,2) end,nullif(ss->>'avgShotTime','')::numeric,nullif(ss->>'fiftyPlusBreaks','')::int,nullif(ss->>'hundredPlusBreaks','')::int,nullif(ss->>'highestBreak','')::int,nullif(ss->>'maxBreaks','')::int,nullif(ss->>'avgBreak','')::numeric,((ss->>'season')::int<2026),'WST',now(),ss,now())
            on conflict (player_id,season_start_year) do update set
              season_label=excluded.season_label, ranking=excluded.ranking,
              tournaments_won=excluded.tournaments_won, points_scored=excluded.points_scored,
              matches_played=excluded.matches_played, matches_won=excluded.matches_won,
              match_win_rate=excluded.match_win_rate, average_shot_time=excluded.average_shot_time,
              breaks_50_plus=excluded.breaks_50_plus, breaks_100_plus=excluded.breaks_100_plus,
              highest_break=excluded.highest_break, season_147s=excluded.season_147s,
              average_break=excluded.average_break, is_final=excluded.is_final,
              source_updated_at=excluded.source_updated_at, raw=excluded.raw, updated_at=now();
          end if;
        end loop;
      end if;

      delete from public.snooker_player_career_highlights where player_id=r.player_id;
      seq := 0;
      if jsonb_typeof(a->'careerHighlights')='array' then
        for h in select value from jsonb_array_elements(a->'careerHighlights') loop
          seq := seq + 1;
          if nullif(h->>'description','') is not null then
            insert into public.snooker_player_career_highlights(player_id,highlight_year,sequence_no,description_en,source_name,source_updated_at,updated_at)
            values(r.player_id,nullif(h->>'year','')::smallint,seq,h->>'description','WST',now(),now());
          end if;
        end loop;
      end if;

      success_count := success_count + 1;
    exception when others then
      errors := errors || jsonb_build_array(jsonb_build_object('player',r.name_en,'wst_uuid',r.wst_uuid,'error',sqlerrm));
    end;
  end loop;

  insert into public.snooker_sync_runs(source_name,job_type,status,finished_at,fetched_count,changed_count,error_message,meta)
  values('WST','player_full_profile_import',case when jsonb_array_length(errors)=0 then 'success' else 'partial' end,now(),attempted,success_count,case when jsonb_array_length(errors)>0 then errors::text end,jsonb_build_object('offset',p_offset,'limit',p_limit,'errors',errors));

  return jsonb_build_object('offset',p_offset,'attempted',attempted,'success',success_count,'failed',jsonb_array_length(errors),'errors',errors);
end;
$$;

revoke all on function snooker_internal.sync_wst_player_profiles_batch(integer,integer) from public, anon, authenticated;
