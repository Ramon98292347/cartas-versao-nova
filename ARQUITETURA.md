# Arquitetura do Sistema (PT-BR)

## Visao geral
- Frontend: React + TypeScript
- Backend: Supabase Edge Functions (JWT custom)
- Banco: PostgreSQL no Supabase
- Arquivos: Supabase Storage (`cartas`, `avatars`, `announcements`)
- Automacao: n8n (geracao de PDF)

## Regra principal
- O frontend **nao grava** direto nas tabelas principais do fluxo de cartas.
- O frontend chama Edge Functions.
- As Edge Functions validam permissao e regra de negocio.

## Fluxo de emissao de carta
1. Pastor/Admin preenche o formulario.
2. Front chama `create-letter`.
3. `create-letter` salva em `public.letters` com:
   - `status = AUTORIZADO`
   - `storage_path = null`
4. `create-letter` chama webhook do n8n.
5. n8n gera PDF e salva em Storage (`cartas/...`).
6. n8n chama `letter-finish` com `letter_id` e `storage_path` (+ `x-n8n-key`).
7. Pastor libera carta.
8. Obreiro baixa via `get-letter-pdf-url` (URL assinada).

## Status de carta
- `AUTORIZADO`
- `BLOQUEADO`
- `AGUARDANDO_LIBERACAO`
- `LIBERADA`
- `ENVIADA`
- `EXCLUIDA`

## Regras de acesso
- Obreiro baixa PDF apenas se `status = LIBERADA`.
- Pastor/Admin pode alterar status via `set-letter-status`.
- Liberacao exige PDF pronto (`storage_path`).

## Endpoints principais
- Sessao: `login`, `select-church`
- Cartas (pastor/admin): `dashboard-stats`, `list-letters`, `create-letter`, `set-letter-status`, `get-letter-pdf-url`
- Obreiro: `worker-dashboard`, `request-release`, `get-letter-pdf-url`, `update-my-profile`
- Liberacao: `list-release-requests`, `approve-release`, `deny-release`
- Membros/Obreiros: `list-members`, `list-workers`, `toggle-worker-active`, `create-user`, `reset-password`
- Igrejas: `list-churches-in-scope`, `create-church`, `delete-church`, `set-church-pastor`
- Login/divulgacao: `list-announcements`, `birthdays-today`

## Boas praticas obrigatorias
- Sempre enviar `Authorization: Bearer <ipda_token>` nas Edge Functions privadas.
- Nao usar tabela/rota antiga `igreja` no frontend.
- Usar dados de sessao (`session.totvs_id`, `session.church_name`, `session.church_class`) para contexto da igreja ativa.
- Upload de Storage no frontend com `supabase-js` + `VITE_SUPABASE_ANON_KEY`.
