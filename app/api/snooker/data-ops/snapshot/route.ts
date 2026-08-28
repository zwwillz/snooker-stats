import { loadSnookerOpsSnapshotSection } from "@/lib/snooker/data-ops-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sections = new Set(["overview", "analytics", "sync", "quality", "logs"]);

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("section") || "overview";
    if (!sections.has(requested)) {
      return Response.json({ error: "不支持的数据分区。" }, { status: 400 });
    }
    const snapshot = await loadSnookerOpsSnapshotSection<unknown>(requested);
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据运维快照读取失败。";
    const status = message.includes("UNAUTHORIZED") ? 401 : message.includes("PASSWORD_CHANGE_REQUIRED") ? 428 : 500;
    return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
