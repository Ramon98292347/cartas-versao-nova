/**
 * reset-password
 * ==============
 * O que faz: Permite que pastor ou admin redefinam a senha de um membro do seu escopo.
 * Quem pode usar: admin, pastor, secretario (nunca obreiro)
 * Recebe: { user_id?: string, cpf?: string, new_password: string }
 * Retorna: { ok, message }
 * Observacoes: Usa a mesma logica de escopo e hierarquia do set-user-registration-status.
 *              A senha precisa ter pelo menos 6 caracteres.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://esm.sh/jose@5.2.4";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

type Role = "admin" | "pastor" | "obreiro" | "secretario" | "financeiro";
type ChurchClass = "estadual" | "setorial" | "central" | "regional" | "local";

type SessionClaims = { user_id: string; role: Role; active_totvs_id: string };
type ChurchRow = { totvs_id: string; parent_totvs_id: string | null; class: string | null };

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

// Comentario: normaliza o campo class da igreja para um dos valores validos
function normalizeChurchClass(value: string | null | undefined): ChurchClass | null {
  const safe = String(value || "").trim().toLowerCase();
  if (safe === "estadual" || safe === "setorial" || safe === "central" || safe === "regional" || safe === "local") return safe;
  return null;
}

// Comentario: calcula o escopo (todas as igrejas filhas) a partir de um totvs raiz
function computeScope(rootTotvs: string, churches: ChurchRow[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const c of churches) {
    const parent = String(c.parent_totvs_id || "");
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(String(c.totvs_id));
  }

  const scope = new Set<string>();
  const queue = [rootTotvs];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (scope.has(current)) continue;
    scope.add(current);
    for (const child of children.get(current) || []) queue.push(child);
  }
  return scope;
}

// Comentario: verifica se o usuario logado pode gerenciar o membro alvo (hierarquia)
function canManageMember(
  sessionRole: Role,
  sessionActiveTotvs: string,
  memberDefaultTotvs: string,
  sessionChurchClass: ChurchClass | null,
  memberChurchClass: ChurchClass | null,
  scope: Set<string>,
): boolean {
  if (sessionRole === "admin") return true;
  if (!scope.has(memberDefaultTotvs)) return false;
  if (memberDefaultTotvs === sessionActiveTotvs) return true;
  if (!sessionChurchClass || !memberChurchClass) return false;

  const rank: Record<ChurchClass, number> = {
    estadual: 5,
    setorial: 4,
    central: 3,
    regional: 2,
    local: 1,
  };

  return rank[memberChurchClass] <= rank[sessionChurchClass];
}

// Comentario: valida o JWT de sessao do usuario logado
async function verifySessionJWT(req: Request): Promise<SessionClaims | null> {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  const secret = Deno.env.get("USER_SESSION_JWT_SECRET") || "";
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    // Comentario: somente pastor, admin ou secretario podem resetar senhas
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    if (session.role === "obreiro" || session.role === "financeiro") {
      return json({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({})) as {
      user_id?: string;
      cpf?: string;
      new_password?: string;
    };

    const userId = String(body.user_id || "").trim();
    const cpf = String(body.cpf || "").replace(/\D/g, "").trim();
    const newPassword = String(body.new_password || "");

    if (!userId && !cpf) return json({ ok: false, error: "missing_user_id" }, 400);
    if (newPassword.length < 6) {
      return json({ ok: false, error: "weak_password" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    // Comentario: busca o usuario alvo por id ou por cpf
    let targetQuery = sb.from("users").select("id, role, default_totvs_id").limit(1);
    if (userId) {
      targetQuery = targetQuery.eq("id", userId);
    } else {
      targetQuery = targetQuery.eq("cpf", cpf);
    }
    const { data: targets, error: targetError } = await targetQuery;

    if (targetError) return json({ ok: false, error: "db_error_target", details: targetError.message }, 500);
    if (!targets || targets.length === 0) return json({ ok: false, error: "user_not_found" }, 404);

    const target = targets[0] as { id: string; role: string; default_totvs_id: string | null };

    // Comentario: busca todas as igrejas para calcular escopo e hierarquia
    const { data: churches, error: churchesErr } = await sb
      .from("churches")
      .select("totvs_id,parent_totvs_id,class");

    if (churchesErr) return json({ ok: false, error: "db_error_churches", details: churchesErr.message }, 500);

    const rows = (churches || []) as ChurchRow[];
    const scope = computeScope(session.active_totvs_id, rows);
    const sessionClass = normalizeChurchClass(rows.find((c) => c.totvs_id === session.active_totvs_id)?.class);
    const targetTotvs = String(target.default_totvs_id || "").trim();
    const targetClass = normalizeChurchClass(rows.find((c) => c.totvs_id === targetTotvs)?.class);

    const canManage = canManageMember(
      session.role,
      session.active_totvs_id,
      targetTotvs,
      sessionClass,
      targetClass,
      scope,
    );

    if (!canManage) return json({ ok: false, error: "forbidden" }, 403);

    // Comentario: gera o hash bcrypt e atualiza a senha
    const password_hash = bcrypt.hashSync(newPassword, 10);

    const { error: updateError } = await sb
      .from("users")
      .update({ password_hash })
      .eq("id", target.id);

    if (updateError) return json({ ok: false, error: "db_error_update_password", details: updateError.message }, 500);

    return json({ ok: true, message: "Senha redefinida com sucesso." }, 200);
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
