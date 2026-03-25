-- ============================================================
-- Migration: adiciona coluna JSON e campos de responsáveis
--            na tabela fin_contagens_caixa
-- ============================================================
-- Objetivo:
--   1. Adiciona "itens_json" para guardar todas as denominações
--      (notas e moedas) em uma única coluna JSONB, em vez de
--      uma linha separada por denominação na tabela de itens.
--
--   2. Adiciona "responsavel_1", "responsavel_2", "responsavel_3"
--      para registrar os responsáveis/testemunhas da contagem.
--
-- Por que JSON?
--   A tabela fin_contagens_caixa_itens guardava ~13 linhas por
--   contagem (uma por denominação). Com JSONB o armazenamento
--   é mais eficiente e a leitura é feita em uma única consulta.
-- ============================================================

-- Passo 1: adiciona coluna itens_json para armazenar as denominações
ALTER TABLE fin_contagens_caixa
  ADD COLUMN IF NOT EXISTS itens_json JSONB DEFAULT '[]'::jsonb;

-- Passo 2: adiciona campos dos responsáveis pela contagem
ALTER TABLE fin_contagens_caixa
  ADD COLUMN IF NOT EXISTS responsavel_1 TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_2 TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_3 TEXT;

-- Passo 3: índice GIN no campo JSON para buscas futuras (opcional, melhora performance)
CREATE INDEX IF NOT EXISTS idx_fin_contagens_itens_json
  ON fin_contagens_caixa USING GIN (itens_json);
