from pathlib import Path

path = Path("app/snooker/snooker-data-center-v2.tsx")
text = path.read_text()

old_effect = '''  }, [rankingHubLoaded, rankingHubLoading]);

  useEffect(() => {
    if (detail?.type !== "event" || detail.tab !== "schedule") return;'''
new_effect = '''  }, [rankingHubLoaded, rankingHubLoading]);

  useEffect(() => {
    if (!initialHomeBootstrap) return;
    if (activeView === "players") void ensurePlayerDirectory();
    if (activeView === "data") void ensureRankingHub();
  }, [activeView, ensurePlayerDirectory, ensureRankingHub, initialHomeBootstrap]);

  useEffect(() => {
    if (detail?.type !== "event" || detail.tab !== "schedule") return;'''

old_nav = '''    <nav className={`${styles.bottomNav} ${polish.fastNav}`}>{navItems.map((item) => <button key={item.id} className={item.id === activeView ? styles.activeNav : ""} onClick={() => changeView(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</nav>'''
new_nav = '''    <nav className={`${styles.bottomNav} ${polish.fastNav}`}>{navItems.map((item) => <a key={item.id} href={item.id === "home" ? "/" : `/?view=${item.id}`} className={`${polish.fastNavLink} ${item.id === activeView ? styles.activeNav : ""}`} onClick={(event) => { event.preventDefault(); window.history.replaceState(window.history.state, "", event.currentTarget.href); changeView(item.id); }}><span>{item.icon}</span><b>{item.label}</b></a>)}</nav>'''

for old, new, label in [
    (old_effect, new_effect, "initial root-view lazy loading effect"),
    (old_nav, new_nav, "progressive bottom navigation"),
]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, got {count}")
    text = text.replace(old, new)

path.write_text(text)
