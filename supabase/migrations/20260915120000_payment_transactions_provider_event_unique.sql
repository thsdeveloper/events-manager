-- Idempotência das transações de pagamento.
--
-- A API grava `payment_transactions` com `upsert(..., { onConflict: 'provider_event_id' })`,
-- que o PostgREST traduz para `on conflict (provider_event_id)` sem predicado.
-- O índice único original era parcial (`where provider_event_id is not null`)
-- e o Postgres só o infere quando o `on conflict` repete o predicado, o que o
-- cliente não permite expressar: toda gravação falhava com 42P10 e o checkout
-- em modo mock e os webhooks do AbacatePay respondiam 500.
--
-- Uma constraint única comum atende aos dois lados: valores nulos continuam
-- distintos entre si (mesma semântica do índice parcial) e as funções SQL que
-- escrevem `on conflict (provider_event_id) where provider_event_id is not null`
-- seguem válidas, porque um índice completo também satisfaz o predicado.

drop index if exists public.payment_transactions_provider_event_idx;

alter table public.payment_transactions
  add constraint payment_transactions_provider_event_id_key unique (provider_event_id);
