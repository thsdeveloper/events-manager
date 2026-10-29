-- Comprovante do pagamento.
--
-- O provedor devolve um `receiptUrl` quando o checkout hospedado é pago (no
-- webhook `checkout.completed` e em `GET /checkouts/get`). Guardado na
-- inscrição, o comprovante fica ao alcance da pessoa na confirmação da compra e
-- em "Meus ingressos".

alter table public.event_registrations
  add column if not exists receipt_url text;

comment on column public.event_registrations.receipt_url is
  'URL do comprovante emitido pelo provedor de pagamento após a confirmação.';
