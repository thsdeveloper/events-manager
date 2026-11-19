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
   recupera o andamento de pagamentos pendentes. Ao confirmar, o UUID é removido do armazenamento: o sucesso fica
   visível na visita atual, mas uma nova visita abre o formulário novamente. Tentativas antigas já confirmadas também
   são descartadas após consulta ao servidor.
6. Webhook e reconciliação periódica confirmam pagamento, estoque e ledger por operação SQL transacional. A entrega dos
   ingressos usa as chaves de idempotência existentes de e-mail.

A confirmação exige valor exato, método compatível, ambiente correto e cobrança correspondente. `APPROVED` e `PAID`
confirmam a compra. Pagamentos pendentes, recusados, expirados, reembolsados e em disputa têm estados próprios. Um aviso
atrasado de pagamento não reativa uma compra reembolsada. Boleto pago pelo Pix é aceito com a tarifa efetivamente
informada pelo provedor.

## Cadastro do comprador no checkout

Antes de cotar ou comprar, a conta precisa de **nome, sobrenome, data de nascimento, e-mail, CPF válido e telefone
confirmado por SMS**. Não se exigem avatar, endereço ou outros campos opcionais do perfil. O contrato compartilhado
`getCheckoutProfileMissingFields` orienta a interface e valida o perfil na API; `CHECKOUT_PROFILE_INCOMPLETE` (422)
informa os campos ausentes. A proteção cobre cotação, compra gratuita/paga e parcelamento Pix, sem confiar nos dados
enviados pelo navegador.

A seleção de ingressos avisa quando o cadastro está incompleto. **Completar meus dados** abre o formulário na etapa
**Seus dados**, mantendo carrinho, cupom e participantes. Depois de salvar, o comprador aparece em um resumo com
**Editar dados**. Falhas de rede ou código inválido mantêm o formulário preenchido e permitem tentar novamente. Alterar
o telefone exige nova confirmação. O salvamento não reenvia um telefone já confirmado, preservando sua verificação. As
regras existentes de CPF continuam valendo: alteração de CPF existente exige senha atual; CPF vinculado a compras
permanece bloqueado.

A confirmação reutiliza `POST /api/user/phone/request` e `POST /api/user/phone/confirm`, com código de seis dígitos e
intervalo de reenvio. A API confere que a identidade e o telefone retornados pelo provedor pertencem à conta autenticada
antes de registrar `phone_verified_at`. Somente a API pode alterar esse marcador. `GET /api/auth/me` informa
`canAutoConfirmPhone`; o botão **Confirmar telefone (desenvolvimento)** só é oferecido com `APP_ENV=development`. A rota
usa essa mesma condição, inclusive quando `NODE_ENV=production` é usado para otimizar um build de desenvolvimento. Em
produção, o SMS exige o provedor configurado no Supabase Auth.

