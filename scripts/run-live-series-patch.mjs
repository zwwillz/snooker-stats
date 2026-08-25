import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourcePath = "scripts/apply-live-series-experience.mjs";
let source = await readFile(sourcePath, "utf8");
const start = source.indexOf("const eventBlock = `");
const endMarker = "`;\nui = regexOnce(ui, /  if \\(detail";
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("Unable to locate eventBlock template in patch script");
const before = source.slice(0, start);
const block = source.slice(start, end).replace(/(?<!\\)\$\{/g, "\\${");
const after = source.slice(end);
source = before + block + after;
const temp = "/tmp/apply-live-series-experience-fixed.mjs";
await writeFile(temp, source);
await import(pathToFileURL(temp).href);

const uiPath = "app/snooker/snooker-data-center-v2.tsx";
let ui = await readFile(uiPath, "utf8");
const impure = "    const now = Date.now();";
const pure = "    const now = sourceHealth?.fetchedAt ? Date.parse(sourceHealth.fetchedAt) : 0;";
if (!ui.includes(impure)) throw new Error("Generated poll clock target missing");
ui = ui.replace(impure, pure);
const deps = "  }, [databaseEvents]);";
if (!ui.includes(deps)) throw new Error("Generated poll dependency target missing");
ui = ui.replace(deps, "  }, [databaseEvents, sourceHealth?.fetchedAt]);");
await writeFile(uiPath, ui);
