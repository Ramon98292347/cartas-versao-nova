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
type PaymentStatus = "ATIVO" | "BLOQUEADO_PAGAMENTO";
type SessionClaims = { user_id: string; role: Role; active_totvs_id: string };
type Body = {
  user_id?: string;
  payment_status?: PaymentStatus;
  reason?: string | null;
  amount?: number | null;
  due_date?: string | null;
};

const N8N_PAYMENT_WEBHOOK_URL = "https://n8n-n8n.ynlng8.easypanel.host/webhook/pagamento";

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
    if (session.role !== "admin") return json({ ok: false, error: "forbidden_only_admin" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const user_id = String(body.user_id || "").trim();
    const payment_status = String(body.payment_status || "").trim().toUpperCase() as PaymentStatus;
    const reason = String(body.reason || "").trim() || null;
    const amount = typeof body.amount === "number" && Number.isFinite(body.amount) ? body.amount : null;
    const due_date = String(body.due_date || "").trim() || null;

    if (!user_id) return json({ ok: false, error: "missing_user_id" }, 400);
    if (!["ATIVO", "BLOQUEADO_PAGAMENTO"].includes(payment_status)) {
      return json({ ok: false, error: "invalid_payment_status" }, 400);
    }
    if (user_id === session.user_id) return json({ ok: false, error: "cannot_block_self_payment" }, 409);

    const sb = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

    const { data: target, error: targetErr } = await sb
      .from("users")
      .select("id, full_name, cpf, phone, email, role, default_totvs_id")
      .eq("id", user_id)
      .maybeSingle();
    if (targetErr) return json({ ok: false, error: "db_error_target", details: targetErr.message }, 500);
    if (!target) return json({ ok: false, error: "user_not_found" }, 404);

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      payment_status,
      payment_block_reason: payment_status === "BLOQUEADO_PAGAMENTO" ? reason : null,
      payment_updated_by: session.user_id,
      payment_blocked_at: payment_status === "BLOQUEADO_PAGAMENTO" ? nowIso : null,
      payment_unblocked_at: payment_status === "ATIVO" ? nowIso : null,
    };

    const { data: updated, error: updateErr } = await sb
      .from("users")
      .update(updatePayload)
      .eq("id", user_id)
      .select("id, payment_status, payment_block_reason, payment_blocked_at, payment_unblocked_at, updated_at")
      .single();
    if (updateErr) return json({ ok: false, error: "db_error_update", details: updateErr.message }, 500);

    // Comentario: webhook de pagamento não pode quebrar o fluxo principal.
    let n8nOk = false;
    let n8nStatus = 0;
    let n8nResponse: unknown = null;
    try {
      const payload = {
        action: "payment_status_changed",
        event_at: nowIso,
        user: {
          id: target.id,
          full_name: target.full_name,
          cpf: target.cpf,
          phone: target.phone,
          email: target.email,
          role: target.role,
          default_totvs_id: target.default_totvs_id,
        },
        payment: {
          status: payment_status,
          reason,
          amount,
          due_date,
        },
        performed_by: {
          id: session.user_id,
          role: session.role,
        },
      };

      const n8nResp = await fetch(N8N_PAYMENT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      n8nStatus = n8nResp.status;
      const raw = await n8nResp.text();
      try {
        n8nResponse = JSON.parse(raw);
      } catch {
        n8nResponse = { raw };
      }
      n8nOk = n8nResp.ok;
    } catch (err) {
      n8nOk = false;
      n8nResponse = { error: String(err) };
    }

    return json({ ok: true, user: updated, n8n: { ok: n8nOk, status: n8nStatus, response: n8nResponse } }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});

