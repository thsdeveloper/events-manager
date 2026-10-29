# Pagamentos, repasses e administração global

## Arquitetura adotada

O frontend Next.js nunca acessa o gateway nem o banco diretamente para operações de negócio. O fluxo é:

```text
Next.js → API Fastify → porta PaymentGateway → adapter mock ou AbacatePay
                           ↓
                     Supabase/Postgres
```

O adapter fica em `apps/api/src/infrastructure/payments`, enquanto cálculo de taxas e contratos do gateway ficam na
camada de aplicação. Isso permite testar o produto localmente com `PAYMENTS_MODE=mock` sem condicionais espalhadas nas
rotas e sem chamadas externas.

## Modelo financeiro

A documentação pública da API v2 descreve uma loja autenticada por chave, checkouts, PIX, saques da própria loja e
transferências PIX para terceiros. Ela não documenta subcontas de marketplace ou split por organizador. Por isso, a
plataforma mantém um ledger por organizador e o super admin autoriza repasses PIX para as chaves validadas.

- O participante paga no checkout hospedado do AbacatePay.
- O webhook registra valor bruto, tarifa efetiva do gateway, taxa da plataforma e líquido do organizador.
- O organizador enxerga somente eventos, transações, saldo e repasses vinculados a ele.
- O super admin enxerga a conciliação global e cria os repasses.
- Toda alteração sensível de status, taxas ou repasse gera registro de auditoria.

