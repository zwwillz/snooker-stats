from pathlib import Path

path = Path("app/snooker/snooker-data-center-v2.tsx")
text = path.read_text()

old = '''  useEffect(() => {
    if (!initialHomeBootstrap) return;
    if (activeView === "players") void ensurePlayerDirectory();
    if (activeView === "data") void ensureRankingHub();
  }, [activeView, ensurePlayerDirectory, ensureRankingHub, initialHomeBootstrap]);'''
new = '''  useEffect(() => {
    if (!initialHomeBootstrap) return;
    const frame = window.requestAnimationFrame(() => {
      if (activeView === "players") void ensurePlayerDirectory();
      if (activeView === "data") void ensureRankingHub();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeView, ensurePlayerDirectory, ensureRankingHub, initialHomeBootstrap]);'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"lazy root-view effect: expected exactly 1 match, got {count}")
path.write_text(text.replace(old, new))
