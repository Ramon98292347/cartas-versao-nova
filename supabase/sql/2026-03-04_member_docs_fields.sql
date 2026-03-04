-- Comentario: campos adicionais para ficha de membro e carteirinha.
alter table public.users
add column if not exists rg text null,
add column if not exists marital_status text null,
add column if not exists baptism_date date null,
add column if not exists matricula text null;

comment on column public.users.rg is 'Registro geral do membro.';
comment on column public.users.marital_status is 'Estado civil do membro.';
comment on column public.users.baptism_date is 'Data de batismo do membro.';
comment on column public.users.matricula is 'Matrícula interna usada na carteirinha.';
