import { runAuthenticatedSnookerOps } from "./data-ops-auth";

export type SnookerVisitRange = "today" | "yesterday" | "7d" | "30d";

export type SnookerVisitMonitorRow = {
  id: string;
  time: string;
  visitor: string;
  ip: string;
  region: string;
  device: string;
  page: string;
  event: string;
  action: "浏览页面";
};

export type SnookerVisitMonitorData = {
  rows: SnookerVisitMonitorRow[];
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function getSnookerVisitMonitorData(input: {
  range?: SnookerVisitRange;
  query?: string;
  page?: number;
} = {}) {
  return runAuthenticatedSnookerOps<SnookerVisitMonitorData>("visits", {
    range: input.range || "today",
    query: (input.query || "").trim().slice(0, 80),
    page: Math.max(1, Math.floor(input.page || 1)),
  });
}
