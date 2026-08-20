import { createClient } from "npm:@supabase/supabase-js@2";

type Body = {
  operation?: string;
  username?: string;
  password?: string;
  newPassword?: string;
  token?: string;
  action?: string;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  visitorId?: string;
  path?: string;
  pageLabel?: string;
  eventLabel?: string;
  region?: string;
  device?: string;
  referrer?: string;
  range?: string;
  query?: string;
  page?: number;
};

type SessionState = {
  authenticated?: boolean;
  mustChangePassword?: boolean;
};

type VisitRow = {
  id: string;
  createdAt: string;
  visitorId: string;
  ipAddress: string | null;
  path: string;
  pageLabel: string;
  eventLabel: string;
  region: string;
  device: string;
};

const PAGE_SIZE = 100;
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const BLOCKED_PATH_PREFIXES = ["/api", "/snooker/site-monitor", "/snooker/data-ops"];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validVisitorId(value: string) {
  return /^[a-zA-Z0-9._-]{8,80}$/.test(value);
}

function chinaDayStart(reference: Date, offsetDays = 0) {
  const shifted = new Date(reference.getTime() + CHINA_OFFSET_MS);
  const shiftedMidnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + offsetDays,
  );
  return new Date(shiftedMidnightUtc - CHINA_OFFSET_MS).toISOString();
}

function rangeBounds(range: string) {
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStart = chinaDayStart(now);
  if (range === "today") return { from: todayStart, to: nowIso };
  if (range === "yesterday") return { from: chinaDayStart(now, -1), to: todayStart };
  if (range === "30d") return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to: nowIso };
  return { from: new Date(now.getTime() - 7 * 86400000).toISOString(), to: nowIso };
}

function visitorLabel(visitorId: string) {
  const compact = visitorId.replace(/[^a-zA-Z0-9]/g, "");
  return `游客 ${compact.slice(-4).toUpperCase() || "----"}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Server credentials unavailable" }, 503);

    const body = await req.json() as Body;
    const operation = body.operation || "";
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (operation === "log-visit") {
      const visitorId = clean(body.visitorId, 80);
      const path = clean(body.path, 320);
      const pathname = path.split("?")[0] || "/";
      if (!validVisitorId(visitorId) || !path.startsWith("/") || BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return json({ ok: true, recorded: false });
      }

      const ipAddress = clean(body.ip, 80) || null;
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
      let rateQuery = supabase
        .from("snooker_visit_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneMinuteAgo);
      rateQuery = ipAddress
        ? rateQuery.eq("ip_address", ipAddress)
        : rateQuery.eq("visitor_id", visitorId);
      const { count, error: rateError } = await rateQuery;
      if (rateError) throw rateError;
      if ((count || 0) >= 120) return json({ ok: true, recorded: false });

      const pageLabel = clean(body.pageLabel, 140);
      const twentySecondsAgo = new Date(Date.now() - 20_000).toISOString();
      const { data: duplicate, error: duplicateError } = await supabase
        .from("snooker_visit_logs")
        .select("id")
        .eq("visitor_id", visitorId)
        .eq("path", path)
        .eq("page_label", pageLabel)
        .gte("created_at", twentySecondsAgo)
        .limit(1);
      if (duplicateError) throw duplicateError;
      if (duplicate?.length) return json({ ok: true, recorded: false });

      const { error: insertError } = await supabase.from("snooker_visit_logs").insert({
        visitor_id: visitorId,
        ip_address: ipAddress,
        path,
        page_label: pageLabel,
        event_label: clean(body.eventLabel, 120),
        region: clean(body.region, 160) || "未知",
        device: clean(body.device, 120) || "未知",
        referrer: clean(body.referrer, 320),
        user_agent: clean(body.userAgent, 500),
      });
      if (insertError) throw insertError;
      return json({ ok: true, recorded: true });
    }

    if (operation === "visits") {
      const { data: session, error: sessionError } = await supabase.rpc("snooker_ops_session", {
        p_token: body.token || "",
      });
      if (sessionError) throw sessionError;
      const state = session as SessionState | null;
      if (!state?.authenticated) return json({ error: "UNAUTHORIZED" }, 401);
      if (state.mustChangePassword) return json({ error: "PASSWORD_CHANGE_REQUIRED" }, 428);

      const page = Math.max(1, Math.min(10_000, Math.floor(Number(body.page) || 1)));
      const offset = (page - 1) * PAGE_SIZE;
      const { from, to } = rangeBounds(clean(body.range, 20));
      const { data, error } = await supabase.rpc("snooker_visit_list", {
        p_from: from,
        p_to: to,
        p_query: clean(body.query, 80),
        p_limit: PAGE_SIZE + 1,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = (data || []) as VisitRow[];
      return json({
        rows: rows.slice(0, PAGE_SIZE).map((row) => ({
          id: row.id,
          time: row.createdAt,
          visitor: visitorLabel(row.visitorId),
          ip: row.ipAddress || "未知",
          region: row.region || "未知",
          device: row.device || "未知",
          page: row.pageLabel || row.path || "147数据局",
          event: row.eventLabel || "—",
          action: "浏览页面",
        })),
        page,
        pageSize: PAGE_SIZE,
        hasPrevious: page > 1,
        hasNext: rows.length > PAGE_SIZE,
      });
    }

    let fn = "";
    let args: Record<string, unknown> = {};
    switch (operation) {
      case "login":
        fn = "snooker_ops_login";
        args = {
          p_username: body.username || "",
          p_password: body.password || "",
          p_ip: body.ip || req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
          p_user_agent: body.userAgent || req.headers.get("user-agent"),
        };
        break;
      case "session":
        fn = "snooker_ops_session";
        args = { p_token: body.token || "" };
        break;
      case "change-password":
        fn = "snooker_ops_change_password";
        args = { p_token: body.token || "", p_new_password: body.newPassword || "" };
        break;
      case "logout":
        fn = "snooker_ops_logout";
        args = { p_token: body.token || "" };
        break;
      case "snapshot":
        fn = "snooker_ops_snapshot";
        args = { p_token: body.token || "" };
        break;
      case "action":
        fn = "snooker_ops_run_action";
        args = { p_token: body.token || "", p_action: body.action || "", p_payload: body.payload || {} };
        break;
      default:
        return json({ error: "Unsupported operation" }, 400);
    }

    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const message = error.message || "Snooker Ops request failed";
      const status = message.includes("UNAUTHORIZED") ? 401 : message.includes("PASSWORD_CHANGE_REQUIRED") ? 428 : message.includes("次数过多") ? 429 : 400;
      return json({ error: message }, status);
    }
    return json(data);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
