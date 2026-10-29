-- Idempotência dos webhooks do provedor.
--
-- O AbacatePay reenvia cada evento com backoff enquanto não recebe 2xx, e a
-- documentação pede para guardar o `id` de cada entrega (`log_…`) e processar
-- uma única vez. A tabela registra os eventos já processados; a API consulta
-- antes de agir e grava depois de concluir, para que uma falha no meio deixe a
-- reentrega fazer o trabalho.

create table public.payment_webhook_events (
  id text primary key,
  event text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

comment on table public.payment_webhook_events is
  'Ids de webhooks do provedor de pagamento já processados pela API.';

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from anon, authenticated;
