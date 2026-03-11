-- RLS passo 1: policies de escopo para users e churches
-- Data: 2026-03-11

begin;

-- Helpers para ler claims do JWT (rls_token)
create or replace function public.jwt_claim_text(claim_name text)
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.' || claim_name, true), '');
$$;

create or replace function public.jwt_is_admin()
returns boolean
language sql
stable
as $$
  select lower(public.jwt_claim_text('role')) = 'admin';
$$;

create or replace function public.jwt_active_totvs_id()
returns text
language sql
stable
as $$
  select nullif(public.jwt_claim_text('active_totvs_id'), '');
$$;

create or replace function public.jwt_scope_totvs_ids()
returns text[]
language sql
stable
as $$
  select coalesce(
    (
      select array_agg(value)
      from jsonb_array_elements_text(
        case
          when public.jwt_claim_text('scope_totvs_ids') = '' then '[]'::jsonb
          else public.jwt_claim_text('scope_totvs_ids')::jsonb
        end
      ) as value
    ),
    array[]::text[]
  );
$$;

-- Busca ministerio do usuario logado sem depender de RLS (evita recursao)
create or replace function public.jwt_current_user_minister_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select u.minister_role into v_role
  from public.users u
  where u.id = auth.uid()
  limit 1;

  return coalesce(lower(v_role), '');
end;
$$;

revoke all on function public.jwt_current_user_minister_role() from public;
grant execute on function public.jwt_current_user_minister_role() to authenticated;

-- Garantir RLS ligado
alter table public.users enable row level security;
alter table public.churches enable row level security;

-- Limpar policies antigas principais (sem falhar se nao existirem)
drop policy if exists users_self on public.users;
drop policy if exists users_same_church on public.users;
drop policy if exists users_select_policy on public.users;
drop policy if exists churches_same_church on public.churches;
drop policy if exists churches_select_policy on public.churches;

-- USERS: leitura por escopo + regra membro so ve a si mesmo
create policy users_select_policy
on public.users
for select
to authenticated
using (
  -- admin ve tudo
  public.jwt_is_admin()
  or
  (
    -- se o usuario logado tem cargo ministerial "membro", ele so ve o proprio cadastro
    public.jwt_current_user_minister_role() = 'membro'
    and id = auth.uid()
  )
  or
  (
    -- demais usuarios: proprio cadastro + usuarios do escopo
    public.jwt_current_user_minister_role() <> 'membro'
    and (
      id = auth.uid()
      or default_totvs_id = any(public.jwt_scope_totvs_ids())
      or default_totvs_id = public.jwt_active_totvs_id()
    )
  )
);

-- CHURCHES: leitura por escopo
create policy churches_select_policy
on public.churches
for select
to authenticated
using (
  public.jwt_is_admin()
  or totvs_id = any(public.jwt_scope_totvs_ids())
  or totvs_id = public.jwt_active_totvs_id()
);

commit;
