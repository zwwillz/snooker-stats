from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    path.write_text(text.replace(old, new, 1))


ui = Path("app/snooker/snooker-data-center-v2.tsx")
replace_once(
    ui,
    '''  useEffect(() => {\n    if (!shouldPollDashboard) return;\n    void refresh();\n    const timer = window.setInterval(() => void refresh(), 30_000);\n    const onVisibility = () => { if (!document.hidden) void refresh(); };\n    document.addEventListener("visibilitychange", onVisibility);\n    return () => {\n      window.clearInterval(timer);\n      document.removeEventListener("visibilitychange", onVisibility);\n    };\n  }, [shouldPollDashboard, refresh]);''',
    '''  useEffect(() => {\n    if (!shouldPollDashboard) return;\n    const firstRefreshFrame = window.requestAnimationFrame(() => void refresh());\n    const timer = window.setInterval(() => void refresh(), 30_000);\n    const onVisibility = () => { if (!document.hidden) void refresh(); };\n    document.addEventListener("visibilitychange", onVisibility);\n    return () => {\n      window.cancelAnimationFrame(firstRefreshFrame);\n      window.clearInterval(timer);\n      document.removeEventListener("visibilitychange", onVisibility);\n    };\n  }, [shouldPollDashboard, refresh]);''',
    "defer first live refresh",
)

bootstrap = Path("lib/snooker/home-bootstrap.ts")
replace_once(
    bootstrap,
    '''  const playerByUuid = new Map(payload.players.map((row, index) => [row.id, players[index]]));\n''',
    '''''',
    "remove unused playerByUuid",
)
