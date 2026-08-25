-- 147数据局：已人工/可信来源核验的历史球员中文名与历史赛事举办城市。
-- 2026-08-26 production backfill mirror.
--
-- 原则：
-- 1) 仅在中文字段为空、等于英文或为纯英文时补球员中文名；不覆盖已有有效中文。
-- 2) 城市使用 (name_en, start_date) 双键，避免同名赛事跨赛季误写。
-- 3) 英文源字段不修改。
-- 4) 有来源冲突的项目不写入，例如 2023 6-Reds World Championship 的 Bangkok / Pathum Thani 城市口径。

begin;

with player_map(name_en,name_zh,short_name_zh) as (values
  ('Kurt Maflin','柯特·马福林','马福林'),
  ('Stephen Hendry','斯蒂芬·亨德利','亨德利'),
  ('Aditya Mehta','阿迪蒂亚·梅塔','梅塔'),
  ('Sunny Akani','桑尼·阿卡尼','阿卡尼'),
  ('Yu Delu','于德陆','于德陆'),
  ('Niu Zhuang','牛壮','牛壮'),
  ('Li Yuan','李远','李远'),
  ('Chen Zhe','陈喆','陈喆'),
  ('Jamie Cope','杰米·科普','科普'),
  ('Farakh Ajaib','法拉赫·阿贾伊布','阿贾伊布'),
  ('Lee Walker','李·沃克','沃克'),
  ('Ben Hancorn','本·汉考恩','汉考恩'),
  ('Riley Parsons','莱利·帕森斯','帕森斯'),
  ('Jamie Wilson','杰米·威尔逊','威尔逊'),
  ('Hamza Akbar','哈姆扎·阿克巴','阿克巴'),
  ('Fraser Patrick','弗雷泽·帕特里克','帕特里克')
), updated_players as (
  update public.snooker_players p
  set name_zh = m.name_zh,
      short_name_zh = m.short_name_zh,
      updated_at = now()
  from player_map m
  where p.name_en = m.name_en
    and (
      coalesce(btrim(p.name_zh),'') = ''
      or lower(btrim(p.name_zh)) = lower(btrim(p.name_en))
      or (p.name_zh ~ '[A-Za-z]' and p.name_zh !~ '[一-龥]')
    )
  returning p.id,p.name_en,p.name_zh,p.short_name_zh
)
insert into public.snooker_player_names(
  player_id,locale,display_name,short_name,aliases,source_name,status,reviewed_at,updated_at
)
select id,'zh-CN',name_zh,short_name_zh,array[]::text[],
       'translation-governance:verified-media','verified',now(),now()
from updated_players
on conflict(player_id,locale) do update set
  display_name=excluded.display_name,
  short_name=excluded.short_name,
  source_name=excluded.source_name,
  status='verified',
  reviewed_at=now(),
  updated_at=now();

