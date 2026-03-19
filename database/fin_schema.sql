-- =====================================================
-- MÓDULO FINANCEIRO - SCHEMA PARA ipda-letter-creator
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Projeto: idipilrcaqittmnapmbq.supabase.co
--
-- IMPORTANTE: Não altera nenhuma tabela existente.
-- Todas as tabelas usam prefixo "fin_" para não conflitar.
-- =====================================================


-- =====================================================
-- 1. CATEGORIAS FINANCEIRAS
-- (Entradas como dízimo, oferta / Saídas como conta de luz, aluguel)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_categorias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cada categoria pertence a uma igreja (pelo totvs_id)
    church_totvs_id  TEXT NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    descricao   TEXT,
    -- Se é uma entrada (receita) ou saída (despesa)
    tipo        VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    cor         VARCHAR(7) DEFAULT '#6B7280',
    icone       VARCHAR(50) DEFAULT 'folder',
    ativo       BOOLEAN DEFAULT true,
    ordem       INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CONTAS FINANCEIRAS
-- (Caixa da igreja, conta bancária, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_contas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cada conta pertence a uma igreja
    church_totvs_id  TEXT NOT NULL,
    nome             VARCHAR(100) NOT NULL,
    -- Tipo da conta: caixa físico, banco, cartão ou poupança
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('caixa', 'banco', 'cartao', 'poupanca')),
    saldo_inicial    DECIMAL(15,2) DEFAULT 0.00,
    saldo_atual      DECIMAL(15,2) DEFAULT 0.00,
    banco            VARCHAR(100),
    agencia          VARCHAR(20),
    numero_conta     VARCHAR(30),
    ativo            BOOLEAN DEFAULT true,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TRANSAÇÕES FINANCEIRAS
-- (Todas as entradas e saídas da igreja)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_transacoes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Igreja a que pertence esta transação
    church_totvs_id  TEXT NOT NULL,
    descricao        VARCHAR(200) NOT NULL,
    valor            DECIMAL(15,2) NOT NULL,
    -- receita = entrada de dinheiro | despesa = saída | transferencia = entre contas
    tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
    data_transacao   DATE NOT NULL,
    -- Categoria da transação (ex: dízimo, oferta, conta de luz)
    categoria_id     UUID REFERENCES fin_categorias(id),
    -- Conta de onde saiu ou entrou o dinheiro
    conta_origem_id  UUID REFERENCES fin_contas(id),
    -- Conta de destino (somente para transferências entre contas)
    conta_destino_id UUID REFERENCES fin_contas(id),
    -- Usuário que registrou (referencia a tabela users existente)
    user_id          UUID NOT NULL REFERENCES users(id),
    observacoes      TEXT,
    -- URL do comprovante/foto (opcional)
    comprovante_url  VARCHAR(500),
    -- Status da transação
    status           VARCHAR(20) DEFAULT 'confirmada' CHECK (status IN ('pendente', 'confirmada', 'cancelada')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CONTAGEM FÍSICA DE CAIXA
-- (O financeiro conta o dinheiro físico e registra)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_contagens_caixa (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_totvs_id  TEXT NOT NULL,
    data_contagem    DATE NOT NULL,
    -- Quem fez a contagem
    user_id          UUID NOT NULL REFERENCES users(id),
    -- Conta que foi contada (ex: "Caixa principal")
    conta_id         UUID NOT NULL REFERENCES fin_contas(id),
    -- Saldo que o sistema mostrava antes da contagem
    saldo_sistema    DECIMAL(15,2) NOT NULL,
    -- Saldo real contado fisicamente
    saldo_contado    DECIMAL(15,2) NOT NULL,
    -- Diferença calculada automaticamente pelo banco
    diferenca        DECIMAL(15,2) GENERATED ALWAYS AS (saldo_contado - saldo_sistema) STORED,
    observacoes      TEXT,
    status           VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'conferida')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. ITENS DA CONTAGEM DE CAIXA
-- (Detalhe de cada nota/moeda contada)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_contagens_caixa_itens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- A contagem a que este item pertence
    contagem_id   UUID NOT NULL REFERENCES fin_contagens_caixa(id) ON DELETE CASCADE,
    -- Valor da cédula ou moeda (ex: "100", "50", "10", "0.50")
    denominacao   VARCHAR(20) NOT NULL,
    -- Se é uma nota de papel ou moeda
    tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('nota', 'moeda')),
    quantidade    INTEGER NOT NULL DEFAULT 0,
    valor_unitario DECIMAL(10,2) NOT NULL,
    -- Total calculado automaticamente (quantidade x valor)
    valor_total   DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. FICHAS DIÁRIAS
