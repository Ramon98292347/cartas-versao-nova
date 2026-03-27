/**
 * FinanceContext.tsx
 * ==================
 * Contexto financeiro conectado ao banco real via Edge Function "fin-api".
 * Adaptado do financeiro-novo — usa useUser() do ipda-letter-creator
 * em vez do AuthContext standalone.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Transaction, CashCount, ExpenseCategory, FinanceContextType } from '@/types/financeiro';
import { useUser } from '@/context/UserContext';
import {
  apiListTransacoes,
  apiSaveTransacao,
  apiDeleteTransacao,
  apiListCategorias,
  apiSaveCategoria,
  apiListContagens,
  apiSaveContagem,
  type ApiTransacao,
  type ApiCategoria,
  type ApiContagemCaixa,
} from '@/lib/financeiroApi';

// ─────────────────────────────────────────────────────────────────────────────
// Funções auxiliares de mapeamento entre tipos da API e tipos locais
// ─────────────────────────────────────────────────────────────────────────────

/** Converte uma transação da API para o formato local que as páginas usam. */
function mapTransacao(t: ApiTransacao, categorias: ApiCategoria[]): Transaction {
  const cat = categorias.find((c) => c.id === t.categoria_id);
  return {
    id: t.id,
    // Comentario: API usa "receita"/"despesa", as páginas usam "entrada"/"saida".
    type: t.tipo === 'receita' ? 'entrada' : 'saida',
    category: cat?.nome || t.categoria_id || '',
    amount: t.valor,
    description: t.descricao,
    date: t.data_transacao,
    userId: t.church_totvs_id,
  };
}

/** Converte uma contagem da API para o formato local. */
function mapContagem(c: ApiContagemCaixa): CashCount {
  const notes: Record<string, number> = {};
  for (const item of c.itens_json || []) {
    notes[item.denominacao] = item.quantidade;
  }
  return {
    id: c.id,
    date: c.data_contagem,
    notes,
    total: c.saldo_contado,
    userId: '',
    responsavel_1: c.responsavel_1,
    responsavel_2: c.responsavel_2,
    responsavel_3: c.responsavel_3,
    tipo_coleta: c.tipo_coleta as CashCount['tipo_coleta'],
    valor_dinheiro: c.valor_dinheiro ?? 0,
    valor_pix: c.valor_pix ?? 0,
    valor_cartao: c.valor_cartao ?? 0,
  };
}

/** Converte uma categoria da API para o formato local. */
function mapCategoria(c: ApiCategoria): ExpenseCategory {
  return {
    id: c.id,
    name: c.nome,
    description: c.descricao,
    color: c.cor,
    userId: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexto
// ─────────────────────────────────────────────────────────────────────────────

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  return context;
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Comentario: usa useUser() do sistema principal em vez do useAuth() do financeiro standalone.
  const { usuario } = useUser();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [apiCategorias, setApiCategorias] = useState<ApiCategoria[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // Carregamento inicial dos dados ao fazer login
  // ─────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!usuario) return;
    try {
      const [cats, transacoes, contagens] = await Promise.all([
        apiListCategorias(),
        apiListTransacoes(),
        apiListContagens(),
      ]);

      setApiCategorias(cats);
      setCategories(cats.map(mapCategoria));
      setTransactions(transacoes.map((t) => mapTransacao(t, cats)));
      setCashCounts(contagens.map(mapContagem));
    } catch (err) {
      console.error('[FinanceContext] Erro ao carregar dados:', err);
    }
  }, [usuario]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────────────────
  // Transações
  // ─────────────────────────────────────────────────────────────────────────

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    const cat = apiCategorias.find(
      (c) => c.nome === transaction.category || c.id === transaction.category,
    );
    const saved = await apiSaveTransacao({
      descricao: transaction.description,
      valor: transaction.amount,
      tipo: transaction.type === 'entrada' ? 'receita' : 'despesa',
      data_transacao: transaction.date,
      categoria_id: cat?.id,
    });
    setTransactions((prev) => [...prev, mapTransacao(saved, apiCategorias)]);
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return;
    const merged = { ...existing, ...transaction };
    const cat = apiCategorias.find(
      (c) => c.nome === merged.category || c.id === merged.category,
    );
    const saved = await apiSaveTransacao({
      id,
      descricao: merged.description,
      valor: merged.amount,
      tipo: merged.type === 'entrada' ? 'receita' : 'despesa',
      data_transacao: merged.date,
      categoria_id: cat?.id,
    });
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? mapTransacao(saved, apiCategorias) : t)),
    );
  };

  const deleteTransaction = async (id: string) => {
    await apiDeleteTransacao(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Contagens de caixa
  // ─────────────────────────────────────────────────────────────────────────

  const saveCashCount = async (cashCount: Omit<CashCount, 'id' | 'userId'>) => {
    const itens = Object.entries(cashCount.notes)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const parts = key.split('_');
        const tipo = parts[0] as 'nota' | 'moeda';
        const valorStr = parts.slice(1).join('.').replace('_', '.');
        const valor_unitario = parseFloat(valorStr) || 0;
        return { denominacao: key, tipo, quantidade: qty, valor_unitario };
      });

    const saved = await apiSaveContagem({
      data_contagem: cashCount.date,
      saldo_sistema: cashCount.total,
      saldo_contado: cashCount.total,
      itens,
      responsavel_1: cashCount.responsavel_1,
      responsavel_2: cashCount.responsavel_2,
      responsavel_3: cashCount.responsavel_3,
      tipo_coleta: cashCount.tipo_coleta,
      valor_dinheiro: cashCount.valor_dinheiro,
      valor_pix: cashCount.valor_pix,
      valor_cartao: cashCount.valor_cartao,
    });
    setCashCounts((prev) => [...prev, mapContagem(saved)]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Categorias
  // ─────────────────────────────────────────────────────────────────────────

  const addCategory = async (category: Omit<ExpenseCategory, 'id' | 'userId'>) => {
    const saved = await apiSaveCategoria({
      nome: category.name,
      cor: category.color,
      tipo: 'despesa',
      descricao: category.description,
    });
    setApiCategorias((prev) => [...prev, saved]);
    setCategories((prev) => [...prev, mapCategoria(saved)]);
  };

  const updateCategory = async (id: string, category: Partial<ExpenseCategory>) => {
    const existing = apiCategorias.find((c) => c.id === id);
    if (!existing) return;
    const saved = await apiSaveCategoria({
      id,
      nome: category.name ?? existing.nome,
      cor: category.color ?? existing.cor,
      tipo: existing.tipo,
      descricao: category.description ?? existing.descricao,
    });
    setApiCategorias((prev) => prev.map((c) => (c.id === id ? saved : c)));
    setCategories((prev) => prev.map((c) => (c.id === id ? mapCategoria(saved) : c)));
  };

  const deleteCategory = async (id: string) => {
    setApiCategorias((prev) => prev.filter((c) => c.id !== id));
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        cashCounts,
        categories,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        saveCashCount,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
