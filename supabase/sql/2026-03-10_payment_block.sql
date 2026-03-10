-- Bloqueio por pagamento em users
alter table public.users
  add column if not exists payment_status text not null default 'ATIVO';

alter table public.users
  add column if not exists payment_block_reason text null;

alter table public.users
  add column if not exists payment_blocked_at timestamp with time zone null;

alter table public.users
  add column if not exists payment_unblocked_at timestamp with time zone null;

alter table public.users
  add column if not exists payment_updated_by uuid null references public.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_payment_status_check'
  ) then
    alter table public.users
      add constraint users_payment_status_check
      check (payment_status in ('ATIVO', 'BLOQUEADO_PAGAMENTO'));
  end if;
end $$;

create index if not exists idx_users_payment_status
  on public.users using btree (payment_status);

create index if not exists idx_users_totvs_payment_status
  on public.users using btree (default_totvs_id, payment_status);

