/**
 * birthdays-today
 * ===============
 * O que faz: Retorna a lista de membros da igreja ativa que fazem aniversário hoje (fuso de São Paulo).
 *            Persiste notificações de aniversário no banco para evitar duplicatas no mesmo dia.
 *            Se houver aniversariantes novos, dispara webhook n8n para envio de mensagem de parabéns.
 * Para que serve: Exibido no dashboard da igreja para que pastores/obreiros vejam os aniversariantes do dia.
 * Quem pode usar: admin, pastor, obreiro
 * Recebe: { limit?: number } (padrão 10, máximo 30)
 * Retorna: { ok, birthdays, message, n8n }
 * Observações: Usa fuso horário America/Sao_Paulo para calcular o dia atual.
 *              O webhook só é disparado quando há aniversariantes novos inseridos no dia.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.2.4";

const N8N_BIRTHDAYS_WEBHOOK = Deno.env.get("N8N_BIRTHDAYS_WEBHOOK_URL")
  || "https://n8n-n8n.ynlng8.easypanel.host/webhook/senha";

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
type Body = { limit?: number };
type BirthdayRow = {
  id: string;
  full_name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null;
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
    if (!["admin", "pastor", "obreiro", "secretario", "financeiro"].includes(role)) return null;
    return { user_id, role, active_totvs_id };
  } catch {
    return null;
  }
}

function monthDay(dateStr: string): string | null {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[2]}-${m[3]}`;
}

function todayMonthDaySaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const mm = parts.find((p) => p.type === "month")?.value || "01";
  const dd = parts.find((p) => p.type === "day")?.value || "01";
  return `${mm}-${dd}`;
}

function todayDateSaoPaulo(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function persistBirthdayNotifications(
  sb: ReturnType<typeof createClient>,
  churchTotvsId: string,
  birthdays: BirthdayRow[],
) {
  if (!birthdays.length) return 0;

  const today = todayDateSaoPaulo();
  let insertedCount = 0;

  for (const b of birthdays) {
    const relatedId = `birthday:${churchTotvsId}:${b.id}:${today}`;

    const { data: existing } = await sb
      .from("notifications")
      .select("id")
      .eq("related_id", relatedId)
      .limit(1)
      .maybeSingle();

    if (existing?.id) continue;

    const { error: insertErr } = await sb.from("notifications").insert({
      church_totvs_id: churchTotvsId,
      user_id: null,
      type: "birthday",
      title: "Aniversariante do dia",
      message: `Parabens, ${b.full_name}!`,
      is_read: false,
      related_id: relatedId,
      data: {
        birthday_user_id: b.id,
        full_name: b.full_name,
        phone: b.phone || null,
        email: b.email || null,
        birth_date: b.birth_date || null,
        date: today,
      },
    });
    if (!insertErr) insertedCount += 1;
  }
  return insertedCount;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as Body;
    const limit = Number.isFinite(body.limit) ? Math.max(1, Math.min(30, Number(body.limit))) : 10;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { data: users, error } = await sb
      .from("users")
      .select("id, full_name, role, phone, email, avatar_url, birth_date")
      .eq("is_active", true)
      .eq("default_totvs_id", session.active_totvs_id)
      .not("birth_date", "is", null);

    if (error) return json({ ok: false, error: "db_error_birthdays", details: error.message }, 500);

    const todayMD = todayMonthDaySaoPaulo();
    const birthdays = (users || [])
      .filter((u: Record<string, unknown>) => monthDay(String(u.birth_date || "")) === todayMD)
      .slice(0, limit)
      .map((u: Record<string, unknown>) => ({
        id: u.id,
        full_name: u.full_name,
        role: u.role,
        phone: u.phone,
        email: u.email,
        avatar_url: u.avatar_url,
        birth_date: u.birth_date,
      }));

    const insertedBirthdays = await persistBirthdayNotifications(sb, session.active_totvs_id, birthdays as BirthdayRow[]);

    let message = "";
    let n8n: { ok: boolean; status: number; response: unknown } | null = null;

    // Comentario: dispara webhook apenas quando houver aniversario novo inserido no dia.
    if (birthdays.length > 0 && insertedBirthdays > 0) {
      try {
        const resp = await fetch(N8N_BIRTHDAYS_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "aniversario",
            event_type: "aniversario",
            requested_at: new Date().toISOString(),
            church_totvs_id: session.active_totvs_id,
            birthdays,
            date: new Date().toISOString().slice(0, 10),
          }),
        });

        const text = await resp.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }

        n8n = { ok: resp.ok, status: resp.status, response: parsed };
        if (resp.ok && typeof parsed === "object" && parsed && "message" in parsed) {
          message = String((parsed as { message?: string }).message || "");
        }
      } catch (err) {
        n8n = { ok: false, status: 0, response: { error: String(err) } };
      }
    }

    return json({ ok: true, birthdays, message, n8n }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
