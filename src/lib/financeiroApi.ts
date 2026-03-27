/**
 * financeiroApi.ts
 * ================
 * Serviço que chama a Edge Function "fin-api" do Supabase.
 * Integrado no ipda-letter-creator — usa ipda_token em vez de fin_token.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — formato dos dados que vêm do banco (edge function fin-api)
// ─────────────────────────────────────────────────────────────────────────────

export type ApiTransacao = {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data_transacao: string;
  categoria_id?: string;
  observacoes?: string;
  church_totvs_id: string;
  created_at: string;
};

export type ApiCategoria = {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  descricao?: string;
};

// Comentario: formato de cada denominação guardada dentro do JSON
export type ApiItemContagem = {
  denominacao: string;
  tipo: 'nota' | 'moeda';
  quantidade: number;
  valor_unitario: number;
};

export type ApiContagemCaixa = {
  id: string;
  data_contagem: string;
  saldo_sistema: number;
  saldo_contado: number;
  diferenca: number;
  observacoes?: string;
  status: string;
  created_at: string;
  // Comentario: denominações em coluna JSON
  itens_json?: ApiItemContagem[];
  responsavel_1?: string;
  responsavel_2?: string;
  responsavel_3?: string;
  // Comentario: tipo da coleta e valores por forma de pagamento
  tipo_coleta?: 'dizimos' | 'ofertas' | 'ofertas-missionarias';
  valor_dinheiro?: number;
  valor_pix?: number;
  valor_cartao?: number;
};

// Comentario: dados de uma igreja retornados pela pesquisa
export type ApiChurch = {
  totvs_id: string;
  church_name: string;
  class: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  cep?: string;
  contact_email?: string;
};

export type ApiDashboard = {
  total_receitas: string;
  total_despesas: string;
  saldo: string;
  total_transacoes: number;
  mes: number;
  ano: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO BASE — chama a edge function com autenticação
// ─────────────────────────────────────────────────────────────────────────────

async function callFinApi<T>(action: string, body?: Record<string, unknown>): Promise<T> {
  // Comentario: usa ipda_token do sistema principal (mesmo JWT do login).
  const token = localStorage.getItem('ipda_token') || '';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/fin-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await res.json();

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.details || `Erro na ação ${action}`);
  }

  return data.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DA API
// ─────────────────────────────────────────────────────────────────────────────

/** Busca os totais do mês atual (receitas, despesas, saldo). */
export async function apiGetDashboard(): Promise<ApiDashboard> {
  return callFinApi<ApiDashboard>('dashboard');
}

/** Lista transações de um mês/ano. Se não passar, usa o mês atual. */
export async function apiListTransacoes(mes?: number, ano?: number): Promise<ApiTransacao[]> {
  return callFinApi<ApiTransacao[]>('list-transacoes', {
    ...(mes !== undefined && { mes }),
    ...(ano !== undefined && { ano }),
  });
}

/** Cria ou atualiza uma transação (se tiver id, faz update). */
export async function apiSaveTransacao(
  data: Omit<ApiTransacao, 'id' | 'church_totvs_id' | 'created_at'> & { id?: string },
): Promise<ApiTransacao> {
  return callFinApi<ApiTransacao>('save-transacao', data as Record<string, unknown>);
}

/** Exclui uma transação pelo ID. */
export async function apiDeleteTransacao(id: string): Promise<void> {
  await callFinApi<void>('delete-transacao', { id });
}

/** Lista as categorias ativas da igreja. */
export async function apiListCategorias(): Promise<ApiCategoria[]> {
  return callFinApi<ApiCategoria[]>('list-categorias');
}

/** Exclui (desativa) uma categoria pelo ID. */
export async function apiDeleteCategoria(id: string): Promise<void> {
  await callFinApi<void>('delete-categoria', { id });
}

/** Cria ou atualiza uma categoria (se tiver id, faz update). */
export async function apiSaveCategoria(
  data: Omit<ApiCategoria, 'id'> & { id?: string },
): Promise<ApiCategoria> {
  return callFinApi<ApiCategoria>('save-categoria', data as Record<string, unknown>);
}

