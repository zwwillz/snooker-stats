import { cookies } from "next/headers";
import { callSnookerOps } from "./ops-api";
export const SNOOKER_OPS_COOKIE = "snooker_ops_session";

export type SnookerOpsViewer = {
  username: string;
  displayName: string;
  mustChangePassword: boolean;
};

export type SnookerOpsSessionState = SnookerOpsViewer & { authenticated: true } | { authenticated: false };

async function currentToken() {
  return (await cookies()).get(SNOOKER_OPS_COOKIE)?.value || "";
}

async function persistToken(token: string, expiresAt: string) {
  const store = await cookies();
  store.set(SNOOKER_OPS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function getSnookerOpsViewer(): Promise<SnookerOpsViewer | null> {
  const token = await currentToken();
  if (!token) return null;
  try {
    const state = await callSnookerOps<SnookerOpsSessionState>("session", { token });
    if (!state.authenticated) return null;
    return { username: state.username, displayName: state.displayName, mustChangePassword: state.mustChangePassword };
  } catch {
    return null;
  }
}

export async function loginSnookerOps(username: string, password: string, ip?: string | null, userAgent?: string | null) {
  const result = await callSnookerOps<{ ok: true; token: string; expiresAt: string; viewer: SnookerOpsViewer }>("login", {
    username,
    password,
    ip: ip || null,
    userAgent: userAgent || null,
  });
  await persistToken(result.token, result.expiresAt);
  return result.viewer;
}

export async function changeSnookerOpsPassword(newPassword: string) {
  const token = await currentToken();
  if (!token) throw new Error("登录状态已失效，请重新登录。");
  const result = await callSnookerOps<{ ok: true; viewer: SnookerOpsViewer }>("change-password", { token, newPassword });
  return result.viewer;
}

export async function logoutSnookerOps() {
  const store = await cookies();
  const token = store.get(SNOOKER_OPS_COOKIE)?.value || "";
  try {
    if (token) await callSnookerOps("logout", { token });
  } finally {
    store.set(SNOOKER_OPS_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });
  }
}

export async function loadSnookerOpsSnapshot<T>() {
  const token = await currentToken();
  if (!token) throw new Error("UNAUTHORIZED");
  return callSnookerOps<T>("snapshot", { token });
}

export async function runSnookerOpsAction<T>(action: string, payload: Record<string, unknown> = {}) {
  const token = await currentToken();
  if (!token) throw new Error("UNAUTHORIZED");
  return callSnookerOps<T>("action", { token, action, payload });
}

export async function runAuthenticatedSnookerOps<T>(
  operation: string,
  payload: Record<string, unknown> = {},
) {
  const token = await currentToken();
  if (!token) throw new Error("UNAUTHORIZED");
  return callSnookerOps<T>(operation, { token, ...payload });
}
