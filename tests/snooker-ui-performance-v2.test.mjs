import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

test("V2 uses database WebP avatars and short names on compact match cards", async () => {
  const [ui, db, domain] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("lib/snooker/database-public.ts"),
    read("lib/snooker/domain.ts"),
  ]);

  assert.match(domain, /shortNameEn\?: string/);
  assert.match(domain, /avatarUrl\?: string/);
  assert.match(domain, /seasonStatistics\?: SnookerSeasonStatistics/);
  assert.match(db, /short_name_en,short_name_zh/);
  assert.match(db, /avatar_url/);
  assert.match(ui, /player\.avatarUrl \|\| player\.avatar\?\.url/);
  assert.match(ui, /<PlayerAvatar player=\{p1\} size="sm"/);
  assert.match(ui, /p1\.shortNameZh/);
  assert.match(ui, /p2\.shortNameZh/);
  assert.doesNotMatch(ui, /查看完整比分 ›/);
  assert.doesNotMatch(ui, /className=\{styles\.tapHint\}/);
});

test("home result winner is a small badge and compact names do not add English subtitles", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-ui-polish.module.css"),
  ]);

  assert.match(ui, /className=\{polish\.winBadge\}>胜<\/em>/);
  assert.match(ui, /className=\{polish\.homePlayerName\}/);
  assert.match(css, /\.winBadge\{[^}]*border-radius:50%/);
  assert.match(css, /\.homePlayerName\{[^}]*font-size:11px!important/);
  const homeScore = ui.match(/<div className=\{styles\.homeScore\}>[\s\S]*?<button className=\{styles\.fullButton\}/)?.[0] ?? "";
  assert.ok(homeScore.length > 0);
  assert.doesNotMatch(homeScore, /\.nameEn/);
});

test("current-season match detail keeps Match Season and H2H rows while historical matches collapse to match stats", async () => {
  const [ui, css, insights, dbV2] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-ui-polish.module.css"),
    read("app/snooker/snooker-insights.module.css"),
    read("lib/snooker/database-public-v2.ts"),
  ]);

  assert.match(ui, /type MatchDataTab = "match" \| "season" \| "h2h"/);
  assert.match(ui, /MATCHUP DATA/);
  assert.match(ui, /isCurrentSeasonMatch \? "对阵数据" : "比赛统计"/);
  assert.match(ui, /const hasMatchupData = isCurrentSeasonMatch \? hasStats \|\| hasSeason \|\| hasH2h : hasStats/);
  assert.match(ui, /<MatchupPlayer player=\{p1\}/);
  assert.match(ui, /<MatchupPlayer player=\{p2\}/);
  assert.match(ui, />本场<\/span><small>MATCH<\/small>/);
  assert.match(ui, />赛季<\/span><small>SEASON<\/small>/);
  assert.match(ui, />交手<\/span><small>H2H<\/small>/);
  assert.match(ui, /style=\{\{ display: "contents" \}\}/);
  assert.match(css, /\.matchupCard\{[^}]*display:flex;flex-direction:column/);
  assert.match(css, /\.matchupCard \.dataTabs\{[^}]*order:1/);
  assert.match(css, /\.matchupPlayers\{[^}]*order:2[^}]*margin:10px 0 0/);
  assert.match(css, /\.matchupPortrait\{[^}]*width:76px;height:94px/);
  assert.match(css, /\.panelMeta\{display:none\}/);
  assert.match(css, /\.matchupCard \.compareGrid>div\{padding:0;border:0\}/);
  assert.match(css, /\.matchupCard \.compareGrid>div>div\{[^}]*height:36px[^}]*min-height:36px[^}]*padding:5px 2px[^}]*border-bottom:1px solid #d8dfdb/);
  assert.match(css, /\.matchupCard \.compareGrid>div:last-child>div\{border-bottom:0\}/);
  assert.match(css, /\.matchupCard \.compareGrid>div>div\{height:36px;min-height:36px;padding:5px 2px;font-size:12px\}/);
  assert.match(css, /\.matchupCard \.compareLeft\{[^}]*padding-left:2px/);
  assert.match(css, /\.matchupCard \.compareRight\{[^}]*padding-right:2px/);
  assert.match(insights, /\.h2hSummary\{[^}]*min-height:62px[^}]*border-bottom:1px solid #dfe5e2/);
  assert.match(insights, /\.h2hSide\{[^}]*padding:0 2px/);
  assert.match(insights, /\.h2hMiddle strong\{display:none\}/);
  assert.match(insights, /content:"总局分"/);
  assert.match(ui, /localizedTournamentLabel\(item\.tournament, effectiveCalendarEvents\)/);
  assert.doesNotMatch(ui, /styles\.detailInfoCard/);
  assert.match(dbV2, /snooker_player_season_stats\?select=/);
  assert.match(dbV2, /season_start_year=eq\.\$\{Number\(base\.currentSeason\.slice\(0, 4\)\)\}/);
});

