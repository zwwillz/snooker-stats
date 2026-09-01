from pathlib import Path
p=Path('app/snooker/snooker-data-center-v2.tsx')
s=p.read_text()
start=s.index('    const seasonRows: Array<[string, keyof SnookerSeasonStatistics, string]>')
end=s.index('  if (detail?.type === "event") {', start)
region=s[start:end]
old='return <main className={styles.appRoot} data-theme={theme}><div className={styles.detailShell}>'
new='return <main className={styles.appRoot} data-theme={theme}><div className={`${styles.detailShell} ${priority.matchDetailShell}`} data-match-detail>'
if old not in region: raise SystemExit('match detail shell marker missing')
region=region.replace(old,new,1)
s=s[:start]+region+s[end:]
p.write_text(s)
