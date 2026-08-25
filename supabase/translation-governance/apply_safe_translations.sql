-- 147数据局：高置信度中文翻译补全
-- 仅处理“中文字段为空 / 与英文相同 / 纯英文”的记录。
-- 不覆盖已经存在且包含中文字符的人工译名。
-- 建议执行前先运行 audit_chinese_translation.sql，并在事务中验证受影响行数。

begin;

-- A. 球员：复用项目现有已审核译名与行业通行译名。
with player_map(name_en, name_zh, short_name_zh, nationality_zh, country_code) as (
  values
    ('Judd Trump','贾德·特鲁姆普','特鲁姆普','英格兰','ENG'),
    ('Neil Robertson','尼尔·罗伯逊','罗伯逊','澳大利亚','AUS'),
    ('Zhao Xintong','赵心童','赵心童','中国','CHN'),
    ('Wu Yize','吴宜泽','吴宜泽','中国','CHN'),
    ('John Higgins','约翰·希金斯','希金斯','苏格兰','SCO'),
    ('Shaun Murphy','肖恩·墨菲','墨菲','英格兰','ENG'),
    ('Kyren Wilson','凯伦·威尔逊','威尔逊','英格兰','ENG'),
    ('Mark Williams','马克·威廉姆斯','威廉姆斯','威尔士','WAL'),
    ('Mark Selby','马克·塞尔比','塞尔比','英格兰','ENG'),
    ('Barry Hawkins','巴里·霍金斯','霍金斯','英格兰','ENG'),
    ('Xiao Guodong','肖国栋','肖国栋','中国','CHN'),
    ('Mark Allen','马克·艾伦','艾伦','北爱尔兰','NIR'),
    ('Chris Wakelin','克里斯·韦克林','韦克林','英格兰','ENG'),
    ('Ronnie O''Sullivan','罗尼·奥沙利文','奥沙利文','英格兰','ENG'),
    ('Ding Junhui','丁俊晖','丁俊晖','中国','CHN'),
    ('Si Jiahui','斯佳辉','斯佳辉','中国','CHN'),
    ('Zhang Anda','张安达','张安达','中国','CHN'),
    ('Stuart Bingham','斯图尔特·宾汉姆','宾汉姆','英格兰','ENG'),
    ('Zhou Yuelong','周跃龙','周跃龙','中国','CHN'),
    ('Pang Junxu','庞俊旭','庞俊旭','中国','CHN'),
    ('Hossein Vafaei','侯赛因·瓦菲','瓦菲','伊朗','IRN'),
    ('David Gilbert','大卫·吉尔伯特','吉尔伯特','英格兰','ENG'),
    ('Tom Ford','汤姆·福德','福德','英格兰','ENG'),
    ('Anthony McGill','安东尼·麦克吉尔','麦克吉尔','苏格兰','SCO'),
    ('Jackson Page','杰克逊·佩奇','佩奇','威尔士','WAL'),
    ('Aaron Hill','亚伦·希尔','希尔','爱尔兰','IRL'),
    ('Matthew Selt','马修·塞尔特','塞尔特','英格兰','ENG'),
    ('Noppon Saengkham','诺鹏·桑坎姆','桑坎姆','泰国','THA'),
    ('Chang Bingyu','常冰玉','常冰玉','中国','CHN'),
    ('Liu Hongyu','刘宏宇','刘宏宇','中国','CHN'),
    ('Jiang Jun','江俊','江俊','中国','CHN'),
    ('Yao Pengcheng','姚朋成','姚朋成','中国','CHN'),
    ('Liu Linhao','刘林昊','刘林昊','中国','CHN'),
    ('Wu Shengguang','吴盛光','吴盛光','中国','CHN')
)
update public.snooker_players p
set
  name_zh = case
    when p.name_zh is null
      or btrim(p.name_zh) = ''
      or lower(btrim(p.name_zh)) = lower(btrim(p.name_en))
      or (p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]')
    then m.name_zh else p.name_zh end,
  short_name_zh = case
    when p.short_name_zh is null
      or btrim(p.short_name_zh) = ''
      or (p.short_name_zh ~ '[A-Za-z]' and p.short_name_zh !~ '[一-龥]')
    then m.short_name_zh else p.short_name_zh end,
  nationality_zh = case
    when p.nationality_zh is null
      or btrim(p.nationality_zh) = ''
      or (p.nationality_zh ~ '[A-Za-z]' and p.nationality_zh !~ '[一-龥]')
    then m.nationality_zh else p.nationality_zh end,
  country_code = coalesce(nullif(btrim(p.country_code), ''), m.country_code),
  updated_at = now()
