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
type Body = {
  document_type?: "ficha_membro" | "carteirinha" | "ficha_obreiro";
  member_id?: string;
  church_totvs_id?: string;
  dados?: Record<string, unknown>;
};

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
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    if (session.role === "obreiro") return json({ ok: false, error: "forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const documentType = String(body.document_type || "").trim();
    const memberId = String(body.member_id || "").trim();
    const churchTotvsId = String(body.church_totvs_id || session.active_totvs_id || "").trim();
    const dados = body.dados || {};

    if (!["ficha_membro", "carteirinha", "ficha_obreiro"].includes(documentType)) {
      return json({ ok: false, error: "invalid_document_type" }, 400);
    }
    if (!memberId) return json({ ok: false, error: "missing_member_id" }, 400);
    if (!churchTotvsId) return json({ ok: false, error: "missing_church_totvs_id" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: member, error: memberErr } = await sb
      .from("users")
      .select("id, default_totvs_id, role, full_name")
      .eq("id", memberId)
      .maybeSingle();

    if (memberErr) return json({ ok: false, error: "db_error_member", details: memberErr.message }, 500);
    if (!member) return json({ ok: false, error: "member_not_found" }, 404);
    if (String(member.default_totvs_id || "") !== churchTotvsId) {
      return json({ ok: false, error: "forbidden_wrong_church" }, 403);
    }

    const webhook =
      Deno.env.get("N8N_MEMBER_DOCS_WEBHOOK_URL") ||
      "https://n8n-n8n.ynlng8.easypanel.host/webhook/ficha-carteirinha";

    const payload = {
      action: "generate_member_docs",
      document_type: documentType,
      member_id: memberId,
      member_name: member.full_name,
      church_totvs_id: churchTotvsId,
      requested_by_user_id: session.user_id,
      requested_by_role: session.role,
      dados,
    };

    const resp = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: unknown = { raw: text };
    try {
      data = JSON.parse(text);
    } catch {
      // resposta textual
    }

    if (!resp.ok) {
      return json(
        { ok: false, error: "webhook_failed", status: resp.status, details: data },
        502,
      );
    }

    return json({ ok: true, message: "Documento enviado para geração.", response: data }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
