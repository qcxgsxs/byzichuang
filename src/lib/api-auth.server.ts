// Shared helpers for the public 葛掉元 API (server only).
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function authApi(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!key || !key.startsWith("qcxg_") || key.length > 100) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id")
    .eq("key_hash", await sha256(key))
    .eq("revoked", false)
    .maybeSingle();
  if (!data) return null;
  const { data: s } = await supabaseAdmin.from("settings").select("cny_rate").eq("id", 1).maybeSingle();
  return { keyId: data.id, rate: Number(s?.cny_rate ?? 1), admin: supabaseAdmin };
}
