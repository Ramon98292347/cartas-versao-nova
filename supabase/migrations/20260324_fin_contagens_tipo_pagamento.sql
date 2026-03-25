-- ============================================================
-- Migration: adiciona tipo de coleta e valores por forma de
--            pagamento na tabela fin_contagens_caixa
-- ============================================================
-- Objetivo:
--   Registrar no banco não só o total contado, mas também:
--   - tipo_coleta: 'dizimos', 'ofertas' ou 'ofertas-missionarias'
--   - valor_dinheiro: quanto veio em cédulas/moedas (contagem física)
--   - valor_pix: quanto veio por PIX/OCT
--   - valor_cartao: quanto veio por cartão
--
--   Esses dados são exibidos nos cards "Entradas Salvas" e
--   alimentam automaticamente o Relatório Financeiro Mensal.
-- ============================================================

ALTER TABLE fin_contagens_caixa
  ADD COLUMN IF NOT EXISTS tipo_coleta   TEXT,
  ADD COLUMN IF NOT EXISTS valor_dinheiro DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pix      DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_cartao   DECIMAL(15,2) DEFAULT 0;

-- Comentario: garante que tipo_coleta só aceite os valores conhecidos pelo sistema
ALTER TABLE fin_contagens_caixa
  DROP CONSTRAINT IF EXISTS fin_contagens_caixa_tipo_coleta_check;

ALTER TABLE fin_contagens_caixa
  ADD CONSTRAINT fin_contagens_caixa_tipo_coleta_check
  CHECK (tipo_coleta IS NULL OR tipo_coleta IN ('dizimos', 'ofertas', 'ofertas-missionarias'));
