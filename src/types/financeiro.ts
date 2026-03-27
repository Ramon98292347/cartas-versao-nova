/**
 * financeiro.ts — Tipos do módulo financeiro.
 * Adaptado do financeiro-novo para funcionar dentro do ipda-letter-creator.
 * As funções do FinanceContextType são assíncronas pois chamam o banco via API.
 */

export interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  amount: number;
  description: string;
  date: string;
  userId: string;
}

export interface CashCount {
  id: string;
  date: string;
  notes: {
    [key: string]: number;
  };
  total: number;
  userId: string;
  // Comentario: responsáveis que assinam/testemunham a contagem do caixa
  responsavel_1?: string;
  responsavel_2?: string;
  responsavel_3?: string;
  // Comentario: tipo da coleta e valores por forma de pagamento
  tipo_coleta?: 'dizimos' | 'ofertas' | 'ofertas-missionarias';
  valor_dinheiro?: number;
  valor_pix?: number;
  valor_cartao?: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  userId: string;
}

export interface DailyReport {
  id: string;
  date: string;
  entries: number;
  exits: number;
  balance: number;
  cashCount?: CashCount;
  userId: string;
}

// Comentario: funções assíncronas pois chamam o banco real via edge function fin-api.
export interface FinanceContextType {
  transactions: Transaction[];
  cashCounts: CashCount[];
  categories: ExpenseCategory[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  saveCashCount: (cashCount: Omit<CashCount, 'id' | 'userId'>) => Promise<void>;
  addCategory: (category: Omit<ExpenseCategory, 'id' | 'userId'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<ExpenseCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}
