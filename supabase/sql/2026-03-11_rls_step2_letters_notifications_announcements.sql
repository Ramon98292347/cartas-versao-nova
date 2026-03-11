-- RLS passo 2: policies de leitura para letters, notifications e announcements
-- Data: 2026-03-11

begin;

-- Garantir RLS ligado
alter table public.letters enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;

-- Limpar policies atuais, se existirem
drop policy if exists letters_same_church on public.letters;
drop policy if exists letters_select_policy on public.letters;

drop policy if exists notifications_user on public.notifications;
drop policy if exists notifications_select_policy on public.notifications;
drop policy if exists notifications_update_policy on public.notifications;

drop policy if exists announcements_church on public.announcements;
drop policy if exists announcements_select_policy on public.announcements;

-- LETTERS (apenas SELECT via RLS)
-- Regras:
-- - admin: tudo
-- - minister_role "membro": apenas cartas do proprio usuario
-- - demais: cartas do escopo/igreja ativa + cartas do proprio usuario
create policy letters_select_policy
on public.letters
for select
to authenticated
using (
  public.jwt_is_admin()
  or (
    public.jwt_current_user_minister_role() = 'membro'
    and preacher_user_id = auth.uid()
  )
  or (
    public.jwt_current_user_minister_role() <> 'membro'
    and (
      church_totvs_id = any(public.jwt_scope_totvs_ids())
      or church_totvs_id = public.jwt_active_totvs_id()
      or preacher_user_id = auth.uid()
    )
  )
);

-- NOTIFICATIONS (SELECT + UPDATE)
-- Regras:
-- - admin: tudo
-- - usuario: notificacoes proprias
-- - notificacoes por igreja (user_id null): escopo/igreja ativa
create policy notifications_select_policy
on public.notifications
for select
to authenticated
using (
  public.jwt_is_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and (
      church_totvs_id = any(public.jwt_scope_totvs_ids())
      or church_totvs_id = public.jwt_active_totvs_id()
    )
  )
);

create policy notifications_update_policy
on public.notifications
for update
to authenticated
using (
  public.jwt_is_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and (
      church_totvs_id = any(public.jwt_scope_totvs_ids())
      or church_totvs_id = public.jwt_active_totvs_id()
    )
  )
)
with check (
  public.jwt_is_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and (
      church_totvs_id = any(public.jwt_scope_totvs_ids())
      or church_totvs_id = public.jwt_active_totvs_id()
    )
  )
);

-- ANNOUNCEMENTS (SELECT)
create policy announcements_select_policy
on public.announcements
for select
to authenticated
using (
  public.jwt_is_admin()
  or church_totvs_id = any(public.jwt_scope_totvs_ids())
  or church_totvs_id = public.jwt_active_totvs_id()
);

commit;