test("official world ranking is explicit, top three on mobile and top five on desktop, euro-prefixed and avatar-only clickable", async () => {
  const [ui, css, dbV2, playerData] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-ui-polish.module.css"),
    read("lib/snooker/database-public-v2.ts"),
    read("lib/snooker/player-data.ts"),
  ]);

  assert.match(ui, /className=\{styles\.mobileOnly\}>TOP 3/);
  assert.match(ui, /className=\{styles\.desktopOnly\}>TOP 5/);
  assert.match(ui, /rankingRows\.slice\(0, 5\)/);
  assert.match(ui, /index >= 3 \? styles\.rankingDesktopRow/);
  assert.match(ui, /return `€\$\{value\.toLocaleString/);
  assert.match(ui, /className=\{`\$\{polish\.rankingStaticRow\} \$\{index >= 3 \? styles\.rankingDesktopRow/);
  assert.match(ui, /className=\{polish\.rankingAvatarButton\} onClick=\{\(\) => openPlayer/);
  assert.match(css, /\.rankingStaticRow\{/);
  assert.match(dbV2, /list_key=eq\.world_official/);
  assert.match(dbV2, /rankings: rankings\.length \? rankings/);
  assert.match(playerData, /list_key: "eq\.world_official"/);
  assert.match(ui, /eyebrow="CHINA PLAYERS" title="中国球员"/);
});

test("event overview typography and public copy are user-facing", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");

  assert.match(ui, /eyebrow="TOURNAMENT OVERVIEW" title="赛事概览"/);
  assert.match(ui, /eyebrow="PRIZE MONEY" title="奖金分配"/);
  assert.match(ui, /className=\{polish\.championCard\}/);
  assert.match(ui, /CHAMPION · 本届冠军/);
  assert.match(ui, /赛程陆续公布中/);
  assert.match(ui, /更多赛程公布后将在这里更新/);
  assert.doesNotMatch(ui, /官方当前已公布/);
  assert.doesNotMatch(ui, /完赛后冻结保存到本站数据库/);
  assert.doesNotMatch(ui, /WST Match Centre/);
});

test("calendar dates render identically across EdgeOne and browser time zones", async () => {
  const ui = await read("app/snooker/snooker-data-center-v2.tsx");

  assert.match(ui, /start\.split\("-"\)\.map\(Number\)/);
  assert.match(ui, /formatMonthDay\(item\.startDate\)/);
  assert.doesNotMatch(ui, /new Date\(`\$\{item\.startDate\}T00:00:00\+08:00`\)/);
});