/** Salva uma contagem de caixa com itens JSON, responsáveis e valores por forma de pagamento. */
export async function apiSaveContagem(data: {
  data_contagem: string;
  saldo_sistema: number;
  saldo_contado: number;
  observacoes?: string;
  itens: Array<{
    denominacao: string;
    tipo: 'nota' | 'moeda';
    quantidade: number;
    valor_unitario: number;
  }>;
  responsavel_1?: string;
  responsavel_2?: string;
  responsavel_3?: string;
  tipo_coleta?: string;
  valor_dinheiro?: number;
  valor_pix?: number;
  valor_cartao?: number;
}): Promise<ApiContagemCaixa> {
  return callFinApi<ApiContagemCaixa>('save-contagem', data as Record<string, unknown>);
}

/** Lista as contagens de caixa com seus itens. */
export async function apiListContagens(): Promise<ApiContagemCaixa[]> {
  return callFinApi<ApiContagemCaixa[]>('list-contagens');
}

/** Pesquisa igrejas pelo nome ou código PDA (mínimo 2 caracteres). */
export async function apiSearchChurches(query: string): Promise<ApiChurch[]> {
  return callFinApi<ApiChurch[]>('search-churches', { query });
}

// Comentario: tipo de uma ficha diária retornada pelo banco
export type ApiFichaDiaria = {
  id: string;
  data_ficha: string;
  saldo_inicial: number;
  total_entradas: number;
  total_saidas: number;
  saldo_final: number;
  observacoes?: string;
  status: string;
  created_at: string;
};

/** Salva (ou incrementa) a ficha diária do dia. */
export async function apiSaveFichaDiaria(data: {
  data_ficha: string;
  valor_entrada: number;
}): Promise<ApiFichaDiaria> {
  return callFinApi<ApiFichaDiaria>('save-ficha-diaria', data as Record<string, unknown>);
}

/** Salva todas as fichas do mês de uma vez, com os valores de transferência. */
export async function apiSaveFichasMes(data: {
  mes: number;
  ano: number;
  entradas: Array<{ data_ficha: string; total_entradas: number }>;
  transferencia_recebida: number;
  transferencia_enviada: number;
}): Promise<void> {
  await callFinApi<void>('save-fichas-mes', data as Record<string, unknown>);
}

/** Lista as fichas diárias do mês (padrão: mês atual). */
export async function apiListFichasDiarias(mes?: number, ano?: number): Promise<ApiFichaDiaria[]> {
  return callFinApi<ApiFichaDiaria[]>('list-fichas-diarias', {
    ...(mes !== undefined && { mes }),
    ...(ano !== undefined && { ano }),
  });
}

// Comentario: tipo de um fechamento mensal retornado pela listagem
export type ApiFechamento = {
  id: string;
  ano: number;
  mes: number;
  total_receitas: number;
  total_despesas: number;
  saldo_final_mes: number;
  status: string;
  fechado_em: string;
  responsavel_atual?: string;
};

/** Lista os fechamentos mensais da igreja. */
export async function apiListFechamentos(): Promise<ApiFechamento[]> {
  return callFinApi<ApiFechamento[]>('list-fechamentos');
}

/** Salva (ou atualiza) o fechamento mensal. */
export async function apiSaveFechamento(data: {
  ano: number;
  mes: number;
  total_receitas: number;
  total_despesas: number;
  total_transacoes: number;
  saldo_inicial_mes: number;
  saldo_final_mes: number;
  dizimos_dinheiro: number;
  dizimos_pix_cartao: number;
  ofertas_dinheiro: number;
  ofertas_pix_cartao: number;
  missionarias_dinheiro: number;
  missionarias_pix_cartao: number;
  transferencia_mes_anterior: number;
  responsavel_anterior?: string;
  responsavel_atual?: string;
  data_fechamento?: string;
  observacoes?: string;
}): Promise<{ id: string }> {
  return callFinApi<{ id: string }>('save-fechamento', data as Record<string, unknown>);
}
