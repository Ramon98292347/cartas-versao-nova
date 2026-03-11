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

type Body = {
  page?: number;
  page_size?: number;
  church_totvs_id?: string;
  status?: string;
  minister_role?: string;
  search?: string;
  date_start?: string; // YYYY-MM-DD
  date_end?: string;   // YYYY-MM-DD
  quick?: "today" | "7d" | "30d";
};

type ChurchNode = { totvs_id: string; parent_totvs_id: string | null };

async function verifySessionJWT(req: Request): Promise<SessionClaims | null> {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const token = m[1].trim();
  const secret = Deno.env.get("USER_SESSION_JWT_SECRET") || "";
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
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

function computeScope(rootTotvs: string, churches: ChurchNode[]): Set<string> {
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

function startOfDayISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
}
function endOfDayISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59)).toISOString();
}
function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const session = await verifySessionJWT(req);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as Body;

    const page = Math.max(1, Number(body.page || 1));
    const page_size = Math.min(200, Math.max(1, Number(body.page_size || 50)));
    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) escopo base da sessão
    const { data: allChurches, error: allErr } = await sb
      .from("churches")
      .select("totvs_id,parent_totvs_id");

    if (allErr) return json({ ok: false, error: "db_error_scope", details: allErr.message }, 500);

    const scope = computeScope(session.active_totvs_id, (allChurches || []) as ChurchNode[]);
    let scopeList = [...scope];

    // 2) se front pedir uma igreja específica, valida se está dentro do escopo
    const churchFilter = String(body.church_totvs_id || "").trim();
    if (churchFilter) {
      if (!scope.has(churchFilter) && session.role !== "admin") {
        return json({ ok: false, error: "forbidden_church_out_of_scope" }, 403);
      }
      scopeList = [churchFilter];
    }

    // 3) query principal
    function buildQuery(includeOptional = true) {
      const fields = includeOptional
        ? "id, church_totvs_id, preacher_user_id, preacher_name, minister_role, preach_date, preach_period, church_origin, church_destination, status, storage_path, url_pronta, url_carta, signer_user_id, signer_totvs_id, created_at, updated_at"
        : "id, church_totvs_id, preacher_user_id, preacher_name, minister_role, preach_date, preach_period, church_origin, church_destination, status, storage_path, signer_user_id, signer_totvs_id, created_at, updated_at";

      return sb
        .from("letters")
        .select(fields, { count: "exact" })
        .in("church_totvs_id", scopeList)
        .neq("status", "EXCLUIDA");
    }

    let q = buildQuery(true);

    const status = String(body.status || "").trim().toUpperCase();
    if (status && status !== "ALL") q = q.eq("status", status);

    const ministerRole = String(body.minister_role || "").trim();
    if (ministerRole && ministerRole.toLowerCase() !== "all") q = q.ilike("minister_role", ministerRole);

    const search = String(body.search || "").trim();
    if (search) {
      const safe = search.replace(/[%,"']/g, "").trim();
      if (safe) {
        q = q.or(`preacher_name.ilike.%${safe}%,church_origin.ilike.%${safe}%,church_destination.ilike.%${safe}%`);
      }
    }

    const quick = String(body.quick || "").trim().toLowerCase();
    if (quick === "today") {
      const ymd = todayYMD();
      q = q.gte("created_at", startOfDayISO(ymd)).lte("created_at", endOfDayISO(ymd));
    } else if (quick === "7d") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since);
    } else if (quick === "30d") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since);
    }

    const ds = String(body.date_start || "").trim();
    const de = String(body.date_end || "").trim();
    if (ds) q = q.gte("created_at", startOfDayISO(ds));
    if (de) q = q.lte("created_at", endOfDayISO(de));

    // 4) regra obreiro: só vê as próprias
    if (session.role === "obreiro") {
      q = q.eq("preacher_user_id", session.user_id);
    }

    let result = await q.order("created_at", { ascending: false }).range(from, to);
    if (
      result.error &&
      (
        String(result.error.message || "").toLowerCase().includes("url_pronta") ||
        String(result.error.message || "").toLowerCase().includes("url_carta")
      )
    ) {
      q = buildQuery(false);
      const status2 = String(body.status || "").trim().toUpperCase();
      if (status2 && status2 !== "ALL") q = q.eq("status", status2);
      const ministerRole2 = String(body.minister_role || "").trim();
      if (ministerRole2 && ministerRole2.toLowerCase() !== "all") q = q.ilike("minister_role", ministerRole2);
      const search2 = String(body.search || "").trim();
      if (search2) {
        const safe = search2.replace(/[%,"']/g, "").trim();
        if (safe) {
          q = q.or(`preacher_name.ilike.%${safe}%,church_origin.ilike.%${safe}%,church_destination.ilike.%${safe}%`);
        }
      }
      const quick2 = String(body.quick || "").trim().toLowerCase();
      if (quick2 === "today") {
        const ymd = todayYMD();
        q = q.gte("created_at", startOfDayISO(ymd)).lte("created_at", endOfDayISO(ymd));
      } else if (quick2 === "7d") {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("created_at", since);
      } else if (quick2 === "30d") {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("created_at", since);
      }
      const ds2 = String(body.date_start || "").trim();
      const de2 = String(body.date_end || "").trim();
      if (ds2) q = q.gte("created_at", startOfDayISO(ds2));
      if (de2) q = q.lte("created_at", endOfDayISO(de2));
      if (session.role === "obreiro") q = q.eq("preacher_user_id", session.user_id);
      result = await q.order("created_at", { ascending: false }).range(from, to);
    }

    const { data, error, count } = result;

    if (error) return json({ ok: false, error: "db_error_list_letters", details: error.message }, 500);

    return json(
      {
        ok: true,
        letters: data || [],
        total: count || 0,
        page,
        page_size,
        scope_totvs_ids: scopeList,
      },
      200,
    );
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
