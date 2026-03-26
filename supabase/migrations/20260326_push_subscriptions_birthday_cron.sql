-- ==========================================================
-- MODULO: Push Notifications + Birthday Cron
-- Objetivo:
-- 1. Criar tabela push_subscriptions para armazenar assinaturas push
-- 2. Agendar cron de aniversário via pg_cron (todo dia 06:00 São Paulo)
-- 3. Habilitar Realtime na tabela notifications
-- ==========================================================

-- ── 1. Tabela push_subscriptions ────────────────────────────────────────────
-- Comentario: armazena as assinaturas web push de cada usuario/dispositivo
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  totvs_id text NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- Comentario: indices para buscar por usuario ou por igreja
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_totvs ON public.push_subscriptions(totvs_id);

-- ── 2. Indices na tabela notifications (se existir) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_church_created
  ON public.notifications(church_totvs_id, created_at DESC);

-- ── 3. Habilitar Realtime na tabela notifications ──────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── 4. Cron de aniversário: roda todo dia às 06:00 horário de Brasília ─────
-- Comentario: pg_cron usa UTC, 06:00 em São Paulo (UTC-3) = 09:00 UTC
-- Chama notifications-api com action "birthday" (agrupada na mesma function)
SELECT cron.schedule(
  'birthday-notify-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/notifications-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-cron-secret', current_setting('app.settings.cron_secret')
    ),
    body := '{"action":"birthday"}'::jsonb
  );
  $$
);
