type ErrorContext =
  | "auth"
  | "workers"
  | "churches"
  | "announcements"
  | "letters"
  | "generic";

const CODE_MAP: Record<string, string> = {
  invalid_login: "CPF ou senha invalidos.",
  invalid_credentials: "CPF ou senha invalidos.",
  missing_jwt_secret: "Erro no servidor: JWT_SECRET nao configurado.",
  forbidden_wrong_church: "Voce nao pode alterar obreiros de outra igreja.",
  target_is_not_obreiro: "Acao permitida apenas para obreiros.",
  worker_not_found: "Obreiro nao encontrado.",
  has_active_children: "Nao e possivel desativar: existem igrejas filhas ativas.",
  pastor_no_totvs_access: "Esse pastor nao possui acesso a essa igreja.",
  totvs_out_of_scope: "Voce nao tem permissao para essa igreja.",
  cannot_release_without_pdf: "Nao e possivel liberar carta sem PDF pronto.",
  letter_not_released: "Carta ainda nao liberada.",
  weekly_limit_reached: "Limite semanal de cartas atingido.",
};

const DEFAULT_MAP: Record<ErrorContext, string> = {
  auth: "Falha ao autenticar.",
  workers: "Falha ao processar obreiro.",
  churches: "Falha ao processar igreja.",
  announcements: "Falha ao processar divulgacao.",
  letters: "Falha ao processar carta.",
  generic: "Falha na operacao.",
};

export function getFriendlyError(err: any, context: ErrorContext = "generic") {
  const code = String(err?.code || err?.details?.error || "").toLowerCase();
  const message = String(err?.message || "").toLowerCase();
  const detail = String(err?.details?.detail || err?.details?.message || "");

  if (detail) return detail;
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  if (message && CODE_MAP[message]) return CODE_MAP[message];
  if (message.includes("failed to fetch")) return "Sem conexao com o servidor.";
  return DEFAULT_MAP[context];
}

