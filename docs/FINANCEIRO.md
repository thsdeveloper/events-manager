# Transações do financeiro

A listagem em `/admin/financeiro` mostra **movimentações de pagamento**. Uma compra com duas parcelas de
R$ 250 produz duas transações de R$ 250, e não duas transações pelo total de R$ 500. O painel de detalhes
mantém separados o valor da transação e o total do pedido.

## Confirmação e conciliação

O pagamento pode ser confirmado antes de o provedor informar as tarifas e liquidar os recursos.
Por isso, a resposta financeira separa:

- `status`: situação do pagamento exibida ao organizador;
- `settlement_status`: `settled`, `pending` ou `not_applicable`;
- `provider_fee`, `platform_fee` e `organizer_net`: valores confirmados da movimentação, ou `null` enquanto
  não houver conciliação. O frontend mostra **A confirmar** para valores desconhecidos.

Uma movimentação `transparent.reconciled_paid` com estado contábil `pending` é apresentada como **Pago**.
O mesmo vale para `transparent.completed` cujo estado do provedor seja `PAID` ou `APPROVED`. A regra não
usa o pagamento global do pedido para transformar outra tentativa pendente, falha ou reembolsada em paga.
Os filtros **Pago** e **Pendente** aplicam essa distinção no banco antes da paginação.

O estado contábil original em `payment_transactions` permanece preservado: a apuração de saldo disponível
para repasse continua usando apenas movimentos efetivamente liquidados (`status = succeeded` no ledger).
Não há criação de taxas presumidas nem liberação de dinheiro com base somente na confirmação do ingresso.

A transformação fica em `apps/api/src/application/finance/finance-transaction.ts`. O mapeamento web é
compartilhado entre SSR e atualizações no navegador em `apps/web/src/lib/finance/transactions.ts`.
Não foi necessária migration ou nova variável de ambiente.

## Detalhes da transação

Clicar na linha abre um painel lateral. O identificador da transação também é um botão acessível pelo
teclado. Controles internos de outras tabelas não são interceptados pela ação de linha. O painel permite
atualizar os dados, tentar novamente após falha e fechar com Esc; ao fechar, os dados financeiros da tabela
são invalidados para atualização.

A rota `GET /api/organizer/finance/transactions/:id` exige sessão, organização e `finance.read`. O ID passa
por validação UUID. A busca respeita tanto o evento selecionado quanto os eventos autorizados pela IAM;
uma transação fora desse escopo retorna 404 sem carregar ingressos ou parcelas de outra organização.
O DTO compartilhado está em `packages/contracts/src/finance.ts`.

O painel inclui:

- situação e valor da movimentação, forma de pagamento e data;
- tarifas da plataforma/provedor, líquido e situação da conciliação;
- comprador, e-mail, telefone e documento registrados na compra;
- situação do pedido, pagamento, quantidade, total, valor unitário, serviço e datas;
- parcelas Pix com valores, vencimentos, confirmação e pagamento, além de totais pagos/pendentes;
- evento, tipo de ingresso, datas, local, participantes, códigos, valores e check-ins dos ingressos;
- histórico das movimentações do pedido, inclusive falhas, disputas e reembolsos;
- identificadores do pedido, checkout, cobrança, provedor e reembolso, comprovante disponível e observações.

Metadados e payloads brutos do gateway não são enviados. Campos ausentes são indicados como não informados;
um comprovante só vira link quando usa HTTPS. Parcelas de cartão são identificadas como condições da compra,
sem apresentar uma agenda Pix para pagamentos da fatura bancária.

## Cores

As tags combinam texto, ícone e cor: verde para pago, âmbar para pendente, vermelho para falha e violeta
para reembolso. Cancelamento usa cinza; parcelas vencidas usam vermelho. O painel mantém violeta/névoa e
DM Sans da Flouvi, com layout adaptado a desktop e celular.

## Validação

O ciclo Red/Green reproduziu primeiro o status incorreto, os valores duplicados do pedido na transação e
a ausência de abertura dos detalhes. Testes adicionados/alterados:

- `apps/api/test/finance-transactions.test.ts`
- `apps/api/test/finance-transaction-routes.test.ts`
- `apps/api/test/finance-security.test.ts`
- `apps/api/test/iam-route-policy.test.ts`
- `apps/web/src/lib/finance/transactions.test.ts`
- `apps/web/src/app/admin/financeiro/_components/TransactionsTable.test.tsx`
- `apps/web/src/components/ui/data-table.test.tsx`

Comandos executados:

```sh
pnpm --filter @events-manager/contracts build
pnpm --filter @events-manager/contracts lint
pnpm --filter @events-manager/contracts test:coverage
pnpm --filter @events-manager/api lint
pnpm --filter @events-manager/api build
pnpm --filter @events-manager/api test:coverage --maxWorkers=4
pnpm --filter @events-manager/web exec tsc --noEmit
pnpm --filter @events-manager/web lint
pnpm --filter @events-manager/web test:coverage --maxWorkers=4 --testTimeout=15000
```

Prettier e ESLint direcionado foram executados nos arquivos web alterados. O navegador verificou as quatro
cores, clique na linha, abertura por Enter, fechamento por Esc e ausência de transbordamento do painel no
celular. As imagens em `docs/evidencias/financeiro/` usam dados de exemplo com os componentes reais.

Uma conferência separada, somente leitura, verificou o pedido
`397c3c17-97d8-40d4-ba46-81716cf00457`: duas transações pagas de R$ 250, nenhuma retornada pelo filtro
Pendente, duas parcelas quitadas e cinco ingressos. Os recursos ainda não conciliados continuam excluídos
do saldo de repasse. Resultado registrado em `docs/evidencias/financeiro/validacao.json`.

Resultado final: **1.208 testes de API**, **1.097 testes web** e **356 testes dos contratos**, todos
aprovados. TypeScript do web, lint/build da API, lint/build dos contratos e ESLint dos arquivos alterados
passaram. O lint geral web mantém quatro erros anteriores de `newline-before-return` em `AdminSidebar.tsx`,
`SidebarSubmenu.tsx` e `sidebar.test.tsx`.

Cobertura final (statements / branches / functions / lines):

- API: **81,35% / 77,69% / 83,52% / 83,36%**.
- Web: **76,31% / 70,92% / 76,48% / 77,88%**.
- Contratos: **98,05% / 95,32% / 99,26% / 98,99%**.

As métricas da API/web aumentaram, mas as catracas globais anteriores ainda fazem os comandos de cobertura
falharem: branches na API e statements/branches/functions no web. Nenhum limiar foi reduzido.
