-- Comentario: estrutura inicial para modulo Igrejas > Remanejamento/Contrato/Laudo.
-- Comentario: usa JSONB para facilitar evolucao do formulario sem quebrar o banco.

create table if not exists public.church_remanejamentos (
  id uuid primary key default gen_random_uuid(),
  church_totvs_id text not null references public.churches(totvs_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  hierarchy jsonb not null default '{}'::jsonb,
  status text not null default 'RASCUNHO',
  pdf_storage_path text null,
  created_by_user_id uuid null references public.users(id),
  updated_by_user_id uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_remanejamentos_status_check check (status in ('RASCUNHO', 'FINALIZADO', 'GERANDO', 'GERADO'))
);

create unique index if not exists idx_church_remanejamentos_unique_totvs
  on public.church_remanejamentos(church_totvs_id);

create table if not exists public.church_contratos (
  id uuid primary key default gen_random_uuid(),
  church_totvs_id text not null references public.churches(totvs_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'RASCUNHO',
  pdf_storage_path text null,
  created_by_user_id uuid null references public.users(id),
  updated_by_user_id uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_contratos_status_check check (status in ('RASCUNHO', 'FINALIZADO', 'GERANDO', 'GERADO'))
);

create unique index if not exists idx_church_contratos_unique_totvs
  on public.church_contratos(church_totvs_id);

create table if not exists public.church_laudos (
  id uuid primary key default gen_random_uuid(),
  church_totvs_id text not null references public.churches(totvs_id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id),
  updated_by_user_id uuid null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_church_laudos_unique_totvs
  on public.church_laudos(church_totvs_id);

-- Comentario: trigger de updated_at (usa funcao ja existente no projeto).
drop trigger if exists trg_church_remanejamentos_set_updated_at on public.church_remanejamentos;
create trigger trg_church_remanejamentos_set_updated_at
before update on public.church_remanejamentos
for each row execute function public.set_updated_at();

drop trigger if exists trg_church_contratos_set_updated_at on public.church_contratos;
create trigger trg_church_contratos_set_updated_at
before update on public.church_contratos
for each row execute function public.set_updated_at();

drop trigger if exists trg_church_laudos_set_updated_at on public.church_laudos;
create trigger trg_church_laudos_set_updated_at
before update on public.church_laudos
for each row execute function public.set_updated_at();