-- (Resumo do dia financeiro da igreja)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_fichas_diarias (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_totvs_id  TEXT NOT NULL,
    data_ficha       DATE NOT NULL,
    -- Quem registrou a ficha do dia
    user_id          UUID NOT NULL REFERENCES users(id),
    saldo_inicial    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_entradas   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_saidas     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    -- Saldo final calculado automaticamente
    saldo_final      DECIMAL(15,2) GENERATED ALWAYS AS (saldo_inicial + total_entradas - total_saidas) STORED,
    observacoes      TEXT,
    status           VARCHAR(20) DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Só pode ter uma ficha por dia por igreja
    UNIQUE(data_ficha, church_totvs_id)
);

-- =====================================================
-- 7. FECHAMENTOS MENSAIS
-- (Fechamento do mês financeiro da igreja)
-- =====================================================
CREATE TABLE IF NOT EXISTS fin_fechamentos_mensais (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    church_totvs_id  TEXT NOT NULL,
    ano              INTEGER NOT NULL,
    mes              INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    total_receitas   DECIMAL(15,2) DEFAULT 0.00,
    total_despesas   DECIMAL(15,2) DEFAULT 0.00,
    -- Saldo líquido calculado automaticamente
    saldo_liquido    DECIMAL(15,2) GENERATED ALWAYS AS (total_receitas - total_despesas) STORED,
    total_transacoes INTEGER DEFAULT 0,
    saldo_inicial_mes DECIMAL(15,2) DEFAULT 0.00,
    saldo_final_mes  DECIMAL(15,2) DEFAULT 0.00,
    observacoes      TEXT,
    -- Quem fechou o mês
    fechado_por      UUID REFERENCES users(id),
    fechado_em       TIMESTAMP WITH TIME ZONE,
    status           VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'auditado')),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Só pode ter um fechamento por mês por igreja
    UNIQUE(ano, mes, church_totvs_id)
);


-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- (Tornam as consultas mais rápidas)
-- =====================================================