O e-mail de acesso existente não é alterado pelo checkout. Para contas antigas sem e-mail, `/api/user/email/request` e
`/api/user/email/confirm` permitem adicioná-lo com código de confirmação, autenticação, limitação de tentativas e
verificação da identidade devolvida pelo Supabase. O template `supabase/templates/email_change.html` inclui
`{{ .Token }}` para digitar o código na própria tela. A configuração local está em `supabase/config.toml`; ela é
carregada ao iniciar o Supabase. No projeto hospedado, configure o mesmo conteúdo em **Auth → Email Templates → Change
email address**. Referências oficiais:
[verificação de OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp) e
[templates locais](https://supabase.com/docs/guides/local-development/customizing-email-templates). Não há nova
migration para o cadastro no checkout.

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
- Em `APP_ENV=development` com chave `abc_dev_`, cartão habilitado e chave pública configurada, o crédito pode ser
  testado mesmo que o prazo solicitado pela organização difira do prazo operacional da conta. A mesma regra vale no
  mock. Pagamentos reais continuam sujeitos à compatibilidade dos prazos; nenhum prazo ou taxa é alterado por essa
  exceção. Veja [disponibilidade e prazos](TAXAS_E_MEIOS_DE_PAGAMENTO.md).

A CSP permite o endereço oficial e os redirecionamentos para `www.abacatepay.com` e `assets.abacatepay.com`, os scripts
Rinne e os endpoints e iframe específicos do Evervault usados pelo SDK. Não libera frames arbitrários. O formulário e o
desafio 3DS precisam ser homologados com a chave pública e os domínios reais da conta.

### Confirmação de teste no desenvolvimento

Com `APP_ENV=development`, `PAYMENTS_MODE=abacatepay` e uma chave `abc_dev_`, o checkout exibe **Confirmar pagamento de
teste** para cobranças pendentes. A API informa `canSimulatePayment` na criação e na consulta da tentativa; o modo
`mock` já confirma pagamentos automaticamente. Não há segredo nem variável de habilitação no navegador.

O botão chama `POST /api/payments/attempts/:id/simulate-payment`, autenticado, limitado por usuário/IP e restrito ao
comprador. O servidor verifica cobrança, valor, método e ambiente no provedor antes de confirmar:

- **Pix:** solicita a simulação oficial `/transparents/simulate-payment` e reconcilia o resultado consultado no
  provedor.
- **Boleto/cartão pendentes:** o provedor só oferece a simulação transparente de Pix
  ([documentação oficial do MCP AbacatePay](https://github.com/AbacatePay/abacatepay-mcp)). A confirmação é local,
  marcada com `developmentSimulation: true` na tentativa e `development.simulated` no ledger. Ela libera os ingressos
  para testar a experiência, sem declarar tarifa verificada nem liberar saldo para saque. A interface identifica “Compra
  de teste”. A tentativa sai da fila de reconciliação e notificações posteriores do sandbox não desfazem esse resultado
  local.

Produção, chaves reais, compradores diferentes, cobranças incompatíveis e estados encerrados são recusados. Falhas
preservam a tentativa. O recurso usa o fluxo transacional existente e não exige migration adicional. A validação SQL
reversível está em `supabase/tests/development_payment_confirmation.sql`.

### Interface de pagamento e confirmação

Na etapa de pagamento, o botão **Pagar** fica no **Resumo da compra**, abaixo do valor total. A ação continua vinculada
ao formulário de pagamento: mantém as validações, a autenticação do cartão e o bloqueio durante o processamento. Compras
gratuitas usam **Confirmar inscrição gratuita** no mesmo lugar.

O andamento apresenta total e vencimento antes das instruções, com ações de cópia e verificação. Boletos com Pix
alternativo usam abas, deixando claro que apenas uma modalidade deve ser paga. O layout adapta as colunas ao celular. A
confirmação compartilha `PurchaseSuccess` entre o checkout e a rota `/checkout/success`, com acesso aos ingressos,
resumo do pagamento quando disponível e confetes caindo do topo por até 6,5 segundos. A animação não intercepta cliques
e respeita `prefers-reduced-motion`, inclusive quando a preferência muda durante a exibição.

#### Ilustrações da marca

Arquivos gerados com a ferramenta integrada `image_gen` (fundo transparente), usando como referências o manual
`/mnt/e/Ello4/Flouvi/Kit-Flouvi/Guia-da-marca.pdf` e a ilustração existente
`apps/web/public/illustrations/event-creation/ticket-paid.png`:

- `apps/web/public/illustrations/checkout/purchase-success.png`: ingressos violetas com selo damasco e check branco.
- `apps/web/public/illustrations/checkout/payment-pending.png`: ingresso violeta com relógio damasco.

Conjunto de prompts: ilustração de interface em 3D suave, acabamento fosco, composição quadrada centralizada com espaço
livre e fundo transparente; violeta `#743DF5`, ameixa `#231A33`, damasco `#FFD09D`, névoa `#F3EEFF` e branco; sem texto,
logotipo ou marca-d'água; legível em 160 px. Sucesso: dois ingressos, selo com check e fitas/confetes discretos.
Pendente: um ingresso, relógio e uma fita lavanda. O layout usa DM Sans e a mesma paleta do manual.

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

## Revisão da confirmação em 19/11/2026

- Layout e interações verificados em navegador Chromium, nas larguras de 1280 e 390 px, usando os componentes reais com
  respostas HTTP controladas em uma página isolada. Não há rolagem horizontal. Foram conferidos as abas de boleto/Pix, o
  botão de teste, a confirmação, o encerramento dos confetes e a preferência de movimento reduzido.
- Capturas: [boleto desktop](evidencias/checkout-confirmacao/boleto-desktop.png),
  [boleto celular](evidencias/checkout-confirmacao/boleto-mobile.png),
  [Pix desktop](evidencias/checkout-confirmacao/pix-desktop.png),
  [Pix celular](evidencias/checkout-confirmacao/pix-mobile.png),
  [sucesso desktop](evidencias/checkout-confirmacao/sucesso-desktop.png) e
  [sucesso celular](evidencias/checkout-confirmacao/sucesso-mobile.png).
- Regressões de retorno ao checkout em `apps/web/src/hooks/useCheckout.test.tsx`: sucesso da visita atual, descarte de
  compra antiga confirmada, preservação de pendências e confirmação de uma pendência recuperada durante a visita.
- UI e página de sucesso em `TransparentPaymentResult.test.tsx`, `EventCheckout.test.tsx` e
  `app/(public)/eventos/[slug]/checkout/success/page.ssr.test.tsx`, todos sob `apps/web/src`.
- API em `apps/api/test/transparent-simulation.test.ts` e `transparent-attempts.test.ts`: autorização, isolamento,
  ambiente, validação da cobrança, marcação da simulação local e exclusão da reconciliação externa.
- SQL:
  `docker exec -i supabase_db_events-manager psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/development_payment_confirmation.sql`
  passou; fixtures revertidas, sem cobrança real.
- Comandos: `pnpm test --maxWorkers=4` na API; `pnpm test:coverage` nos contratos; `pnpm lint` e `pnpm build` na API e
  nos contratos; `pnpm exec tsc --noEmit` no frontend. Build Next.js passou em cópia isolada, com
  `pnpm exec next build --no-lint` e dois workers, preservando o servidor em uso.
- Frontend: `pnpm test --maxWorkers=4` encontrou um timeout no teste de calendário e um mock antigo de `location.href`
  vazio incompatível com Next Image. Removido o mock, a repetição dos dois arquivos passou (37 testes). A suíte completa
  foi verificada com `pnpm test:coverage --maxWorkers=2 --testTimeout=15000`.
- Revalidação do link “Ver meus ingressos”: `pnpm test --coverage --maxWorkers=4 --testTimeout=15000` e `pnpm lint` no
  frontend. As expectativas de destino foram corrigidas primeiro em `TransparentPaymentResult.test.tsx` e
  `app/(public)/eventos/[slug]/checkout/success/page.ssr.test.tsx`, reproduzindo o erro antes do ajuste. Os 1.020 testes
  passaram; cobertura sem regressão (74,90% statements, 68,62% branches, 75,34% functions, 76,36% lines).
- `pnpm lint` do frontend continua apontando quatro erros anteriores de `newline-before-return` em `AdminSidebar.tsx`,
  `SidebarSubmenu.tsx` e `sidebar.test.tsx`. O lint direcionado a todos os arquivos deste checkout passou.

Resultado de 19/11: **2.466 testes passaram** (330 contratos, 1.116 API e 1.020 frontend); builds e TypeScript passaram.
O lint dos arquivos alterados passou; as quatro ocorrências da sidebar acima continuam pendentes no lint global.

| Pacote    | Statements | Branches | Functions |  Lines |
| --------- | ---------: | -------: | --------: | -----: |
| Contratos |     98,01% |   95,11% |    99,25% | 98,97% |
| API       |     80,57% |   76,62% |    82,96% | 82,69% |
| Frontend  |     74,88% |   68,57% |    75,34% | 76,34% |

Não houve regressão de cobertura em relação à medição imediatamente anterior: API 80,54/76,56/82,96/82,67% e frontend
74,75/68,44/75,30/76,18% (statements/branches/functions/lines). Os comandos de cobertura da API e do frontend ainda
encerram com erro pelos limiares globais preexistentes, sem testes funcionais falhando. Nenhum limiar foi reduzido.

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

Resultado da validação de 18/11/2026: **2.066 testes passaram** (317 contratos, 834 API, 915 frontend). Lint, TypeScript
e builds passaram.

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

## Validação do cadastro no checkout — 19/11/2026

- Contratos: 348 testes; API: 1.140 testes; frontend: 1.029 testes, todos aprovados. Ciclo Red/Green nos contratos, no
  bloqueio das três rotas de compra, na confirmação de telefone e e-mail e no preenchimento dentro do checkout. Testes
  relevantes: `packages/contracts/src/checkout-profile.test.ts`, `apps/api/test/transparent-routes.test.ts`,
  `apps/api/test/phone-verification.test.ts`, `apps/api/test/checkout-email-completion.test.ts`,
  `apps/web/src/features/checkout/components/CheckoutBuyerProfile.test.tsx`,
  `apps/web/src/components/events/EventCheckout.test.tsx` e
  `apps/web/src/app/(checkout)/eventos/[slug]/checkout/page.test.tsx`.
- Comandos: `pnpm --filter @events-manager/contracts test:coverage`,
  `pnpm --filter @events-manager/api test --coverage`,
  `pnpm --filter @events-manager/web test --coverage --maxWorkers=4 --testTimeout=15000`, além de `lint` nos três
  pacotes e `tsc --noEmit` no frontend. Builds da API e contratos aprovados; `next build --no-lint` aprovado em cópia
  isolada do frontend, sem interferir no servidor de desenvolvimento.
- Cobertura sem regressão: contratos 98,04% de statements; API 80,72% de statements, 76,67% de branches, 83,04% de
  functions e 82,82% de lines; frontend 75,09%, 68,64%, 75,47% e 76,63%, respectivamente. Os gates globais já estavam
  abaixo dos limiares; permanecem bloqueados em branches da API e em statements, branches e functions do frontend. Os
  limiares não foram reduzidos. O lint global do frontend continua com quatro erros anteriores em `AdminSidebar.tsx`,
  `SidebarSubmenu.tsx` e `sidebar.test.tsx`; os arquivos deste ajuste não têm erros de lint.
- Playwright em Chromium, desktop 1280 px e celular 390 px, usando o componente real com respostas HTTP simuladas:
  cadastro incompleto, confirmação automática, preservação de dois ingressos e de outra participante, salvamento, avanço
  e compra concluída. Fora do modo de desenvolvimento, exibe o campo de código SMS e não apresenta o atalho automático.
  Sem rolagem horizontal. Capturas em [evidencias/checkout-cadastro](evidencias/checkout-cadastro). A validação visual
  não realizou cobrança nem envio de SMS real.

- Supabase local recarregado preservando o volume PostgreSQL 15. A referência em `.temp/postgres-version` foi alinhada à
  imagem `15.8.1.085` já utilizada pelo banco local, pois o cache apontava para PostgreSQL 17. Ao final, `/health`
  retornou `status: ok` e `database: connected`.
- E-mail de conta antiga validado também pela API local real: conta temporária sem e-mail, solicitação, recebimento no
  Mailpit do template **Confirme seu e-mail na Flouvi**, confirmação do código e associação à mesma identidade. A conta
  temporária foi removida após a verificação; nenhum e-mail foi enviado externamente.

### Botão de pagamento no resumo

Regressões adicionadas em `apps/web/src/components/events/EventCheckout.test.tsx`: ação única no resumo para Pix, boleto
e cartão; confirmação gratuita no mesmo local; bloqueio durante a autenticação do cartão. Os cinco testes falharam antes
da alteração e passaram depois. `pnpm --filter @events-manager/web test --coverage --maxWorkers=4 --testTimeout=15000`
aprovou os 1.034 testes; cobertura sem regressão (75,10% statements, 68,71% branches, 75,47% functions, 76,64% lines).
`pnpm --filter @events-manager/web exec tsc --noEmit` passou. O comando `pnpm --filter @events-manager/web lint`
continua apontando somente os quatro erros anteriores da sidebar; os limiares globais de cobertura continuam pendentes,
como registrado acima. Conferência em Chromium com o componente real e HTTP simulado, desktop 1280 px e celular 390 px:
apenas um botão, dentro do resumo, envio correto e sem rolagem horizontal. Capturas em
[evidencias/checkout-resumo](evidencias/checkout-resumo).

### Confirmação de senha ao salvar o CPF no checkout

Ao informar ou trocar o CPF, **Salvar dados** abre o modal **Confirme sua senha** antes de enviar a alteração à API.
**Confirmar e salvar** conclui a operação mantendo o checkout e os dados preenchidos. A API exige a senha também ao
cadastrar o primeiro CPF. O modal é compartilhado com o perfil por `features/account`; a política de autorização da
API permanece a mesma. Edições de outros dados com CPF inalterado não pedem senha.

Senha incorreta e falhas de conexão aparecem no modal e permitem nova tentativa. Cancelar mantém os dados do formulário,
mas descarta a senha. Durante o envio, os controles ficam bloqueados para evitar requisições duplicadas. Erros no CPF,
como documento já utilizado, fecham o modal para que o comprador corrija o campo.

Regressões em `apps/web/src/features/checkout/components/CheckoutBuyerProfile.test.tsx`: primeiro CPF, troca de CPF,
senha vazia/incorreta, confirmação por Enter, bloqueio durante o envio, cancelamento, documento rejeitado, conexão e
edição sem troca de CPF. Seis cenários falharam pela ausência do modal antes da implementação; os 30 testes do checkout
e de `apps/web/src/app/(public)/perfil/_components/ProfileDetailsForm.test.tsx` passaram depois.

Comandos de validação:

- `pnpm --filter @events-manager/web exec vitest run src/features/checkout/components/CheckoutBuyerProfile.test.tsx 'src/app/(public)/perfil/_components/ProfileDetailsForm.test.tsx' --maxWorkers=2`
- `pnpm --filter @events-manager/web test:coverage --maxWorkers=4 --testTimeout=15000`
- `pnpm --filter @events-manager/web lint`
- `pnpm --filter @events-manager/web exec tsc --noEmit`

Resultado: 1.054 testes em 233 arquivos aprovados; TypeScript, Prettier e lint dos arquivos deste ajuste aprovados.
Cobertura sem regressão: 75,36% statements, 69,08% branches, 75,68% functions e 76,91% lines. O comando de cobertura
ainda retorna falha pelos limiares globais anteriores (statements, branches e functions). O lint global continua com os
quatro erros anteriores da sidebar, descritos acima; nenhum limiar foi reduzido.

Conferência adicional em Chromium com o componente real e respostas HTTP simuladas: o primeiro envio só acontece após a
confirmação; senha incorreta permanece no modal; uma nova tentativa salva e fecha o modal. Desktop de 1280 px e celular
de 390 px, sem rolagem horizontal. Capturas em
[evidencias/checkout-confirmacao-cpf](evidencias/checkout-confirmacao-cpf).
