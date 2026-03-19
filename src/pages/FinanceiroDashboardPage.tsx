// Página principal do módulo financeiro (role: financeiro)
// Esta é a versão inicial — será expandida com gráficos e cadastros
import { ManagementShell } from "@/components/layout/ManagementShell";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function FinanceiroDashboardPage() {
  return (
    <ManagementShell roleMode="financeiro">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Gestão financeira da sua igreja</p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Entradas</p>
                <p className="text-xl font-bold text-slate-900">R$ 0,00</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Saídas</p>
                <p className="text-xl font-bold text-slate-900">R$ 0,00</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Saldo Atual</p>
                <p className="text-xl font-bold text-slate-900">R$ 0,00</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Este Mês</p>
                <p className="text-xl font-bold text-slate-900">R$ 0,00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Aviso de módulo em construção */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
          <DollarSign className="mx-auto mb-3 h-10 w-10 text-blue-400" />
          <h2 className="text-lg font-semibold text-blue-900">Módulo Financeiro</h2>
          <p className="mt-1 text-sm text-blue-700">
            Em breve: cadastro de transações, contagem de caixa, fichas diárias e relatórios mensais.
          </p>
        </div>
      </div>
    </ManagementShell>
  );
}
