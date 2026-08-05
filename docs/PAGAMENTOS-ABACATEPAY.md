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
[checkout](https://docs.abacatepay.com/pages/payment/create),
[webhooks](https://docs.abacatepay.com/pages/webhooks),
[transferências PIX](https://docs.abacatepay.com/pages/pix/create) e
[preços](https://www.abacatepay.com/pricing).

## Ambiente local

O `.env` local deve permanecer em simulação:

```dotenv
PAYMENTS_MODE=mock
ABACATEPAY_API_KEY=
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
ABACATEPAY_WEBHOOK_SECRET=
```

Depois execute:

```bash
pnpm supabase:start
pnpm exec supabase migration up
pnpm db:types
pnpm dev:apps
```

No modo mock, checkouts e transferências são confirmados localmente e nenhum dado sai do computador.

## Ambiente de desenvolvimento AbacatePay

1. Obtenha uma chave de desenvolvimento no dashboard.
2. Altere `PAYMENTS_MODE=abacatepay` e preencha `ABACATEPAY_API_KEY`.
3. Gere um segredo forte e preencha `ABACATEPAY_WEBHOOK_SECRET`.
4. Publique a API em HTTPS; webhooks não aceitam localhost ou IP privado.
5. Cadastre o endpoint:

```text
POST https://api.seudominio.dev/api/payments/webhooks/abacatepay?webhookSecret=SEU_SEGREDO
```

Assine os eventos `checkout.completed`, `checkout.refunded`, `checkout.disputed`, `checkout.lost`,
`transparent.completed`, `transparent.refunded`, `transparent.disputed`, `transparent.lost`, `payout.completed`,
`payout.failed`, `transfer.completed` e `transfer.failed`.

O endpoint valida o segredo da URL e `X-Webhook-Signature` com HMAC-SHA256 sobre o corpo bruto, processa cada evento de
forma idempotente e só então responde `200`.

## Super admin

O papel é `super_admin` e a área fica em `/super-admin`. Para promover o primeiro usuário de um ambiente:

```bash
pnpm admin:promote -- usuario@exemplo.com
```

O comando usa a service role apenas no servidor local. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.

