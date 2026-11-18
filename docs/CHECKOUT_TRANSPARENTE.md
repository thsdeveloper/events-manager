# Checkout transparente AbacatePay

O checkout público usa a API v2 de checkout transparente. Pix, boleto e cartão são apresentados na própria página; abrir
o boleto para impressão é opcional. Compras gratuitas continuam sem cobrança externa. Checkouts hospedados antigos
permanecem consultáveis e reembolsáveis.

## Fluxo e responsabilidades

1. O cliente autenticado envia ingresso, quantidade e cupom para `POST /api/payments/checkout/quote`. A API lê os preços
   e regras atuais, verifica a organização e devolve o total em centavos, métodos efetivos e limite de parcelas.
2. Para cartão, o navegador carrega `https://abacatepay.com/abacatepay.js` e monta os campos seguros do processador. O
   SDK recebe o total da cotação e realiza a tokenização e eventual desafio 3DS. A API da Flouvi recebe somente o token
   temporário `ctok_`; número, validade e CVV não fazem parte do contrato.
3. `POST /api/payments/checkout` exige `requestId` UUID e o total cotado. A API recalcula tudo, rejeita divergências,
   cria os ingressos nominais e reserva o estoque atomicamente antes de cobrar.
4. A tentativa fica persistida em `checkout_attempts`. Repetir o mesmo UUID/carrinho devolve o resultado existente;
   reutilizá-lo com outro carrinho é conflito. Uma resposta perdida não causa nova cobrança automática nem libera
   indevidamente o estoque.
5. `GET /api/payments/attempts/:id`, restrito ao comprador, consulta o provedor. O frontend usa TanStack Query e
   conserva somente o UUID da tentativa no `sessionStorage`, separado por comprador e evento. Recarregar a mesma aba
   recupera o andamento.
6. Webhook e reconciliação periódica confirmam pagamento, estoque e ledger por operação SQL transacional. A entrega dos
   ingressos usa as chaves de idempotência existentes de e-mail.

A confirmação exige valor exato, método compatível, ambiente correto e cobrança correspondente. `APPROVED` e `PAID`
confirmam a compra. Pagamentos pendentes, recusados, expirados, reembolsados e em disputa têm estados próprios. Um aviso
atrasado de pagamento não reativa uma compra reembolsada. Boleto pago pelo Pix é aceito com a tarifa efetivamente
informada pelo provedor.

## Tarifas e parcelas

A taxa da plataforma continua sendo calculada no servidor. Cupons locais já entram no total enviado; não se envia um
cupom extra ao gateway. `passFeesToCustomer` fica desligado para evitar um segundo acréscimo ao comprador.

O limite do cartão respeita todos os ingressos do carrinho, o máximo de 12 parcelas e o mínimo de R$ 10 por parcela. O
plano próprio de parcelas Pix continua separado, com validação do valor recebido por parcela.

No cartão parcelado, `platformFee` da criação/webhook pode representar **somente a tarifa da primeira parcela**. O
adapter consulta as parcelas do mesmo `installmentGroupId`, verifica quantidade, identificadores e soma de valores antes
de somar as tarifas. Sem a tarifa completa ou enquanto o cartão estiver `APPROVED`, a compra aprovada libera os
ingressos, mas o lançamento financeiro permanece `pending`, com líquido disponível zero. Quando o provedor omite a
tarifa no registro de cartão, consultamos `/bank-statement/list`, associando as movimentações aos IDs exatos das
parcelas e conferindo os créditos e débitos. Somente `PAID`, com todas as parcelas liquidadas e a tarifa verificada,
libera o líquido. A reconciliação também visita compras confirmadas com tarifa ou liquidação pendentes. Nunca se utiliza
uma estimativa como tarifa liquidada.

A escolha de D+1/D+7/D+15/D+30 continua sujeita à compatibilidade operacional da conta compartilhada, conforme
[Taxas e meios de pagamento](TAXAS_E_MEIOS_DE_PAGAMENTO.md).

## Configuração

```dotenv
PAYMENTS_MODE=abacatepay
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
ABACATEPAY_API_KEY=<chave secreta configurada somente na API>
ABACATEPAY_PUBLIC_KEY=<pk_ do mesmo ambiente, necessário para cartão>
ABACATEPAY_WEBHOOK_SECRET=<segredo aleatório exclusivo>
ABACATEPAY_METHODS=PIX
```

- A chave precisa das permissões `TRANSPARENT:CREATE`, `TRANSPARENT:READ`, `BANK_STATEMENT:READ` e da permissão de
  reembolso para operações de estorno. Habilite os métodos na conta AbacatePay antes de acrescentar `CARD` ou `BOLETO` à
  variável.
- Cartão também requer checkout transparente de cartão habilitado pelo provedor. Sem chave pública, a aplicação não
  oferece cartão real. As preferências da organização continuam valendo; inicialmente só Pix está ativo.
