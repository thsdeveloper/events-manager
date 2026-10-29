-- Produtos do provedor de pagamento por ingresso e preço unitário.
--
-- O checkout hospedado do AbacatePay cobra o preço do produto cadastrado lá,
-- não o total calculado pela API. Guardar um único `provider_product_id` no
-- ingresso reutilizava para sempre o primeiro produto criado: preço editado
-- pelo organizador ou cupom da primeira compra passavam a valer para todas as
-- compras seguintes. A chave passa a ser (ingresso, provedor, preço em
-- centavos), e a coluna antiga fica sem uso.

create table public.ticket_provider_products (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.event_tickets(id) on delete cascade,
  provider text not null check (provider in ('mock', 'abacatepay')),
  unit_price_cents integer not null check (unit_price_cents > 0),
  provider_product_id text not null,
  date_created timestamptz not null default timezone('utc', now()),
  constraint ticket_provider_products_unique unique (ticket_id, provider, unit_price_cents)
);

comment on table public.ticket_provider_products is
  'Cache de produtos criados no provedor de pagamento, um por ingresso, provedor e preço unitário.';

-- Só a API, com service role, lê e grava este cache: nenhuma policy para anon
-- ou authenticated.
alter table public.ticket_provider_products enable row level security;
revoke all on table public.ticket_provider_products from anon, authenticated;
