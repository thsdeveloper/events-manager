-- Cupons de desconto por evento.
--
-- Cada organizador cria os próprios cupons para os próprios eventos. O desconto
-- é sempre recalculado pela API no momento do checkout: a tabela guarda a
-- regra, nunca um total pronto.

create table public.event_coupons (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now()),

  -- Dois eventos diferentes podem usar a mesma palavra como cupom.
  unique (event_id, code),

  -- Um cupom percentual acima de 100% deixaria o total negativo; a API também
  -- trunca o abatimento, mas a regra vale para qualquer escrita no banco.
  constraint event_coupons_percentage_range
    check (discount_type <> 'percentage' or discount_value <= 100),

  -- Uma janela invertida nunca aceitaria o cupom; recusamos no cadastro.
  constraint event_coupons_window
    check (starts_at is null or expires_at is null or starts_at < expires_at),

  -- O contador não pode ultrapassar o limite que o organizador definiu.
  constraint event_coupons_uses_within_limit
    check (max_uses is null or uses <= max_uses),

  -- O código é digitado pela pessoa no checkout e guardado sempre em caixa alta.
  constraint event_coupons_code_format
    check (code = upper(code) and code ~ '^[A-Z0-9._-]{3,32}$')
);

-- Busca feita a cada tentativa de aplicar um cupom no checkout.
create index event_coupons_event_id_code_idx on public.event_coupons(event_id, code);

alter table public.event_coupons enable row level security;

-- Quem compra nunca lista cupons: a API valida o código com a chave de serviço.
-- O organizador dono do evento (e o admin) gerencia os seus.
create policy manage_coupons on public.event_coupons for all to authenticated
  using (public.owns_event(event_id) or public.is_admin())
  with check (public.owns_event(event_id) or public.is_admin());

grant select, insert, update, delete on public.event_coupons to authenticated;
