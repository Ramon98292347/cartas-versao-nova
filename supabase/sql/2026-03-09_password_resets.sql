create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  request_ip text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_resets_user_id
  on public.password_resets(user_id);

create index if not exists idx_password_resets_token_hash
  on public.password_resets(token_hash);

create index if not exists idx_password_resets_expires_at
  on public.password_resets(expires_at);