-- Categorias
CREATE INDEX IF NOT EXISTS idx_fin_categorias_church   ON fin_categorias(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_categorias_tipo     ON fin_categorias(tipo);
CREATE INDEX IF NOT EXISTS idx_fin_categorias_ativo    ON fin_categorias(ativo);

-- Contas
CREATE INDEX IF NOT EXISTS idx_fin_contas_church       ON fin_contas(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_contas_tipo         ON fin_contas(tipo);
CREATE INDEX IF NOT EXISTS idx_fin_contas_ativo        ON fin_contas(ativo);

-- Transações
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_church   ON fin_transacoes(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_data     ON fin_transacoes(data_transacao);
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_tipo     ON fin_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_categoria ON fin_transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_usuario  ON fin_transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_transacoes_status   ON fin_transacoes(status);

-- Contagens de caixa
CREATE INDEX IF NOT EXISTS idx_fin_contagens_church    ON fin_contagens_caixa(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_contagens_data      ON fin_contagens_caixa(data_contagem);
CREATE INDEX IF NOT EXISTS idx_fin_contagens_usuario   ON fin_contagens_caixa(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_contagens_status    ON fin_contagens_caixa(status);

-- Itens da contagem
CREATE INDEX IF NOT EXISTS idx_fin_contagens_itens     ON fin_contagens_caixa_itens(contagem_id);

-- Fichas diárias
CREATE INDEX IF NOT EXISTS idx_fin_fichas_church       ON fin_fichas_diarias(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_fichas_data         ON fin_fichas_diarias(data_ficha);
CREATE INDEX IF NOT EXISTS idx_fin_fichas_usuario      ON fin_fichas_diarias(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_fichas_status       ON fin_fichas_diarias(status);

-- Fechamentos mensais
CREATE INDEX IF NOT EXISTS idx_fin_fechamentos_church  ON fin_fechamentos_mensais(church_totvs_id);
CREATE INDEX IF NOT EXISTS idx_fin_fechamentos_ano_mes ON fin_fechamentos_mensais(ano, mes);
CREATE INDEX IF NOT EXISTS idx_fin_fechamentos_status  ON fin_fechamentos_mensais(status);


-- =====================================================
-- FUNÇÃO E TRIGGERS PARA updated_at AUTOMÁTICO
-- (Atualiza a data de modificação automaticamente)
-- =====================================================

-- Cria a função (se já não existir)
CREATE OR REPLACE FUNCTION fin_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger em cada tabela que tem updated_at
CREATE TRIGGER fin_trg_categorias_updated_at
    BEFORE UPDATE ON fin_categorias
    FOR EACH ROW EXECUTE FUNCTION fin_update_updated_at();

CREATE TRIGGER fin_trg_contas_updated_at
    BEFORE UPDATE ON fin_contas
    FOR EACH ROW EXECUTE FUNCTION fin_update_updated_at();

CREATE TRIGGER fin_trg_transacoes_updated_at
    BEFORE UPDATE ON fin_transacoes
    FOR EACH ROW EXECUTE FUNCTION fin_update_updated_at();

CREATE TRIGGER fin_trg_contagens_caixa_updated_at
    BEFORE UPDATE ON fin_contagens_caixa
    FOR EACH ROW EXECUTE FUNCTION fin_update_updated_at();

CREATE TRIGGER fin_trg_fichas_diarias_updated_at
    BEFORE UPDATE ON fin_fichas_diarias
    FOR EACH ROW EXECUTE FUNCTION fin_update_updated_at();


-- =====================================================
-- CATEGORIAS PADRÃO
-- (Exemplos para começar - o financeiro pode adicionar mais)
-- =====================================================
-- ATENÇÃO: Substitua 'SEU_TOTVS_ID_AQUI' pelo totvs_id real da sua igreja
-- Exemplo: se sua igreja tem totvs_id = '10001', use '10001'
--
-- INSERT INTO fin_categorias (church_totvs_id, nome, tipo, cor, icone, ordem) VALUES
--   ('SEU_TOTVS_ID_AQUI', 'Dízimo',        'receita', '#22c55e', 'heart',      1),
--   ('SEU_TOTVS_ID_AQUI', 'Oferta',         'receita', '#3b82f6', 'gift',       2),
--   ('SEU_TOTVS_ID_AQUI', 'Campanha',       'receita', '#8b5cf6', 'target',     3),
--   ('SEU_TOTVS_ID_AQUI', 'Aluguel',        'despesa', '#ef4444', 'home',       1),
--   ('SEU_TOTVS_ID_AQUI', 'Energia Elétrica','despesa','#f97316', 'zap',        2),
--   ('SEU_TOTVS_ID_AQUI', 'Água',           'despesa', '#06b6d4', 'droplets',   3),
--   ('SEU_TOTVS_ID_AQUI', 'Material',       'despesa', '#84cc16', 'package',    4),
--   ('SEU_TOTVS_ID_AQUI', 'Outros',         'despesa', '#6b7280', 'more-horizontal', 5);
