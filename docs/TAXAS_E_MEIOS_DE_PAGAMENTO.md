# Taxas e meios de pagamento

A configuração em `/super-admin/taxas` separa a remuneração da plataforma dos custos operacionais do gateway. Os
demonstrativos do ingresso e a calculadora pública usam as mesmas regras de `packages/contracts/src/payment-fees.ts`.

## Tabela de referência

Conferida em 18/11/2026 na [tabela oficial da AbacatePay](https://www.abacatepay.com/pricing), incluindo os valores de
todas as parcelas publicados pelo simulador. A matriz é editável para refletir contratos negociados; não há interpolação
entre 1x e 12x.

| Prazo | 1x    | 2x    | 3x    | 4x    | 5x    | 6x     | 7x     | 8x     | 9x     | 10x    | 11x    | 12x    |
| ----- | ----- | ----- | ----- | ----- | ----- | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| D+1   | 5,42% | 6,92% | 7,91% | 8,91% | 9,90% | 10,90% | 12,39% | 13,39% | 14,38% | 15,38% | 16,37% | 17,37% |
| D+7   | 5,03% | 6,52% | 7,52% | 8,51% | 9,51% | 10,50% | 12,00% | 12,99% | 13,99% | 14,98% | 15,98% | 16,97% |
| D+15  | 4,50% | 5,99% | 6,99% | 7,98% | 8,98% | 9,97%  | 11,47% | 12,46% | 13,46% | 14,45% | 15,45% | 16,44% |
| D+30  | 3,50% | 5,00% | 5,99% | 6,99% | 7,98% | 8,98%  | 10,47% | 11,47% | 12,46% | 13,46% | 14,45% | 15,45% |

Ao percentual do crédito soma-se R$ 0,60 por transação. A antecipação já integra o percentual e não é somada novamente.
O percentual incide sobre o total cobrado do comprador. Débito: 2,5% + R$ 0,60, em D+1, independentemente do prazo do
crédito.

Pix: R$ 0,80. Boleto compensado: R$ 2,50. Boleto pago pelo Pix: somente a tarifa do Pix. A emissão de QR Code, a emissão
de boleto e a mensalidade ficam em zero por padrão, em campos próprios; não são tratadas como cobrança adicional por
ingresso.

Saque Pix: R$ 0,80 nos primeiros 20 saques do mês; R$ 2,50 a partir do 21º. TED: R$ 5,00. Essas faixas são da conta no
gateway, não uma franquia por organizador. A tabela é referência para demonstração; o financeiro registra a tarifa
efetiva informada pelo provedor, sem deduzir a faixa mensal a partir de um histórico local que não conhece operações
feitas fora da plataforma.

## Preferências da organização

`/admin/configuracoes` salva `accepted_payment_methods` e `credit_card_settlement_period` no organizador ativo, validado
por sua sessão. Uma organização pode selecionar vários meios. O padrão, inclusive para organizações existentes após a
migration, é somente Pix. Pelo menos um meio é necessário; crédito exige D+1, D+7, D+15 ou D+30.

O endpoint autenticado `GET/PATCH /api/organizer/payment-settings` devolve as preferências, os meios efetivos e as
pendências. As consultas usam TanStack Query; o cliente do admin é recriado quando o usuário ou a organização muda.
Salvar invalida a disponibilidade do checkout. A seleção de evento do Header não limita essa configuração, que pertence
à organização inteira.

## Prazo solicitado e prazo operacional

A integração usa uma conta compartilhada da AbacatePay. A
[configuração de antecipação](https://www.abacatepay.com/antecipacao-automatica) é feita no painel do provedor; a API de
checkout não oferece prazo por cobrança.

O organizador escolhe seu prazo solicitado. No super-admin, o campo **Prazo operacional da conta AbacatePay** registra o
prazo já configurado externamente. Alterá-lo na Flouvi não chama uma API de reconfiguração da AbacatePay. Crédito fica
pendente se o prazo solicitado não coincidir com o operacional ou se `CARD` não estiver habilitado na conta. A
preferência continua salva e aparece nas simulações, identificada como pendente. Os outros meios efetivos continuam
funcionando. Pedidos anteriores não são recalculados; os novos pedidos registram as preferências e o prazo operacional
no seu `additional_info`.

## Disponibilidade no checkout

`GET /api/payments/methods?eventId=<uuid>` retorna somente meios permitidos pela organização, pelo gateway e pelo prazo
operacional. A API repete essa validação antes de criar inscrições/cobranças, inclusive no parcelamento via Pix. Uma
lista vazia é preservada; o frontend não oferece Pix se o organizador o desabilitou. Inscrições inteiramente gratuitas
continuam independentes de meios pagos.

Em produção, configure `ABACATEPAY_METHODS=PIX,CARD,BOLETO` **somente** para meios já liberados na conta. O padrão do
ambiente é `PIX`. No modo mock os três meios são suportados, mas continuam sujeitos às preferências da organização e ao
prazo.

O [checkout transparente](CHECKOUT_TRANSPARENTE.md) aceita `PIX`, `CARD` e `BOLETO`. Cartão exige também a chave pública
do SDK no mesmo ambiente da chave da API. Não oferece uma opção independente `DEBIT`. A preferência de débito e suas
tarifas podem ser cadastradas, mas ficam pendentes de suporte da integração; não se envia um método inventado nem se
habilita crédito quando somente débito foi selecionado.

## Demonstrativo e conciliação

**Entender taxas e recebimento** restringe a simulação aos meios selecionados pela organização, usa o prazo solicitado e
permite escolher cada parcela até o limite do ingresso. Mostra preço base, percentual e mínimo da plataforma,
conveniência, total do comprador, percentual e parcela fixa do gateway e líquido. O mínimo e o percentual da plataforma
são alternativas; aplica-se o maior, sem somá-los. Saques, TED, emissão e mensalidade aparecem separados do cálculo do
ingresso.

A tarifa fixa do gateway é por transação. A calculadora pública projeta uma compra por ingresso e informa essa premissa;
uma compra com vários ingressos compartilha a tarifa fixa. Estimativas não substituem a conciliação do pagamento.

No [envio de Pix](https://docs.abacatepay.com/pages/dinheiro/enviar-pix), a tarifa sai do `amount` enviado. A plataforma
envia o valor bruto reservado, evitando subtrair a tarifa duas vezes. A resposta e os webhooks atualizam tarifa efetiva
e líquido, inclusive tarifa zero ou R$ 2,50. Uma falha incerta continua mantendo a reserva para conferência, sem
permitir um segundo repasse. Transferências bancárias manuais continuam exigindo comprovante e não são confundidas com
TED executado pelo gateway.

## Banco e compatibilidade

Migration: `202611180008_payment_fee_schedule.sql`. Adiciona matriz e custos operacionais em `event_configurations`, com
validação da matriz 4 × 12, e preferências com constraints em `organizers`. Preserva RLS e não altera saldos, vendas
liquidadas ou a taxa de plataforma já cadastrada.

Os antigos campos `card_fee_percentage`, `card_installment_2_6_percentage` e `card_installment_7_12_percentage`
permanecem por compatibilidade com clientes anteriores. As novas telas e simulações utilizam a matriz exata
`card_rates`.

## Testes e evidências

As regressões cobrem a matriz por parcela/prazo, os limites de saque, a autorização por organização, a validação 422, o
bloqueio de meios pendentes no checkout, os toasts de erro e a discriminação do líquido. Os testes foram escritos antes
da implementação e executados no ciclo Red → Green.

Arquivos de teste criados ou alterados nesta entrega:

- Contratos: `payment-settings.test.ts`.
- API (`apps/api/test`): `gateway-fee-schedule.test.ts`, `organizer-payment-settings.test.ts`,
  `payment-settings-routes.test.ts`, `fees.test.ts`, `hosted-checkout.test.ts`, `env.test.ts`,
  `payment-methods.test.ts`, `application-services.test.ts` e `payout-security.test.ts`.
- Frontend: `PaymentSettingsForm.test.tsx`, `OrganizerPaymentSettings.test.tsx`, `TicketOrganizationFees.test.tsx`,
  `useFeeConfig.test.tsx`, `FeeCalculator.test.tsx`, `usePaymentMethods.test.tsx`, `PaymentMethodSection.test.tsx` e
  `lib/fees.test.ts`.

O navegador foi usado com usuários temporários no Supabase local para salvar as preferências, conferir a matriz do
super-admin e abrir o demonstrativo de um ingresso de R$ 100,00. Com a taxa de plataforma local de 10% repassada ao
comprador, D+7 e 2 parcelas, o total é R$ 110,00; gateway de 6,52% + R$ 0,60 = R$ 7,77; líquido de R$ 92,23. Também foi
conferida a largura de 390 px, sem transbordamento horizontal da página. As contas e o evento temporários foram
removidos ao terminar; nenhum pagamento ou repasse externo foi executado.

- [Preferências do organizador](evidencias/taxas/organizador-pagamentos.png) e
  [versão mobile](evidencias/taxas/organizador-pagamentos-mobile.png).
- [Taxas do super-admin](evidencias/taxas/super-admin-taxas.png) e
  [versão mobile](evidencias/taxas/super-admin-taxas-mobile.png).
- [Demonstrativo D+7 em 2x](evidencias/taxas/demonstrativo-credito-d7-2x.png) e
  [versão mobile](evidencias/taxas/demonstrativo-mobile.png).

### Verificação automatizada

- `pnpm --dir packages/contracts test:coverage`: 307 testes passaram; cobertura e limiares passaram.
- `pnpm --dir apps/api test:coverage`: 789 testes passaram. O comando retorna erro apenas pelo limite global de branches
  preexistente (83,5%); a cobertura de branches subiu de 72,45% para 72,71%.
- `pnpm --dir apps/web test --coverage --maxWorkers=2`: 898 testes passaram, em 215 arquivos. O comando retorna erro
  pelos quatro limites globais de cobertura que já falhavam antes desta alteração.
- `pnpm --dir packages/contracts lint`, `pnpm --dir apps/api lint`, `pnpm --dir apps/web lint` e
  `pnpm --dir apps/web exec tsc --noEmit`: passaram.
- `pnpm --dir packages/contracts build` e `pnpm --dir apps/api build`: passaram.
- Frontend: `next build --no-lint` passou em uma cópia isolada em `/tmp/event-scope-build/apps/web`, com dois workers;
  lint foi executado separadamente. Isso preservou o servidor de desenvolvimento em uso.
- `pnpm db:migrate`: migration aplicada no banco local, sem reset.
- Prettier aplicado nos arquivos alterados; `git diff --check` sem problemas.

| Pacote    | Statements antes → depois | Branches antes → depois | Functions antes → depois | Lines antes → depois |
| --------- | ------------------------- | ----------------------- | ------------------------ | -------------------- |
| Contratos | 97,58% → 97,79%           | 93,53% → 94,58%         | 99,01% → 99,09%          | 98,75% → 98,86%      |
| API       | 77,17% → 77,42%           | 72,45% → 72,71%         | 80,44% → 80,78%          | 79,27% → 79,57%      |
| Web       | 72,06% → 72,82%           | 64,45% → 65,47%         | 72,98% → 73,65%          | 73,55% → 74,30%      |

Nenhum limiar foi reduzido. Os limiares de contratos foram elevados para acompanhar a melhora.