from player_map m
where lower(btrim(p.name_en)) = lower(btrim(m.name_en))
  and (
    p.name_zh is null
    or btrim(p.name_zh) = ''
    or lower(btrim(p.name_zh)) = lower(btrim(p.name_en))
    or (p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]')
    or p.short_name_zh is null
    or btrim(p.short_name_zh) = ''
    or (p.short_name_zh ~ '[A-Za-z]' and p.short_name_zh !~ '[一-龥]')
    or p.nationality_zh is null
    or btrim(p.nationality_zh) = ''
    or (p.nationality_zh ~ '[A-Za-z]' and p.nationality_zh !~ '[一-龥]')
    or p.country_code is null
    or btrim(p.country_code) = ''
  );

-- 同步球员 zh-CN 名称表；仅补缺或修复纯英文值。
insert into public.snooker_player_names(
  player_id, locale, display_name, short_name, aliases, source_name, status, reviewed_at
)
select
  p.id,
  'zh-CN',
  p.name_zh,
  p.short_name_zh,
  '{}'::text[],
  'translation_governance_20260825',
  'verified',
  now()
from public.snooker_players p
where p.name_zh ~ '[一-龥]'
on conflict (player_id, locale) do update
set display_name = case
      when public.snooker_player_names.display_name is null
        or btrim(public.snooker_player_names.display_name) = ''
        or (public.snooker_player_names.display_name ~ '[A-Za-z]' and public.snooker_player_names.display_name !~ '[一-龥]')
      then excluded.display_name
      else public.snooker_player_names.display_name
    end,
    short_name = case
      when public.snooker_player_names.short_name is null
        or btrim(public.snooker_player_names.short_name) = ''
        or (public.snooker_player_names.short_name ~ '[A-Za-z]' and public.snooker_player_names.short_name !~ '[一-龥]')
      then excluded.short_name
      else public.snooker_player_names.short_name
    end,
    source_name = case
      when public.snooker_player_names.display_name is null
        or btrim(public.snooker_player_names.display_name) = ''
        or (public.snooker_player_names.display_name ~ '[A-Za-z]' and public.snooker_player_names.display_name !~ '[一-龥]')
      then excluded.source_name
      else public.snooker_player_names.source_name
    end,
    status = case
      when public.snooker_player_names.display_name is null
        or btrim(public.snooker_player_names.display_name) = ''
        or (public.snooker_player_names.display_name ~ '[A-Za-z]' and public.snooker_player_names.display_name !~ '[一-龥]')
      then excluded.status
      else public.snooker_player_names.status
    end,
    reviewed_at = case
      when public.snooker_player_names.display_name is null
        or btrim(public.snooker_player_names.display_name) = ''
        or (public.snooker_player_names.display_name ~ '[A-Za-z]' and public.snooker_player_names.display_name !~ '[一-龥]')
      then excluded.reviewed_at
      else public.snooker_player_names.reviewed_at
    end,
    updated_at = now();

-- B. 赛事：仅 exact match，避免赞助冠名和历史特殊赛事被错误替换。
with event_map(name_en, name_zh) as (
  values
    ('World Championship','世界锦标赛'),
    ('UK Championship','英国锦标赛'),
    ('The Masters','大师赛'),
    ('Masters','大师赛'),
    ('Welsh Open','威尔士公开赛'),
    ('German Masters','德国大师赛'),
    ('Championship League','冠军联赛'),
    ('Players Championship','球员锦标赛'),
    ('Tour Championship','巡回锦标赛'),
    ('English Open','英格兰公开赛'),
    ('Scottish Open','苏格兰公开赛'),
    ('Northern Ireland Open','北爱尔兰公开赛'),
    ('British Open','英国公开赛'),
    ('World Grand Prix','世界大奖赛'),
    ('World Open','世界公开赛'),
    ('International Championship','国际锦标赛'),
    ('Wuhan Open','武汉公开赛'),
    ('Xi''an Grand Prix','西安大奖赛'),
    ('Saudi Arabia Snooker Masters','沙特阿拉伯斯诺克大师赛'),
    ('Shoot Out','单局限时赛')
)
update public.snooker_events e
set name_zh = m.name_zh,
    updated_at = now()
from event_map m
where lower(btrim(e.name_en)) = lower(btrim(m.name_en))
  and (
    e.name_zh is null
    or btrim(e.name_zh) = ''
    or lower(btrim(e.name_zh)) = lower(btrim(e.name_en))
    or (e.name_zh ~ '[A-Za-z]' and e.name_zh !~ '[一-龥]')
  );

