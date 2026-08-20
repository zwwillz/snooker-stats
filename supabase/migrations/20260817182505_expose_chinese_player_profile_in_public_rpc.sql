create or replace function public.snooker_player_detail_public(p_slug text)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'name_en', p.name_en,
      'name_zh', p.name_zh,
      'short_name_zh', p.short_name_zh,
      'nationality_zh', p.nationality_zh,
      'country_code', p.country_code,
      'date_of_birth', p.date_of_birth,
      'turned_pro', p.turned_pro,
      'current_rank', p.current_rank,
      'ranking_points', p.ranking_points,
      'avatar_url', p.avatar_url,
      'is_current_tour', p.is_current_tour,
      'tour_status', p.tour_status
    ),
    'profile', (
      select jsonb_build_object(
        'nickname_en', d.nickname_en,
        'nickname_zh', d.nickname_zh,
        'biography_html_en', d.biography_html_en,
        'biography_html_zh', d.biography_html_zh,
        'quote_en', d.quote_en,
        'quote_zh', d.quote_zh
      )
      from public.snooker_player_profile_details d
      where d.player_id = p.id
      limit 1
    ),
    'career', (
      select jsonb_build_object(
        'ranking_titles', c.ranking_titles,
        'ranking_finals', c.ranking_finals,
        'highest_ranking', c.highest_ranking,
        'masters_titles', c.masters_titles,
        'uk_championship_titles', c.uk_championship_titles,
        'world_championship_titles', c.world_championship_titles,
        'triple_crown_titles', c.triple_crown_titles,
        'career_147s', c.career_147s,
        'last_tournament_win', c.last_tournament_win,
        'last_tournament_win_zh', c.last_tournament_win_zh
      )
      from public.snooker_player_career_stats c
      where c.player_id = p.id
      limit 1
    ),
    'seasons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'season_start_year', s.season_start_year,
        'season_label', s.season_label,
        'ranking', s.ranking,
        'tournaments_won', s.tournaments_won,
        'points_scored', s.points_scored,
        'matches_played', s.matches_played,
        'matches_won', s.matches_won,
        'match_win_rate', s.match_win_rate,
        'average_shot_time', s.average_shot_time,
        'breaks_50_plus', s.breaks_50_plus,
        'breaks_100_plus', s.breaks_100_plus,
        'highest_break', s.highest_break,
        'season_147s', s.season_147s,
        'average_break', s.average_break,
        'is_final', s.is_final
      ) order by s.season_start_year desc)
      from public.snooker_player_season_stats s
      where s.player_id = p.id
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'highlight_year', h.highlight_year,
        'sequence_no', h.sequence_no,
        'description_en', h.description_en,
        'description_zh', h.description_zh
      ) order by h.highlight_year desc nulls last, h.sequence_no asc)
      from public.snooker_player_career_highlights h
      where h.player_id = p.id
    ), '[]'::jsonb),
    'official_ranking', (
      select jsonb_build_object(
        'player_id', r.player_id,
        'rank', r.rank,
        'points', r.points,
        'ranking_money', r.ranking_money
      )
      from public.snooker_latest_rankings r
      where r.player_id = p.id and r.list_key = 'world_official'
      order by r.rank asc
      limit 1
    )
  )
  from public.snooker_players p
  where p.slug = p_slug
  limit 1;
$function$;
