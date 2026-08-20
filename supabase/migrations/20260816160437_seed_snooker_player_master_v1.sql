insert into public.snooker_players
(slug,name_en,name_zh,short_name_zh,nationality_zh,country_code,date_of_birth,current_rank,ranking_points,profile_source)
values
('judd-trump','Judd Trump','贾德·特鲁姆普','特鲁姆普','英格兰','ENG','1989-08-20',1,1655550,'curated'),
('neil-robertson','Neil Robertson','尼尔·罗伯逊','罗伯逊','澳大利亚','AUS',null,2,1206550,'curated'),
('zhao-xintong','Zhao Xintong','赵心童','赵心童','中国','CHN','1997-04-03',3,1178550,'WST'),
('wu-yize','Wu Yize','吴宜泽','吴宜泽','中国','CHN','2003-10-14',4,1114900,'WST'),
('john-higgins','John Higgins','约翰·希金斯','希金斯','苏格兰','SCO',null,5,967350,'WST'),
('shaun-murphy','Shaun Murphy','肖恩·墨菲','墨菲','英格兰','ENG',null,6,951800,'curated'),
('kyren-wilson','Kyren Wilson','凯伦·威尔逊','威尔逊','英格兰','ENG',null,7,895100,'curated'),
('mark-williams','Mark Williams','马克·威廉姆斯','威廉姆斯','威尔士','WAL',null,8,894400,'WST'),
('mark-selby','Mark Selby','马克·塞尔比','塞尔比','英格兰','ENG','1983-06-19',9,849350,'WST'),
('barry-hawkins','Barry Hawkins','巴里·霍金斯','霍金斯','英格兰','ENG',null,10,685350,'curated'),
('xiao-guodong','Xiao Guodong','肖国栋','肖国栋','中国','CHN',null,11,658900,'curated'),
('mark-allen','Mark Allen','马克·艾伦','艾伦','北爱尔兰','NIR',null,12,587750,'curated'),
('chris-wakelin','Chris Wakelin','克里斯·韦克林','韦克林','英格兰','ENG',null,13,585200,'curated'),
('ronnie-osullivan','Ronnie O''Sullivan','罗尼·奥沙利文','奥沙利文','英格兰','ENG',null,14,550250,'curated'),
('ding-junhui','Ding Junhui','丁俊晖','丁俊晖','中国','CHN','1987-04-01',15,464850,'curated'),
('si-jiahui','Si Jiahui','斯佳辉','斯佳辉','中国','CHN',null,16,437400,'curated'),
('zhang-anda','Zhang Anda','张安达','张安达','中国','CHN',null,19,358950,'curated'),
('stuart-bingham','Stuart Bingham','斯图尔特·宾汉姆','宾汉姆','英格兰','ENG',null,21,337700,'curated'),
('zhou-yuelong','Zhou Yuelong','周跃龙','周跃龙','中国','CHN',null,22,315250,'curated'),
('pang-junxu','Pang Junxu','庞俊旭','庞俊旭','中国','CHN',null,26,283900,'curated'),
('hossein-vafaei','Hossein Vafaei','侯赛因·瓦菲','瓦菲','伊朗','IRN',null,27,252600,'curated'),
('david-gilbert','David Gilbert','大卫·吉尔伯特','吉尔伯特','英格兰','ENG',null,32,230700,'curated'),
('tom-ford','Tom Ford','汤姆·福德','福德','英格兰','ENG',null,35,187050,'curated'),
('anthony-mcgill','Anthony McGill','安东尼·麦克吉尔','麦克吉尔','苏格兰','SCO',null,38,174850,'curated'),
('jackson-page','Jackson Page','杰克逊·佩奇','佩奇','威尔士','WAL',null,39,174250,'curated'),
('aaron-hill','Aaron Hill','亚伦·希尔','希尔','爱尔兰','IRL',null,41,170950,'curated'),
('matthew-selt','Matthew Selt','马修·塞尔特','塞尔特','英格兰','ENG',null,44,167000,'curated'),
('noppon-saengkham','Noppon Saengkham','诺鹏·桑坎姆','桑坎姆','泰国','THA','1992-07-15',45,162350,'curated'),
('chang-bingyu','Chang Bingyu','常冰玉','常冰玉','中国','CHN',null,47,149100,'curated'),
('liu-hongyu','Liu Hongyu','刘宏宇','刘宏宇','中国','CHN',null,56,119700,'curated'),
('jiang-jun','Jiang Jun','江俊','江俊','中国','CHN',null,65,74350,'curated'),
('yao-pengcheng','Yao Pengcheng','姚朋成','姚朋成','中国','CHN',null,79,30850,'WST'),
('liu-linhao','Liu Linhao','刘林昊','刘林昊','中国','CHN',null,null,null,'curated'),
('wu-shengguang','Wu Shengguang','吴盛光','吴盛光','中国','CHN',null,null,null,'curated')
on conflict (slug) do update set
  name_en=excluded.name_en,
  name_zh=excluded.name_zh,
  short_name_zh=excluded.short_name_zh,
  nationality_zh=excluded.nationality_zh,
  country_code=excluded.country_code,
  date_of_birth=coalesce(excluded.date_of_birth, public.snooker_players.date_of_birth),
  current_rank=excluded.current_rank,
  ranking_points=excluded.ranking_points,
  profile_source=excluded.profile_source;

insert into public.snooker_player_names(player_id,locale,display_name,short_name,aliases,source_name,status,reviewed_at)
select id,'zh-CN',name_zh,short_name_zh,
  case when slug='mark-williams' then array['马克·J·威廉姆斯']::text[] else '{}'::text[] end,
  'poc_curated','verified',now()
from public.snooker_players
on conflict (player_id,locale) do update set display_name=excluded.display_name,short_name=excluded.short_name,aliases=excluded.aliases,source_name=excluded.source_name,status=excluded.status,reviewed_at=excluded.reviewed_at;

insert into public.snooker_player_names(player_id,locale,display_name,short_name,aliases,source_name,status,reviewed_at)
select id,'en',name_en,name_en,
  case when slug='mark-williams' then array['Mark J Williams']::text[] else '{}'::text[] end,
  'poc_curated','verified',now()
from public.snooker_players
on conflict (player_id,locale) do update set display_name=excluded.display_name,short_name=excluded.short_name,aliases=excluded.aliases,source_name=excluded.source_name,status=excluded.status,reviewed_at=excluded.reviewed_at;

insert into public.snooker_source_entity_map(entity_type,entity_id,source_name,source_id,source_url,confidence,mapping_status)
select 'player',id,'WST',wst_id,'https://www.wst.tv/players/'||wst_id,1.0000,'verified'
from (
  select id, case slug
    when 'zhao-xintong' then '895d376f-9f42-4e67-8a63-bc78676d0726'
    when 'wu-yize' then 'd935d534-e696-4292-b773-e9b8efee1ea7'
    when 'john-higgins' then 'a5eecca1-8302-4739-84fc-6721627baa43'
    when 'mark-williams' then '6aaddcbb-345c-474a-9069-e7757e155729'
    when 'mark-selby' then 'ba7831b4-ab75-4435-946a-c6f02e4e2d4b'
    when 'yao-pengcheng' then '3481ae79-48df-4da2-ae40-575f21b0bc12'
  end as wst_id
  from public.snooker_players
  where slug in ('zhao-xintong','wu-yize','john-higgins','mark-williams','mark-selby','yao-pengcheng')
) s
on conflict (entity_type,source_name,source_id) do update set entity_id=excluded.entity_id,source_url=excluded.source_url,confidence=excluded.confidence,mapping_status=excluded.mapping_status;
