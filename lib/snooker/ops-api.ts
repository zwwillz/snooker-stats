import { getSnookerSupabasePublicConfig } from "./supabase-config";

const { url: SUPABASE_URL, publishableKey: SUPABASE_KEY } = getSnookerSupabasePublicConfig();
const OPS_API_URL = `${SUPABASE_URL}/functions/v1/snooker-ops-api`;

type OpsError = { error?: string };

export async function callSnookerOps<T>(
  operation: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(OPS_API_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ operation, ...payload }),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as OpsError;
    throw new Error(error.error || `Snooker Ops API failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
