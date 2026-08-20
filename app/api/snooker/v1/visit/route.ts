import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { callSnookerOps } from "@/lib/snooker/ops-api";
import {
  describeDevice,
  extractRequestIp,
  extractRequestRegion,
  formatVisitorRegion,
  type VisitorGeoPayload,
} from "@/lib/snooker/visitor";

const BLOCKED_PATH_PREFIXES = ["/api", "/snooker/site-monitor", "/snooker/data-ops"];

type VisitBody = {
  visitorId?: string;
  path?: string;
  pageLabel?: string;
  eventLabel?: string;
  referrer?: string;
  geo?: VisitorGeoPayload;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeIp(value: unknown) {
  const candidate = clean(value, 80).replace(/^::ffff:/, "");
  return isIP(candidate) ? candidate : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as VisitBody;
    const visitorId = clean(body.visitorId, 80);
    const path = clean(body.path, 320);
    const pathname = path.split("?")[0] || "/";
    if (!/^[a-zA-Z0-9._-]{8,80}$/.test(visitorId) || !path.startsWith("/")) {
      return new NextResponse(null, { status: 204 });
    }
    if (BLOCKED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 });
    }

    const userAgent = clean(request.headers.get("user-agent"), 500);
    const ip = safeIp(extractRequestIp(request.headers)) || safeIp(body.geo?.clientIp);
    const region = formatVisitorRegion(body.geo) || extractRequestRegion(request.headers) || "未知";

    await callSnookerOps("log-visit", {
      visitorId,
      path,
      pageLabel: clean(body.pageLabel, 140),
      eventLabel: clean(body.eventLabel, 120),
      referrer: clean(body.referrer, 320),
      ip,
      region,
      device: describeDevice(userAgent),
      userAgent,
    });
  } catch (error) {
    console.warn("snooker visit logging skipped", error instanceof Error ? error.message : "unknown error");
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
