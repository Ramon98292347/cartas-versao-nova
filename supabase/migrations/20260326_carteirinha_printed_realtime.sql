-- ==========================================================
-- MODULO: Carteirinha - coluna printed_at + Realtime
-- Objetivo:
-- - Adicionar coluna printed_at para saber quais carteirinhas já foram impressas
-- - Habilitar Realtime nas tabelas de documentos (ficha + carteirinha)
--   para evitar polling de 10s no frontend
-- ==========================================================

-- Comentario: coluna para registrar quando a carteirinha foi impressa em lote
ALTER TABLE public.member_carteirinha_documents
  ADD COLUMN IF NOT EXISTS printed_at timestamptz NULL;

-- Comentario: habilitar Realtime nas tabelas de documentos
-- Quando o webhook atualiza o status/final_url, o frontend recebe instantaneamente
ALTER PUBLICATION supabase_realtime ADD TABLE member_ficha_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE member_carteirinha_documents;
