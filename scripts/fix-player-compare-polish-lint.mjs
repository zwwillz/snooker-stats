import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Anchor not found in ${path}`);
  await writeFile(path, source.replace(before, after));
}

async function removeOnce(path, block) {
  const source = await readFile(path, "utf8");
  if (!source.includes(block)) return;
  await writeFile(path, source.replace(block, ""));
}

await replaceOnce(
  "app/snooker/compare/player-compare-teaser.tsx",
  '    if (initialMatchesPair && initialData) {\n      setData(initialData);\n      return;\n    }\n',
  '    if (initialMatchesPair && initialData) return;\n',
);

await replaceOnce(
  "app/snooker/snooker-data-center-v2.tsx",
  '  useEffect(() => {\n    try {\n      const stored = window.localStorage.getItem("snooker-theme");\n      if (stored === "green" || stored === "red") setTheme(stored);\n    } catch {\n      // Keep the default theme when storage is unavailable.\n    }\n  }, []);\n',
  '  useEffect(() => {\n    let frame = 0;\n    try {\n      const stored = window.localStorage.getItem("snooker-theme");\n      if (stored === "green" || stored === "red") frame = window.requestAnimationFrame(() => setTheme(stored));\n    } catch {\n      // Keep the default theme when storage is unavailable.\n    }\n    return () => { if (frame) window.cancelAnimationFrame(frame); };\n  }, []);\n',
);

await removeOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '      <div className={styles.heroControls}>\n        <label>赛季<select value={data?.season ?? ""} disabled={!data || loading} onChange={(event) => void load(selected, event.target.value)}>{data?.availableSeasons.map((season) => <option value={season} key={season}>{season}</option>)}</select></label>\n        <span>{loading ? "正在更新对比…" : data ? `数据更新 ${displayUpdated(data.updatedAt)}` : "数据加载中"}</span>\n      </div>\n',
);

await removeOnce(
  "app/snooker/compare/player-compare-client.tsx",
  '  PlayerCompareCareer,\n',
);

console.log("Player Compare polish lint and duplicate-control fixes applied.");