Referências: [índice para LLMs](https://www.abacatepay.com/llms.txt),
[checkout](https://docs.abacatepay.com/pages/payment/create), [webhooks](https://docs.abacatepay.com/pages/webhooks),
[transferências PIX](https://docs.abacatepay.com/pages/pix/create) e [preços](https://www.abacatepay.com/pricing).

## Ambiente local

O `.env` local deve permanecer em simulação:

```dotenv
PAYMENTS_MODE=mock
ABACATEPAY_API_KEY=
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
ABACATEPAY_WEBHOOK_SECRET=
ABACATEPAY_METHODS=PIX
```

Depois execute:

```bash
pnpm supabase:start
pnpm exec supabase migration up
pnpm db:types
pnpm dev:apps
```

No modo mock, checkouts e transferências são confirmados localmente e nenhum dado sai do computador. O modo mock
representa uma loja com tudo habilitado: oferece e aceita Pix e cartão, independentemente de `ABACATEPAY_METHODS`.

## Como a integração usa a API v2

Verificado contra a documentação e a conta de desenvolvimento em 2026-09-15.

- **Métodos do checkout hospedado.** O provedor recusa o checkout inteiro quando um método não está habilitado na loja
  (`CARD is not available for this store`) e não expõe quais estão. A lista vem de `ABACATEPAY_METHODS`, com `PIX` como
  padrão; inclua `CARD` só depois de habilitar cartão na conta. `GET /api/payments/methods` publica a lista para o
  front, que oferece Pix e cartão na última etapa e deixa o cartão desabilitado quando a loja não o aceita. O checkout
  recebe `paymentMethod` (`PIX` ou `CARD`) e envia só o método escolhido; um método fora da lista responde 422
  `PAYMENT_METHOD_UNAVAILABLE` antes de criar qualquer inscrição. No cartão, `card.maxInstallments` vai com o maior
  `max_installments` dos ingressos do carrinho e a página do provedor parcela; no Pix, o parcelamento é o plano próprio
  da plataforma (`/api/checkout/installments`).
- **Produtos por preço.** O checkout hospedado cobra o preço do produto cadastrado no AbacatePay, não o total calculado
  pela API. A tabela `ticket_provider_products` guarda um produto por ingresso, provedor e preço unitário em centavos;
  preço editado ou cupom aplicado criam um produto novo. O `externalId` leva um sufixo aleatório porque o provedor
  rejeita repetição.
- **Cliente pré-preenchido.** Antes do checkout a API cadastra o comprador em `/customers/create` (deduplicado por CPF)
  e envia `customerId`; se o cadastro falhar, a venda segue e a página pede os dados.
- **Valor pago.** No `checkout.completed`, `paidAmount` precisa cobrir o total das inscrições (tolerância de um centavo
  por unidade, pelo arredondamento do preço unitário). Se não cobrir, nada é confirmado: fica uma transação `pending`
  com o payload para revisão.
- **Confirmação sem webhook.** `GET /api/payments/checkout/status` consulta o provedor (`/checkouts/get`) para cada
  inscrição pendente de um checkout hospedado e liquida na hora se estiver `PAID` (ou libera o estoque se `EXPIRED`,
  `CANCELLED` ou `REFUNDED`). É o que o botão "Atualizar status" da confirmação usa; assim a compra é confirmada mesmo
  sem webhook público, sem esperar a reconciliação periódica. Falha na consulta devolve o estado guardado.
- **Comprovante.** O `receiptUrl` do provedor é gravado em `event_registrations.receipt_url` no `checkout.completed`, na
  reconciliação e na consulta de status, e aparece na confirmação da compra e nos detalhes do ingresso em "Meus
  ingressos".
- **Idempotência.** O `id` de cada webhook (`log_…`) é gravado em `payment_webhook_events` depois de processado;
  reentregas respondem `200` sem reprocessar.
- **PIX transparente (parcelas).** `customer` só é enviado quando há CPF válido, porque o provedor exige `name` e
  `taxId` juntos. Estados extras de `/transparents/check` (`REFUNDED`, `FAILED`) encerram a cobrança; `UNDER_DISPUTE`,
  `APPROVED` e `REDEEMED` aguardam o webhook.
- **Reembolso.** O cancelamento pelo organizador aceita `refund: true`: a API pede o estorno integral em
  `/checkouts/refund` (checkout hospedado) ou `/transparents/refund` (cada parcela paga) antes de cancelar, registra
  `refund.requested` e deixa a confirmação para o webhook `*.refunded`. No modo mock o estorno é liquidado na hora.
- **Erros do provedor.** A mensagem do AbacatePay vai no `detail` do problema 502 `PAYMENT_PROVIDER_ERROR`.

## Ambiente de desenvolvimento AbacatePay

1. Obtenha uma chave de desenvolvimento no dashboard (a conta nasce em Dev mode; pagamentos são simulados).
2. Altere `PAYMENTS_MODE=abacatepay` e preencha `ABACATEPAY_API_KEY`.
3. Gere um segredo forte e preencha `ABACATEPAY_WEBHOOK_SECRET`.
4. Publique a API em HTTPS; webhooks não aceitam localhost ou IP privado. Para receber webhooks na máquina local, use o
   CLI oficial:
   `abacatepay listen --forward-to http://localhost:3333/api/payments/webhooks/abacatepay?webhookSecret=SEU_SEGREDO`.
5. Cadastre o endpoint:

```text
POST https://api.seudominio.dev/api/payments/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
```

Assine os eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed`, `checkout.lost`,
`transparent.completed`, `transparent.refunded`, `transparent.disputed`, `transparent.lost`, `payout.completed`,
`payout.failed`, `transfer.completed` e `transfer.failed`.

O endpoint valida o segredo da URL e `X-Webhook-Signature` com HMAC-SHA256 sobre o corpo bruto, processa cada evento de
forma idempotente e só então responde `200`.

No sandbox, uma cobrança PIX transparente se paga com `POST /transparents/simulate-payment?id=…`; o checkout hospedado
se paga com o cartão de teste `4242 4242 4242 4242`, o que exige cartão habilitado na loja. Não há simulação de PIX para
o checkout hospedado.

## Super admin

O papel é `super_admin` e a área fica em `/super-admin`. Para promover o primeiro usuário de um ambiente:

```bash
pnpm admin:promote -- usuario@exemplo.com
```

O comando usa a service role apenas no servidor local. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
