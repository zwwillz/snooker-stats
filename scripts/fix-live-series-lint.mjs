import { readFile, writeFile } from "node:fs/promises";

const path = "app/snooker/snooker-data-center-v2.tsx";
let source = await readFile(path, "utf8");
const from = `  const shouldPollDashboard = useMemo(() => {
    const now = Date.now();`;
const to = `  const sourceFetchedAt = sourceHealth?.fetchedAt;
  const shouldPollDashboard = useMemo(() => {
    const now = sourceFetchedAt ? Date.parse(sourceFetchedAt) : 0;`;
if (!source.includes(from)) throw new Error("poll render-purity patch target missing");
source = source.replace(from, to);
const depFrom = `    }));
  }, [databaseEvents]);

  const refresh = useCallback`;
const depTo = `    }));
  }, [databaseEvents, sourceFetchedAt]);

  const refresh = useCallback`;
if (!source.includes(depFrom)) throw new Error("poll dependency patch target missing");
source = source.replace(depFrom, depTo);
await writeFile(path, source);
