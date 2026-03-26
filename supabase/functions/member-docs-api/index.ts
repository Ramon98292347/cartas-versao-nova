/**
 * member-docs-api
 * ===============
 * O que faz: Agrupa as funcoes de documentos de membro em uma unica entrada por "action".
 * Para que serve: Simplifica a manutencao do fluxo de ficha/carteirinha sem quebrar
 *                 os webhooks e functions legadas ja existentes.
 * Quem pode usar: admin, pastor, obreiro e n8n conforme a action encaminhada.
 * Recebe:
 *   action: "generate" -> generate-member-docs
 *   action: "status" -> get-member-docs-status
 *   action: "finish" -> member-docs-finish
 *   action: "list-ready" -> lista carteirinhas prontas para impressao em lote
 *   action: "mark-printed" -> marca carteirinhas como impressas (atualiza printed_at)
 * Retorna: o mesmo payload da function legada correspondente.
 * Observacoes: verify_jwt deve ficar false no config.toml; a validacao de JWT
 *              ou x-docs-key continua sendo feita nas functions legadas.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-docs-key",
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

const ACTION_TO_SLUG: Record<string, string> = {
  "generate": "generate-member-docs",
  "status": "get-member-docs-status",
  "finish": "member-docs-finish",
};

function buildForwardHeaders(req: Request) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("authorization");
  const apikey = req.headers.get("apikey");
  const clientInfo = req.headers.get("x-client-info");
  const docsKey = req.headers.get("x-docs-key");
  if (auth) headers.authorization = auth;
  if (apikey) headers.apikey = apikey;
  if (clientInfo) headers["x-client-info"] = clientInfo;
  if (docsKey) headers["x-docs-key"] = docsKey;
  return headers;
}

// Comentario: cria cliente Supabase admin para actions que consultam o banco direto
function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(url, key);
}

// Comentario: extrai o user_id do JWT para validar autorizacao
async function getUserFromJwt(req: Request): Promise<{ id: string; role: string } | null> {
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const sb = getAdminClient();
    const { data } = await sb.auth.getUser(token);
    if (!data?.user?.id) return null;
    // Comentario: busca o role do usuario na tabela users
    const { data: row } = await sb.from("users").select("role").eq("id", data.user.id).maybeSingle();
    return { id: data.user.id, role: row?.role || "" };
  } catch {
    return null;
  }
}

/**
 * list-ready: Lista carteirinhas com status PRONTO para uma church_totvs_id.
 * Retorna dados do membro junto para montar a tabela de impressao.
 */
async function handleListReady(body: Record<string, unknown>, req: Request) {
  const user = await getUserFromJwt(req);
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);
  if (!["admin", "pastor", "secretario"].includes(user.role)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const churchTotvsId = String(body.church_totvs_id || "").trim();
  if (!churchTotvsId) return json({ ok: false, error: "church_totvs_id_required" }, 400);

  const sb = getAdminClient();
  // Comentario: busca todas as carteirinhas PRONTO da igreja, com dados do membro via join
  const { data, error } = await sb
    .from("member_carteirinha_documents")
    .select(`
      id,
      member_id,
      status,
      final_url,
      ficha_url_qr,
      printed_at,
      request_payload,
      finished_at,
      users!member_carteirinha_documents_member_fk (
        full_name,
        cpf,
        minister_role,
        avatar_url,
        default_totvs_id
      )
    `)
    .eq("church_totvs_id", churchTotvsId)
    .eq("status", "PRONTO")
    .order("finished_at", { ascending: false });

  if (error) return json({ ok: false, error: error.message }, 500);

  // Comentario: formata resposta com dados do membro achatados
  const items = (data || []).map((row: Record<string, unknown>) => {
    const member = (row.users || {}) as Record<string, unknown>;
    return {
      id: row.id,
      member_id: row.member_id,
      final_url: row.final_url,
      ficha_url_qr: row.ficha_url_qr,
      printed_at: row.printed_at,
      finished_at: row.finished_at,
      request_payload: row.request_payload,
      member_name: member.full_name || "",
      member_cpf: member.cpf || "",
      member_minister_role: member.minister_role || "",
      member_avatar_url: member.avatar_url || "",
    };
  });

  return json({ ok: true, items });
}

/**
 * mark-printed: Atualiza printed_at para as carteirinhas selecionadas.
 * Recebe ids: string[] com os IDs das carteirinhas.
 */
async function handleMarkPrinted(body: Record<string, unknown>, req: Request) {
  const user = await getUserFromJwt(req);
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);
  if (!["admin", "pastor", "secretario"].includes(user.role)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const ids = body.ids as string[] | undefined;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return json({ ok: false, error: "ids_required" }, 400);
  }

  const sb = getAdminClient();
  const { error } = await sb
    .from("member_carteirinha_documents")
    .update({ printed_at: new Date().toISOString() })
    .in("id", ids);

  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, updated: ids.length });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action || "").trim().toLowerCase();

    // Comentario: actions que rodam direto nesta edge function (sem forward)
    if (action === "list-ready") return await handleListReady(body, req);
    if (action === "mark-printed") return await handleMarkPrinted(body, req);

    const slug = ACTION_TO_SLUG[action];
    if (!slug) {
      return json(
        {
          ok: false,
          error: "invalid_action",
          message: 'Use uma action valida: "generate", "status", "finish", "list-ready", "mark-printed".',
        },
        400,
      );
    }

    const forwardBody = { ...body };
    delete forwardBody.action;

    const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
    if (!supabaseUrl) return json({ ok: false, error: "missing_supabase_url" }, 500);

    const resp = await fetch(`${supabaseUrl}/functions/v1/${slug}`, {
      method: "POST",
      headers: buildForwardHeaders(req),
      body: JSON.stringify(forwardBody),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: corsHeaders(),
    });
  } catch (err) {
    return json({ ok: false, error: "exception", details: String(err) }, 500);
  }
});
