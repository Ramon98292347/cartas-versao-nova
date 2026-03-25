-- ============================================================
-- Migration: adiciona colunas de detalhe ao fin_fechamentos_mensais
-- ============================================================
-- Objetivo:
--   A tabela já tem total_receitas e total_despesas.
--   Precisamos guardar também o breakdown por tipo de coleta
--   e as informações dos responsáveis do relatório.
-- ============================================================

ALTER TABLE fin_fechamentos_mensais
  -- Comentario: breakdown de dízimos
  ADD COLUMN IF NOT EXISTS dizimos_dinheiro      DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dizimos_pix_cartao    DECIMAL(15,2) DEFAULT 0,

  -- Comentario: breakdown de ofertas
  ADD COLUMN IF NOT EXISTS ofertas_dinheiro      DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ofertas_pix_cartao    DECIMAL(15,2) DEFAULT 0,

  -- Comentario: breakdown de ofertas missionárias
  ADD COLUMN IF NOT EXISTS missionarias_dinheiro  DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missionarias_pix_cartao DECIMAL(15,2) DEFAULT 0,

  -- Comentario: transferência recebida do mês anterior
  ADD COLUMN IF NOT EXISTS transferencia_mes_anterior DECIMAL(15,2) DEFAULT 0,

  -- Comentario: responsáveis que assinam o relatório
  ADD COLUMN IF NOT EXISTS responsavel_anterior  TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_atual     TEXT,

  -- Comentario: data de fechamento do relatório (preenchida pelo usuário)
  ADD COLUMN IF NOT EXISTS data_fechamento       DATE;
