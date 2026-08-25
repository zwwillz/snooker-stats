-- Translation ingestion guardrails for 147数据局.
-- Keep English source data intact, normalize known round labels, and queue
-- unresolved player Chinese names for review instead of treating English as verified Chinese.

create or replace function public.snooker_standard_round_label_zh(p_label_en text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_label_en is null or btrim(p_label_en) = '' then null
    when p_label_en ~* '^Round 1$' then '第一轮'
    when p_label_en ~* '^Round 2$' then '第二轮'
    when p_label_en ~* '^Round 3$' then '第三轮'
    when p_label_en ~* '^Round 4$' then '第四轮'
    when p_label_en ~* '^Round 5$' then '第五轮'
    when p_label_en ~* '^Round 6$' then '第六轮'
    when p_label_en ~* '^Last [0-9]+$' then regexp_replace(p_label_en, '^Last ([0-9]+)$', '\1强', 'i')
    when p_label_en ~* '^Quarter[- ]?Finals?$' then '四分之一决赛'
    when p_label_en ~* '^Semi[- ]?Finals?$' then '半决赛'
    when p_label_en ~* '^Final$' then '决赛'
    when p_label_en ~* '^Round Robin$' then '循环赛'
    when p_label_en ~* '^League Phase$' then '联赛阶段'
    when p_label_en ~* '^Pre-Qualifier$' then '预资格赛'
    when p_label_en ~* '^Group Final$' then '小组决赛'
    when p_label_en ~* '^Group Semi[- ]?Finals$' then '小组半决赛'
    when p_label_en ~* '^Stage One$' then '第一阶段'
    when p_label_en ~* '^Stage Two$|^Stage 2$' then '第二阶段'
    when p_label_en ~* '^Stage Three$|^Stage 3$' then '第三阶段'
    when p_label_en ~* '^Round 1[ /]*(Held ?Over|Heldover)$' then '第一轮（延期至正赛场馆进行）'
    when p_label_en ~* '^Qualifier 1 \(heldover\)$' then '资格赛第1轮（延期至正赛场馆进行）'
    when p_label_en ~* '^Qualifier 2 \(heldover\)$' then '资格赛第2轮（延期至正赛场馆进行）'
    when p_label_en ~* '^Pre-qualifying 5$' then '预资格赛第5轮'
    else null
  end
$$;

create or replace function public.snooker_guard_round_translation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_known text;
begin
  v_known := public.snooker_standard_round_label_zh(new.label_en);
  if v_known is not null and (
    new.label_zh is null
    or btrim(new.label_zh) = ''
    or lower(btrim(new.label_zh)) = lower(btrim(coalesce(new.label_en,'')))
    or (new.label_zh ~ '[A-Za-z]' and new.label_zh !~ '[一-龥]')
  ) then
    new.label_zh := v_known;
  end if;
  return new;
end
$$;

drop trigger if exists snooker_round_translation_guard on public.snooker_rounds;
create trigger snooker_round_translation_guard
before insert or update of label_en,label_zh on public.snooker_rounds
for each row execute function public.snooker_guard_round_translation();

create or replace function public.snooker_queue_player_translation_review()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_needs_review boolean;
  v_verified boolean;
begin
  v_needs_review := new.name_zh is null
    or btrim(new.name_zh) = ''
    or lower(btrim(new.name_zh)) = lower(btrim(new.name_en))
    or (new.name_zh ~ '[A-Za-z]' and new.name_zh !~ '[一-龥]');

  select exists(
    select 1 from public.snooker_player_names pn
    where pn.player_id = new.id and pn.locale = 'zh-CN' and pn.status = 'verified'
  ) into v_verified;

  if v_needs_review and not v_verified then
    insert into public.snooker_player_names(
      player_id,locale,display_name,short_name,aliases,source_name,status,reviewed_at,updated_at
    ) values (
      new.id,'zh-CN',new.name_en,new.short_name_zh,array[]::text[],'translation-governance','pending_review',null,now()
    )
    on conflict(player_id,locale) do update set
      display_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.display_name else excluded.display_name end,
      short_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.short_name else excluded.short_name end,
      source_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.source_name else excluded.source_name end,
      status = case when public.snooker_player_names.status='verified' then 'verified' else 'pending_review' end,
      updated_at = now();
  end if;
  return new;
end
$$;

drop trigger if exists snooker_player_translation_review_queue on public.snooker_players;
create trigger snooker_player_translation_review_queue
after insert or update of name_en,name_zh,short_name_zh on public.snooker_players
for each row execute function public.snooker_queue_player_translation_review();

insert into public.snooker_player_names(player_id,locale,display_name,short_name,aliases,source_name,status,reviewed_at,updated_at)
select p.id,'zh-CN',p.name_en,p.short_name_zh,array[]::text[],'translation-governance','pending_review',null,now()
from public.snooker_players p
where (
  p.name_zh is null or btrim(p.name_zh)='' or lower(btrim(p.name_zh))=lower(btrim(p.name_en))
  or (p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]')
)
on conflict(player_id,locale) do update set
  display_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.display_name else excluded.display_name end,
  short_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.short_name else excluded.short_name end,
  source_name = case when public.snooker_player_names.status='verified' then public.snooker_player_names.source_name else excluded.source_name end,
  status = case when public.snooker_player_names.status='verified' then 'verified' else 'pending_review' end,
  updated_at = now();