- `ABACATEPAY_PUBLIC_KEY` é pública. A chave secreta `abc_...`, tokens permanentes `cardToken` e segredos de webhook
  nunca devem entrar em variáveis `NEXT_PUBLIC_`, logs, respostas públicas ou arquivos versionados.
- Produção exige HTTPS, segredo de sessão forte, webhook configurado e chave de produção. `abc_dev_` é recusada em uma
  execução de produção; use `APP_ENV=development` para um deployment de testes otimizado com `NODE_ENV=production`.
- O modo `mock` é destinado ao desenvolvimento. Não envia cartão ao SDK nem realiza cobranças externas.

A CSP permite o endereço oficial e os redirecionamentos para `www.abacatepay.com` e `assets.abacatepay.com`, os scripts
Rinne e os endpoints e iframe específicos do Evervault usados pelo SDK. Não libera frames arbitrários. O formulário e o
desafio 3DS precisam ser homologados com a chave pública e os domínios reais da conta.

## Webhooks

Cadastre no mesmo ambiente da chave:

```text
POST https://<api-publica>/api/payments/webhooks/abacatepay?webhookSecret=<segredo>
```

A rota também aceita o segredo no header `x-webhook-secret`. Exige simultaneamente o segredo privado e a assinatura HMAC
do corpo original (`x-webhook-signature` ou `x-abacate-signature`). A chave HMAC publicada pelo provedor verifica
integridade e **não substitui o segredo privado**. O corpo é limitado a 256 KiB, a comparação do segredo é constante e a
URL registrada nos logs não contém a query string.

Assine `transparent.completed`, `transparent.refunded` e `transparent.disputed`. O handler também compreende
`transparent.lost`, `transparent.expired` e `transparent.cancelled` quando enviados. Preserve as assinaturas de eventos
`checkout.*` e de repasses para compras antigas e o financeiro existente.

A disputa pode terminar no mesmo evento `transparent.disputed`: `UNDER_DISPUTE` bloqueia o lançamento; `PAID` resolve a
favor da venda; `REFUNDED` encerra com estorno. Reembolsos usam `/transparents/refund` para compras transparentes,
aguardando confirmação do provedor. O provedor estorna a cobrança integral, incluindo todas as parcelas de cartão.

O job periódico recupera pagamentos mesmo se o webhook não chegar. Nas respostas incertas de cartão, `externalId` não é
usado para recuperação porque o gateway o ignora: a busca usa `metadata.checkout_attempt_id` e o cursor oficial de
paginação. Consultas têm prazo e paginação limitados. Uma tentativa que permaneça `processing` sem cobrança
identificável precisa de investigação operacional; não recrie a cobrança enquanto houver incerteza.

## Banco e segurança

Aplicar, nesta ordem, as migrations novas:

- `202611180009_transparent_checkout.sql`: tentativas duráveis, estoque e liquidação atômicos; acesso exclusivo da API.
- `202611180010_preserve_verified_transparent_fee.sql`: uma resposta atrasada sem tarifa não apaga a tarifa já
  verificada.
- `202611180011_transparent_fee_reconciliation.sql`: acompanha tarifas ainda não confirmadas para reconciliação
  financeira.
- `202611180012_settled_transparent_funds.sql`: aprovação de cartão libera ingressos; liquidação libera o saldo para
  repasse.
- `202611180013_transparent_provider_ordering.sql`: notificações antigas não reabrem disputas nem desfazem a liquidação.

A tabela e os RPCs não podem ser usados pelas roles `anon`/`authenticated`. A API verifica sessão, propriedade,
organização habilitada e regras comerciais; contratos estritos rejeitam campos de cartão, identidade do usuário e preços
arbitrários. Há limitação de tentativas por usuário e IP, validação de origem para escritas no navegador e respostas
privadas sem cache.

## Validação em 18/11/2026

- Pix **real da API de sandbox**, criado pelo navegador: QR Code, cópia, recuperação após reload e confirmação com
  `/transparents/simulate-payment`, sem dinheiro real. Valor R$ 11,00, tarifa efetiva R$ 0,80, taxa da plataforma
  R$
  1,00, líquido R$ 9,20. Uma inscrição e um lançamento; conferidos no banco.
- Desktop e celular de 390 px verificados, sem rolagem horizontal. Capturas em
  [evidencias/checkout-transparente](evidencias/checkout-transparente).
- Boleto emitido pelo checkout no navegador e também diretamente na API de sandbox: linha digitável, QR Pix alternativo,
  URL e tarifa retornados. A compensação bancária real de boleto não foi executada.
- Cartão testado com a chave pública fornecida: SDK oficial, tokenização e aprovação em 3 parcelas, além de recusa com
  cartão de teste final `0002`. O sandbox oficial usa `devMock`; não executa uma autenticação bancária 3DS real.
  Verificado no banco: ingresso confirmado e valor para repasse bloqueado enquanto `APPROVED`.
