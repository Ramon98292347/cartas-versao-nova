-- Comentario: libera obreiro para criar carta com status LIBERADA direto.
alter table public.users
add column if not exists can_create_released_letter boolean not null default false;

comment on column public.users.can_create_released_letter
is 'Quando true, cartas criadas por este obreiro entram como LIBERADA.';
