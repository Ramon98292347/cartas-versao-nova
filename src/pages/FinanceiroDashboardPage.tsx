/**
 * FinanceiroDashboardPage
 * =======================
 * O que faz: Página principal do módulo financeiro.
 *            Mostra os totais do mês atual e botões de acesso rápido.
 * Quem acessa: Usuários com role "financeiro"
 */
import { ManagementShell } from "@/components/layout/ManagementShell";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calculator, ClipboardList, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/services/financeiroService";
import { useNavigate } from "react-router-dom";

// Comentario: formata um valor string como moeda brasileira (ex: "1234.50" → "R$ 1.234,50")
function formatarMoeda(valor: string | number): string {
  const numero = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(numero)) return "R$ 0,00";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Comentario: nomes dos meses em portugues para exibir no cabeçalho
const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function FinanceiroDashboardPage() {
  const nav = useNavigate();

  // Comentario: busca os dados do dashboard — refaz automaticamente a cada 30s
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["financeiro-dashboard"],
    queryFn: getDashboard,
  });

  // Comentario: monta o label do mes para exibir no subtítulo
  const labelMes = data
    ? `${NOMES_MESES[(data.mes ?? 1) - 1]} de ${data.ano}`
    : "";

  return (
    <ManagementShell roleMode="financeiro">
      <div className="space-y-6">
        {/* Cabeçalho da página */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">
            {isLoading ? "Carregando dados..." : labelMes ? `Resumo de ${labelMes}` : "Gestão financeira da sua igreja"}
          </p>
        </div>

        {/* Comentario: mostra mensagem de erro se a busca falhar */}
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>
              Erro ao carregar dados financeiros:{" "}
              {error instanceof Error ? error.message : "Tente novamente."}
            </span>
          </div>
        )}

        {/* Cards de resumo do mês */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card: Total Entradas */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Total Entradas</p>
                {isLoading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <p className="truncate text-xl font-bold text-green-700">
                    {formatarMoeda(data?.total_receitas ?? "0")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Total Saídas */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Total Saídas</p>
                {isLoading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <p className="truncate text-xl font-bold text-red-700">
                    {formatarMoeda(data?.total_despesas ?? "0")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Saldo Atual */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Saldo Atual</p>
                {isLoading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <p
                    className={`truncate text-xl font-bold ${
                      parseFloat(String(data?.saldo ?? "0")) >= 0
                        ? "text-blue-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatarMoeda(data?.saldo ?? "0")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card: Total de Transações */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Total Transações</p>
                {isLoading ? (
                  <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <p className="text-xl font-bold text-slate-900">
                    {data?.total_transacoes ?? 0}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Acesso rápido */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-700">Acesso Rápido</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Botão: Contagem de Caixa */}
            <button
              onClick={() => nav("/financeiro/contagem")}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-md text-left"
            >
              <div className="rounded-lg bg-blue-100 p-3">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Contagem de Caixa</p>
                <p className="text-sm text-slate-500">Registrar contagem de notas e moedas</p>
              </div>
            </button>

            {/* Botão: Cadastro de Saídas */}
            <button
              onClick={() => nav("/financeiro/saidas")}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:shadow-md text-left"
            >
              <div className="rounded-lg bg-red-100 p-3">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Saídas</p>
                <p className="text-sm text-slate-500">Registrar e gerenciar despesas</p>
              </div>
            </button>

            {/* Botão: Histórico de Contagens */}
            <button
              onClick={() => nav("/financeiro/contagens")}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow-md text-left"
            >
              <div className="rounded-lg bg-slate-100 p-3">
                <ClipboardList className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Histórico</p>
                <p className="text-sm text-slate-500">Ver contagens e transações anteriores</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ManagementShell>
  );
}