with city_map(name_en,start_date,city_zh) as (values
  ('2023 Championship League'::text,'2022-12-19'::date,'莱斯特'::text),
  ('2022 English Open','2022-12-12','布伦特伍德'),
  ('2022 Scottish Open','2022-11-28','爱丁堡'),
  ('2022 UK Championship','2022-11-12','约克'),
  ('2022 Champion of Champions','2022-10-31','博尔顿'),
  ('2022 Northern Ireland Open','2022-10-16','贝尔法斯特'),
  ('2022 Hong Kong Masters','2022-10-06','香港'),
  ('2022 British Open','2022-09-26','米尔顿凯恩斯'),
  ('2022 European Masters','2022-08-16','菲尔特'),
  ('2022 Championship League','2022-06-28','莱斯特'),
  ('2022 Q School - Event 1','2022-05-16','谢菲尔德'),
  ('2022 Q School - Event 2','2022-05-22','谢菲尔德'),
  ('2022 Q School - Event 3','2022-05-28','谢菲尔德'),
  ('2022 Q School Asia-Oceania - Event 1','2022-06-01','曼谷'),
  ('2022 Q School Asia-Oceania - Event 2','2022-06-07','曼谷'),

  ('2020 Championship League','2020-09-13','米尔顿凯恩斯'),
  ('2020 European Masters','2020-09-21','米尔顿凯恩斯'),
  ('2020 English Open','2020-10-12','米尔顿凯恩斯'),
  ('2020 Champion of Champions','2020-11-02','米尔顿凯恩斯'),
  ('2020 Northern Ireland Open','2020-11-16','米尔顿凯恩斯'),
  ('2020 UK Championship','2020-11-23','米尔顿凯恩斯'),
  ('2020 Scottish Open','2020-12-07','米尔顿凯恩斯'),
  ('2020 World Grand Prix','2020-12-14','米尔顿凯恩斯'),
  ('2021 Championship League','2021-01-04','米尔顿凯恩斯'),
  ('2021 Masters','2021-01-10','米尔顿凯恩斯'),
  ('2021 WST Pro Series','2021-01-18','米尔顿凯恩斯'),
  ('2021 German Masters','2021-01-27','米尔顿凯恩斯'),
  ('2021 Snooker Shoot Out','2021-02-04','米尔顿凯恩斯'),
  ('2021 Welsh Open','2021-02-15','纽波特'),
  ('2021 Players Championship','2021-02-22','米尔顿凯恩斯'),
  ('2021 Gibraltar Open','2021-03-01','米尔顿凯恩斯'),
  ('2021 Tour Championship','2021-03-22','纽波特'),
  ('2021 World Championship','2021-04-17','谢菲尔德'),
  ('2021 Q School - Event 1','2021-05-27','谢菲尔德'),
  ('2021 Q School - Event 2','2021-06-02','谢菲尔德'),
  ('2021 Q School - Event 3','2021-06-08','谢菲尔德'),

  ('2021 Championship League','2021-07-18','莱斯特'),
  ('2021 British Open','2021-08-16','莱斯特'),
  ('2021 Northern Ireland Open','2021-10-10','贝尔法斯特'),
  ('2021 English Open','2021-11-01','米尔顿凯恩斯'),
  ('2021 Champion of Champions','2021-11-15','博尔顿'),
  ('2021 UK Championship','2021-11-23','约克'),
  ('2021 Scottish Open','2021-12-06','兰迪德诺'),
  ('2021 World Grand Prix','2021-12-13','考文垂'),
  ('2022 Championship League','2021-12-20','莱斯特'),
  ('2022 Masters','2022-01-09','伦敦'),
  ('2022 Snooker Shoot Out','2022-01-20','莱斯特'),
  ('2022 German Masters','2022-01-26','柏林'),
  ('2022 Players Championship','2022-02-07','伍尔弗汉普顿'),
  ('2022 European Masters','2022-02-21','米尔顿凯恩斯'),
  ('2022 Welsh Open','2022-02-28','纽波特'),
  ('2022 Turkish Masters','2022-03-07','安塔利亚'),
  ('2022 Gibraltar Open','2022-03-24','直布罗陀'),
  ('2022 Tour Championship','2022-03-28','兰迪德诺'),
  ('2022 World Championship','2022-04-16','谢菲尔德'),

  ('2018 Riga Masters','2018-07-27','里加'),
  ('2018 World Open','2018-08-06','玉山'),
  ('2018 Paul Hunter Classic','2018-08-24','菲尔特'),
  ('2018 6-Reds World Championship','2018-09-03','曼谷'),
  ('2018 Shanghai Masters','2018-09-10','上海'),
  ('2018 China Championship','2018-09-24','广州'),
  ('2018 European Masters','2018-10-01','洛默尔'),
  ('2018 English Open','2018-10-15','克劳利'),
  ('2018 International Championship','2018-10-28','大庆'),
  ('2018 Champion of Champions','2018-11-05','考文垂'),
  ('2018 Northern Ireland Open','2018-11-12','贝尔法斯特'),
  ('2018 UK Championship','2018-11-27','约克'),
  ('2018 Scottish Open','2018-12-10','格拉斯哥'),
  ('2019 Championship League','2019-01-01','考文垂'),
  ('2019 Masters','2019-01-13','伦敦'),
  ('2019 German Masters','2019-01-30','柏林'),
  ('2019 World Grand Prix','2019-02-04','切尔滕纳姆'),
  ('2019 Welsh Open','2019-02-11','加的夫'),
  ('2019 Snooker Shoot Out','2019-02-21','沃特福德'),
  ('2019 Indian Open','2019-02-27','科钦'),
  ('2019 Players Championship','2019-03-04','普雷斯顿'),
  ('2019 Gibraltar Open','2019-03-13','直布罗陀'),
  ('2019 Tour Championship','2019-03-19','兰迪德诺'),
  ('2019 China Open','2019-04-01','北京'),
  ('2019 World Championship','2019-04-20','谢菲尔德'),
  ('2019 Q School - Event 1','2019-05-18','维冈'),
  ('2019 Q School - Event 2','2019-05-24','维冈'),
  ('2019 Q School - Event 3','2019-05-30','维冈'),

  ('2019 Riga Masters','2019-07-26','里加'),
  ('2019 International Championship','2019-08-04','大庆'),
  ('2019 Paul Hunter Classic','2019-08-24','菲尔特'),
  ('2019 6-Reds World Championship','2019-09-02','曼谷'),
  ('2019 Shanghai Masters','2019-09-09','上海'),
  ('2019 China Championship','2019-09-23','广州'),
  ('2020 Championship League','2019-10-07','莱斯特'),
  ('2019 English Open','2019-10-14','克劳利'),
  ('2019 World Open','2019-10-28','玉山'),
  ('2019 Champion of Champions','2019-11-04','考文垂'),
  ('2019 Northern Ireland Open','2019-11-11','贝尔法斯特'),
  ('2019 UK Championship','2019-11-26','约克'),
  ('2019 Scottish Open','2019-12-09','格拉斯哥'),
  ('2020 Masters','2020-01-12','伦敦'),
  ('2020 European Masters','2020-01-22','多恩比恩'),
  ('2020 German Masters','2020-01-29','柏林'),
  ('2020 World Grand Prix','2020-02-03','切尔滕纳姆'),
  ('2020 Welsh Open','2020-02-10','加的夫'),
  ('2020 Snooker Shoot Out','2020-02-20','沃特福德'),
  ('2020 Players Championship','2020-02-24','绍斯波特'),
  ('2020 Gibraltar Open','2020-03-13','直布罗陀'),
  ('2020 Championship League','2020-06-01','米尔顿凯恩斯'),
  ('2020 Tour Championship','2020-06-20','米尔顿凯恩斯'),
  ('2020 World Championship','2020-07-31','谢菲尔德'),
  ('2020 Q School - Event 1','2020-08-03','谢菲尔德'),
  ('2020 Q School - Event 2','2020-08-04','谢菲尔德'),
  ('2020 Q School - Event 3','2020-08-05','谢菲尔德'),

  ('2017 Q School - Event 1','2017-05-09','普雷斯顿'),
  ('2017 Q School - Event 2','2017-05-15','普雷斯顿'),
  ('2017 Riga Masters','2017-06-23','里加'),
  ('2017 Hong Kong Masters','2017-07-20','香港'),
  ('2017 China Championship','2017-08-16','广州'),
  ('2017 Paul Hunter Classic','2017-08-25','菲尔特'),
  ('2017 6-Reds World Championship','2017-09-04','曼谷'),
  ('2017 Indian Open','2017-09-12','维沙卡帕特南'),
  ('2017 World Open','2017-09-18','玉山'),
  ('2017 European Masters','2017-10-02','洛默尔'),
  ('2017 English Open','2017-10-16','巴恩斯利'),
  ('2017 International Championship','2017-10-29','大庆'),
  ('2017 Champion of Champions','2017-11-06','考文垂'),
  ('2017 Shanghai Masters','2017-11-13','上海'),
  ('2017 Northern Ireland Open','2017-11-20','贝尔法斯特'),
  ('2017 UK Championship','2017-11-28','约克'),
  ('2017 Scottish Open','2017-12-11','格拉斯哥'),
  ('2018 Championship League','2018-01-02','考文垂'),
  ('2018 Masters','2018-01-14','伦敦'),
  ('2018 German Masters','2018-01-31','柏林'),
  ('2018 Snooker Shoot Out','2018-02-08','沃特福德'),
  ('2018 World Grand Prix','2018-02-19','普雷斯顿'),
  ('2018 Welsh Open','2018-02-26','加的夫'),
  ('2018 Gibraltar Open','2018-03-09','直布罗陀'),
  ('2018 Romanian Masters','2018-03-14','布加勒斯特'),
  ('2018 Players Championship','2018-03-19','兰迪德诺'),
  ('2018 China Open','2018-04-01','北京'),
  ('2018 World Championship','2018-04-21','谢菲尔德'),
  ('2018 Q School - Event 1','2018-05-14','特伦特河畔伯顿'),
  ('2018 Q School - Event 2','2018-05-20','特伦特河畔伯顿'),
  ('2018 Q School - Event 3','2018-05-26','特伦特河畔伯顿')
)
update public.snooker_events e
set city_zh=m.city_zh,updated_at=now()
from city_map m
where e.name_en=m.name_en
  and e.start_date=m.start_date
  and coalesce(btrim(e.city_zh),'')='';

-- Existing Chinese was semantically wrong; this correction is explicit and narrow.
update public.snooker_events
set name_zh='2018罗马尼亚大师赛',
    stage_name_zh=case when stage_name_en=name_en then '2018罗马尼亚大师赛' else stage_name_zh end,
    updated_at=now()
where name_en='2018 Romanian Masters'
  and start_date='2018-03-14'
  and name_zh='2018斯诺克大师赛';

commit;

-- Verification helpers:
select count(*) as unresolved_event_city_count
from public.snooker_events
where coalesce(btrim(city_zh),'')='';

select count(*) as unresolved_player_name_count
from public.snooker_players
where name_zh is null
   or btrim(name_zh)=''
   or lower(btrim(name_zh))=lower(btrim(name_en))
   or (name_zh ~ '[A-Za-z]' and name_zh !~ '[一-龥]');
