import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.2.4";

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders() });
}

type Role = "admin" | "pastor" | "obreiro";
type SessionClaims = { user_id: string; role: Role; active_totvs_id: string };
type Body = { worker_id?: string; can_create_released_letter?: boolean };

async function verifySessionJWT(req: Request): Promise<SessionClaims | null> {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  const secret = Deno.env.get("USER_SESSION_JWT_SECRET") || "";
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const user_id = String(payload.sub || "");
    const role = String(payload.role || "").toLowerCase() as Role;
    const active_totvs_id = String(payload.active_totvs_id || "");
    if (!user_id || !active_totvs_id) return null;
    if (!["admin", "pastor", "obreiro"].includes(role)) return null;
    return { user_id, role, active_totvs_id };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    if (session.role === "obreiro") return json({ ok: false, error: "forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const worker_id = String(body.worker_id || "").trim();
    if (!worker_id) return json({ ok: false, error: "missing_worker_id" }, 400);
    if (typeof body.can_create_released_letter !== "boolean") {
      return json({ ok: false, error: "missing_can_create_released_letter" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: target, error: targetErr } = await sb
      .from("users")
      .select("id, role, default_totvs_id")
      .eq("id", worker_id)
      .maybeSingle();

    if (targetErr) return json({ ok: false, error: "db_error_target", details: targetErr.message }, 500);
    if (!target) return json({ ok: false, error: "worker_not_found" }, 404);
    if (String(target.role || "").toLowerCase() !== "obreiro") {
      return json({ ok: false, error: "target_is_not_obreiro" }, 400);
    }
    if (String(target.default_totvs_id || "") !== String(session.active_totvs_id)) {
      return json({ ok: false, error: "forbidden_wrong_church" }, 403);
    }

    const { data: updated, error: updateErr } = await sb
      .from("users")
      .update({ can_create_released_letter: body.can_create_released_letter })
      .eq("id", worker_id)
      .select("id, can_create_released_letter, updated_at")
      .single();

    if (updateErr) return json({ ok: false, error: "db_error_update", details: updateErr.message }, 500);
    return json({ ok: true, worker: updated }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