- Webhook HTTP local: sem assinatura `401`, corpo adulterado `401`, mensagem válida `200` e reentrega `200`, sem novo
  lançamento.
- Testes automatizados exercitam SDK/tokenização, autorização, adulteração de valores, idempotência, falha de rede,
  assinatura/segredo, ambiente, tarifa parcelada, reembolso e estados de pagamento.
- `supabase/tests/transparent_checkout.sql` verifica permissões, reserva, liquidação, reentrega, tarifa ausente,
  preservação de tarifa e estorno seguido de confirmação atrasada, em transação revertida.
- **Pendente de configuração externa:** a URL HTTPS pública ainda não foi definida pelo responsável. O segredo local foi
  gerado e validado, e a chave pública foi configurada somente no `.env` local. O endpoint público deverá ser cadastrado
  no painel da AbacatePay quando o domínio estiver disponível; em produção, utilizar credenciais e segredo próprios e
  homologar o desafio bancário 3DS. Nenhuma cobrança com dinheiro real foi realizada.

## Referências verificadas

- [Checkout transparente](https://docs.abacatepay.com/pages/cobrar/checkout-transparente)
- [SDK abacatepay.js](https://docs.abacatepay.com/pages/transparents/abacatepay-js)
- [Cartão transparente](https://docs.abacatepay.com/pages/cobrar/checkout-transparente-cartao)
- [Parcelamento](https://docs.abacatepay.com/pages/pagamentos/parcelamento)
- [Eventos de checkout transparente](https://docs.abacatepay.com/pages/webhooks/events/transparent)
- [Segurança de webhooks](https://docs.abacatepay.com/pages/notificacoes/seguranca)
- [CSP do Evervault](https://docs.evervault.com/sdks/react)

- [Extrato e tarifas efetivas](https://docs.abacatepay.com/pages/bank-statement/list)

## Comandos e testes

Verificação executada no workspace:

- `pnpm --filter @events-manager/contracts test:coverage` e `lint`.
- `pnpm --filter @events-manager/api test:coverage`, `test`, `lint` e `build`.
- `pnpm --filter @events-manager/web exec vitest run --coverage --maxWorkers=2`, `lint` e `tsc --noEmit`.
- Build Next.js em cópia isolada do frontend (`next build --no-lint`, dois workers), para preservar o servidor de
  desenvolvimento em uso; lint e TypeScript executados separadamente.
- `supabase migration up --local`: nenhuma migration pendente após aplicação e registro das migrations novas.
- `psql -v ON_ERROR_STOP=1` com `supabase/tests/transparent_checkout.sql`: todos os cenários passam e os dados de teste
  são revertidos.

Testes novos ou ampliados nesta entrega:

- Contratos: `packages/contracts/src/transparent-checkout.test.ts`.
- API: `transparent-gateway.test.ts`, `transparent-attempts.test.ts`, `transparent-checkout-plan.test.ts`,
  `transparent-routes.test.ts`, `transparent-webhook-security.test.ts`, `refund-registration.test.ts`, `env.test.ts` e
  `application-services.test.ts` em `apps/api/test`.
- Web: `hooks/useCheckout.test.tsx`, `components/events/EventCheckout.test.tsx`,
  `features/checkout/components/{PaymentMethodSection,TransparentCheckoutForm,TransparentPaymentResult}.test.tsx`,
  `features/checkout/lib/abacatepay.test.tsx` e `lib/checkout-security.test.ts` em `apps/web/src`.

Nenhum limiar de cobertura foi reduzido. Os gates globais de cobertura da API e do frontend já estavam abaixo dos
limiares antes deste trabalho; os resultados são registrados abaixo separadamente dos testes funcionais.

Resultado final: **2.066 testes passaram** (317 contratos, 834 API, 915 frontend). Lint, TypeScript e builds passaram.

| Pacote    | Statements | Branches | Functions |  Lines |
| --------- | ---------: | -------: | --------: | -----: |
| Contratos |     97,86% |   94,86% |    99,13% | 98,89% |
| API       |     77,89% |   73,36% |    81,00% | 80,07% |
| Frontend  |     73,21% |   66,01% |    73,73% | 74,74% |

Todas as métricas ficaram acima da medição anterior desta tarefa. O gate de contratos passou. O de API ainda falha no
limiar global de branches (83,5%); o do frontend ainda falha nos limiares globais de statements/lines (76,5%), functions
(78,5%) e branches (79,1%). São déficits existentes no conjunto do repositório, preservados explicitamente sem reduzir a
catraca.

Os usuários, eventos e inscrições temporários foram removidos do banco local ao terminar. Permanecem apenas as capturas
de tela e o código de implementação/testes; nenhuma credencial foi adicionada ao repositório.
