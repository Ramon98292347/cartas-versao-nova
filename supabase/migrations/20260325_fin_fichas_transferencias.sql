-- Adiciona colunas de transferência na tabela fin_fichas_diarias
-- transferencia_recebida: valor recebido do mês anterior (fica na primeira ficha do mês)
-- transferencia_enviada:  valor enviado para o próximo mês  (fica na última ficha do mês)

ALTER TABLE public.fin_fichas_diarias
  ADD COLUMN IF NOT EXISTS transferencia_recebida NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS transferencia_enviada  NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
