const DEFAULT_SUPABASE_URL = "https://rtlvncsmbueatdzqvhbn.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_SR0NVsqpSBGBMP3xg9utvQ_jywPEUNP";

const SUPABASE_URL = process.env.SNOOKER_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SNOOKER_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY;
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
