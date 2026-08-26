import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Anchor not found in ${path}`);
  await writeFile(path, source.replace(before, after));
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

console.log("Player Compare polish lint fixes applied.");