test("recent events use current-season raw events and avoid duplicating the featured event", async () => {
  const [ui, css] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-ui-polish.module.css"),
  ]);

  assert.match(ui, /const recentFeaturedEvent = activeEventCard/);
  assert.match(ui, /const recentCompletedEvents = \[\.\.\.mainSeasonEvents\]/);
  assert.match(ui, /const recentCardEvents = \[firstUpcomingCurrent, \.\.\.recentCompletedEvents\]/);
  assert.match(ui, /item\?\.id !== recentFeaturedEvent\?\.id/);
  assert.match(ui, /eventStatusText.*eventStatusClass\(item\.status\).*eventStatusLabel\(item\)/s);
  assert.match(ui, /<StatusPill status="type" label=\{typeZh\} \/>/);
  assert.match(ui, /eyebrow="RECENT TOURNAMENTS" title="近期赛事" action="最多 5 站"/);
  assert.match(ui, /查看本赛季完整赛历/);
  assert.match(ui, /actionClassName=\{`\$\{polish\.eventStatusText\} \$\{eventStatusClass\(nextEventCard\.status\)\}`\}/);
  assert.match(css, /\.eventStatusLive>span\{background:#eaf3ff!important;color:#2465a8!important\}/);
  assert.match(css, /\.eventStatusUpcoming>span\{background:#fff0e6!important;color:#bd5615!important\}/);
  assert.match(css, /\.eventStatusText\.eventStatusUpcoming\{color:#bd5615!important\}/);
  assert.match(css, /\.eventStatusCompleted>span\{background:#f0f2f1!important;color:#737b77!important\}/);
});

test("player directory and player detail share one root shell and focused data path", async () => {
  const [ui, directory, detail, inline, loader, api, playerCss] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/players/player-directory.tsx"),
    read("app/snooker/players/player-detail-content.tsx"),
    read("app/snooker/players/player-detail-inline.tsx"),
    read("lib/snooker/player-detail-fast.ts"),
    read("app/api/snooker/v1/player-detail/route.ts"),
    read("app/snooker/players/player.module.css"),
  ]);

  assert.match(ui, /activeView === "players" \? directoryLoaded && directoryModuleLoaded/);
  assert.match(ui, /<PlayerDirectoryContent players=\{directoryPlayers\}/);
  assert.match(ui, /if \(detail\?\.type === "player"\)/);
  assert.match(ui, /<PlayerDetailInline key=\{detail\.slug\}/);
  assert.match(ui, /dynamic\(\(\) => loadPlayerDirectoryModule\(\)/);
  assert.match(ui, /dynamic\(\(\) => import\("\.\/players\/player-detail-inline"\)/);
  assert.match(directory, /type="button"[\s\S]*className=\{styles\.playerRow\}/);
  assert.doesNotMatch(directory, /next\/link/);
  assert.doesNotMatch(detail, /PlayerShell/);
  assert.doesNotMatch(detail, /import Link from "next\/link"/);
  assert.match(inline, /loadPlayerDetail\(slug\)/);
  assert.match(loader, /rpc\/snooker_player_detail_public/);
  assert.match(loader, /next: \{ revalidate: 300 \}/);
  assert.match(api, /getSnookerPlayerDetailFast/);
  assert.match(playerCss, /\.directoryToolbar \.searchBox input\{/);
  assert.match(playerCss, /\.directoryToolbar \.filters button\{/);
});

test("slim homepage keeps all root tabs local and loads complete data only after activation", async () => {
  const [ui, sync, db, page] = await Promise.all([
    read("app/snooker/snooker-data-center-v2.tsx"),
    read("app/snooker/snooker-view-url-sync.tsx"),
    read("lib/snooker/database-public.ts"),
    read("app/page.tsx"),
  ]);

  assert.match(ui, /type MainView = "home" \| "matches" \| "players" \| "data"/);
  assert.match(ui, /activeView === "players" \? directoryLoaded && directoryModuleLoaded/);
  assert.match(ui, /const changeView = \(view: NavId\) => \{[\s\S]*?setActiveView\(view\);[\s\S]*?warmRootView\(view\)/);
  assert.match(ui, /url\.searchParams\.set\("view", "players"\)/);
  assert.match(ui, /url\.searchParams\.set\("player", target\.slug\)/);
  assert.doesNotMatch(ui, /router\.push\("\/snooker\/players"\)/);
  assert.doesNotMatch(ui, /SnookerRootController/);
  assert.match(sync, /Root-view URL\/history is owned by SnookerDataCenterV2/);
  assert.match(sync, /return null/);
  assert.doesNotMatch(sync, /document\.addEventListener|querySelector|pushState|replaceState|window\.location\.assign/);
  assert.match(page, /import SnookerViewUrlSync from "\.\/snooker\/snooker-view-url-sync"/);
  assert.match(page, /<SnookerViewUrlSync \/>/);
  assert.match(page, /initialPlayerSlug=\{requestedPlayer\}/);
  assert.match(db, /next: \{ revalidate \}/);
  assert.doesNotMatch(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /export const revalidate = 60/);
  assert.match(page, /if \(useHomeBootstrap\)[\s\S]*?else[\s\S]*?refreshSnookerDatabaseViewLive\(cachedDatabase\)/);
  assert.doesNotMatch(ui, /behavior: "smooth"/);
});
