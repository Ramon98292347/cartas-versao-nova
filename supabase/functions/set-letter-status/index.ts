import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.2.4";

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders() });
}

type Role = "admin" | "pastor" | "obreiro";
type SessionClaims = { user_id: string; role: Role; active_totvs_id: string };
type Body = { letter_id?: string; status?: string };

type ChurchRow = { totvs_id: string; parent_totvs_id: string | null };

async function verifySessionJWT(req: Request): Promise<SessionClaims | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const token = m[1].trim();
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

function computeScope(rootTotvs: string, churches: ChurchRow[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const c of churches) {
    const p = c.parent_totvs_id || "";
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(String(c.totvs_id));
  }

  const scope = new Set<string>();
  const queue: string[] = [rootTotvs];

  while (queue.length) {
    const cur = queue.shift()!;
    if (scope.has(cur)) continue;
    scope.add(cur);
    for (const k of children.get(cur) || []) queue.push(k);
  }

  return scope;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    if (session.role === "obreiro") return json({ ok: false, error: "forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const letter_id = String(body.letter_id || "").trim();
    const status = String(body.status || "").trim().toUpperCase();

    if (!letter_id) return json({ ok: false, error: "missing_letter_id" }, 400);
    if (!["LIBERADA", "BLOQUEADO", "EXCLUIDA", "AUTORIZADO", "AGUARDANDO_LIBERACAO", "ENVIADA"].includes(status)) {
      return json({ ok: false, error: "invalid_status" }, 400);
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: letter, error: lErr } = await sb
      .from("letters")
      .select("id, church_totvs_id, status")
      .eq("id", letter_id)
      .maybeSingle();

    if (lErr) return json({ ok: false, error: "db_error_letter", details: lErr.message }, 500);
    if (!letter) return json({ ok: false, error: "letter_not_found" }, 404);

    // Admin pode tudo. Pastor só no escopo (igreja ativa + filhas).
    if (session.role === "pastor") {
      const { data: allChurches, error: cErr } = await sb
        .from("churches")
        .select("totvs_id,parent_totvs_id");

      if (cErr) return json({ ok: false, error: "db_error_scope", details: cErr.message }, 500);

      const scope = computeScope(session.active_totvs_id, (allChurches || []) as ChurchRow[]);
      if (!scope.has(String(letter.church_totvs_id || ""))) {
        return json({ ok: false, error: "forbidden_wrong_scope" }, 403);
      }
    }

    const { data: updated, error: uErr } = await sb
      .from("letters")
      .update({ status })
      .eq("id", letter_id)
      .select("id,status,updated_at")
      .single();

    if (uErr) return json({ ok: false, error: "db_error_update", details: uErr.message }, 500);

    return json({ ok: true, letter: updated }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