-- C. 常见比赛阶段 / 轮次：优先 exact match。
with round_map(label_en, label_zh) as (
  values
    ('Qualifying','资格赛'),
    ('Qualifying Round','资格赛'),
    ('Round 1','第一轮'),
    ('Round 2','第二轮'),
    ('Round 3','第三轮'),
    ('Round 4','第四轮'),
    ('Last 144','144强'),
    ('Last 128','128强'),
    ('Last 112','112强'),
    ('Last 96','96强'),
    ('Last 80','80强'),
    ('Last 64','64强'),
    ('Last 48','48强'),
    ('Last 32','32强'),
    ('Last 24','24强'),
    ('Last 16','16强'),
    ('Quarter-final','四分之一决赛'),
    ('Quarter-Final','四分之一决赛'),
    ('Quarter Finals','四分之一决赛'),
    ('Quarter-finals','四分之一决赛'),
    ('Semi-final','半决赛'),
    ('Semi-Final','半决赛'),
    ('Semi Finals','半决赛'),
    ('Semi-finals','半决赛'),
    ('Final','决赛'),
    ('Group Stage','小组赛'),
    ('Winners'' Group','胜者组')
)
update public.snooker_rounds r
set label_zh = m.label_zh
from round_map m
where r.label_en is not null
  and lower(btrim(r.label_en)) = lower(btrim(m.label_en))
  and (
    r.label_zh is null
    or btrim(r.label_zh) = ''
    or lower(btrim(r.label_zh)) = lower(btrim(r.label_en))
    or (r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]')
  );

-- 资格赛第 N 轮 / 第 N 轮：只处理明确的英文格式。
update public.snooker_rounds r
set label_zh = '资格赛第' || (regexp_match(btrim(r.label_en), '^Qualifying Round ([0-9]+)$', 'i'))[1] || '轮'
where r.label_en ~* '^Qualifying Round [0-9]+$'
  and (
    r.label_zh is null
    or btrim(r.label_zh) = ''
    or lower(btrim(r.label_zh)) = lower(btrim(r.label_en))
    or (r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]')
  );

update public.snooker_rounds r
set label_zh = '第' || (regexp_match(btrim(r.label_en), '^Round ([0-9]+)$', 'i'))[1] || '轮'
where r.label_en ~* '^Round [0-9]+$'
  and (
    r.label_zh is null
    or btrim(r.label_zh) = ''
    or lower(btrim(r.label_zh)) = lower(btrim(r.label_en))
    or (r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]')
  );

update public.snooker_rounds r
set label_zh = (regexp_match(btrim(r.label_en), '^Last ([0-9]+)$', 'i'))[1] || '强'
where r.label_en ~* '^Last [0-9]+$'
  and (
    r.label_zh is null
    or btrim(r.label_zh) = ''
    or lower(btrim(r.label_zh)) = lower(btrim(r.label_en))
    or (r.label_zh ~ '[A-Za-z]' and r.label_zh !~ '[一-龥]')
  );

-- D. 奖金轮次标签：只处理常见固定值。
with prize_map(label_en, label_zh) as (
  values
    ('Winner','冠军'),
    ('Runner-up','亚军'),
    ('Runner Up','亚军'),
    ('Semi-final','半决赛'),
    ('Semi-finals','半决赛'),
    ('Quarter-final','四分之一决赛'),
    ('Quarter-finals','四分之一决赛'),
    ('Last 16','16强'),
    ('Last 32','32强'),
    ('Last 64','64强'),
    ('Highest Break','单杆最高分'),
    ('Total','总奖金')
)
update public.snooker_event_prizes p
set label_zh = m.label_zh,
    updated_at = now()
from prize_map m
where p.label_en is not null
  and lower(btrim(p.label_en)) = lower(btrim(m.label_en))
  and (
    p.label_zh is null
    or btrim(p.label_zh) = ''
    or lower(btrim(p.label_zh)) = lower(btrim(p.label_en))
    or (p.label_zh ~ '[A-Za-z]' and p.label_zh !~ '[一-龥]')
  );

-- 不在本脚本自动处理：城市、场馆、赞助商、特殊赛事阶段、长文本传记、无固定中文译名专有名词。
-- 这些项目必须在审计结果基础上人工确认后再写入。

-- 安全验证：执行者确认结果后将 ROLLBACK 改为 COMMIT。
-- 默认回滚，防止误把脚本直接粘贴到生产库后立即生效。
rollback;
