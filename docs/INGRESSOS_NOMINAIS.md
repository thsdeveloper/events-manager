# Ingressos nominais

Desde 17/09/2026 cada unidade comprada é um ingresso próprio. Este documento descreve o modelo, os fluxos e as regras
que a API aplica.

## Modelo

- `event_registrations` é o **pedido**: quem comprou (`participant_*`), o pagamento (`payment_status`, `payment_method`,
  `receipt_url`), o cupom em `additional_info` e a quantidade. Uma compra com dois tipos de ingresso gera dois pedidos
  ligados pelo `checkout_group_id`.
- `registration_tickets` é o **ingresso**: uma linha por unidade, com `sequence` (1..quantidade), `ticket_code` único,
  participante (`attendee_name`, `attendee_email`, `attendee_phone`, `attendee_document`), `is_buyer`, `named_at`,
  valores rateados ao centavo (`unit_price`, `service_fee`, `discount`, `total_amount`) e `check_in_date`.
- O ingresso não tem estado de pagamento próprio: herda o do pedido. O check-in é por ingresso.
- Um ingresso está **nomeado** (nome e e-mail) ou **pendente** (ambos nulos); a constraint
  `registration_tickets_attendee_complete` impede meio-termo.
- Migração `20260917120000_nominal_tickets.sql`. O backfill converteu cada pedido existente em `quantity` ingressos: a
  primeira unidade ficou com quem comprou e manteve o código já enviado por e-mail; as demais ficaram pendentes.

## Checkout

`POST /api/payments/checkout` aceita, em cada item de `tickets`, uma lista opcional `attendees` com um participante por
unidade (`{ name, email, document?, phone? }`) ou `null` para deixar a unidade pendente. Sem a lista, a primeira unidade
fica com quem compra. O contrato é `checkoutTicketSelectionSchema` em `packages/contracts`.

Para comprar, o perfil autenticado precisa de nome, sobrenome, data de nascimento, e-mail, CPF válido e telefone
confirmado por SMS. A mesma regra é aplicada pela API à cotação, à compra (inclusive gratuita) e ao parcelamento Pix. A
API também confere a identidade do comprador e rejeita divergências.

Se houver dados faltantes, a primeira etapa avisa e oferece **Completar meus dados**. Na etapa **Seus dados**, a pessoa
preenche e salva o cadastro, solicita o SMS e confirma o código sem sair do checkout. Os ingressos, participantes e
cupom selecionados são preservados. Um cadastro completo aparece como resumo, com **Editar dados**; trocar o telefone
exige nova confirmação. Em desenvolvimento, o botão **Confirmar telefone (desenvolvimento)** dispensa o SMS, sob
autorização exclusiva da API (`APP_ENV=development`). O e-mail de acesso existente é protegido; contas antigas sem
e-mail podem adicioná-lo ali após confirmar um código enviado para o endereço informado. Veja
[Checkout transparente](CHECKOUT_TRANSPARENTE.md).

O comprador e o participante são independentes. A etapa "Seus dados" mostra um cartão por unidade com "Este ingresso é
para mim" (uma unidade por vez), campos para outra pessoa e "Preencher depois". Nesta última opção, a unidade fica
**Pendente de nomeação**, com participante e `named_at` nulos; os dados do comprador continuam no pedido. Após a compra,
o comprador informa quem usará o ingresso em **Meus ingressos → Ver detalhes → Informar participante**. A nomeação nunca altera os
dados do comprador ou seu perfil.

O parcelamento via Pix (`POST /api/checkout/installments`) também recebe `attendees`, com uma entrada por unidade. Ele
preserva participantes nomeados e unidades pendentes. Sem a lista, mantém a compatibilidade: primeira unidade com quem
compra e demais pendentes.

## Entrega por e-mail

`DeliverTickets` (`apps/api/src/application/tickets/deliver-tickets.ts`) envia, para pedidos pagos ou gratuitos:

- um **recibo da compra** por checkout para quem comprou, listando todos os ingressos, inclusive os pendentes (template
  `purchase-confirmation`, chave `purchase-confirmation-<checkout_group_id>`);
- o **ingresso nominal** para cada participante com e-mail diferente do de quem comprou (template `attendee-ticket`,
  chave `attendee-ticket-<ticket_id>-<email>`).

O e-mail **“Seu ingresso chegou”** inclui `ingresso-<ticket_code>.pdf` como anexo. Cada participante recebe
somente o próprio ingresso, com nome, tipo, evento, data e local, código e QR Code de entrada. O arquivo tem
uma página A4 e usa logo, fonte DM Sans e paleta da Flouvi. Data e hora seguem o horário de Brasília.
O texto do e-mail orienta a salvar o PDF no celular ou imprimi-lo.

O e-mail **“Compra confirmada”** também inclui os PDFs: um arquivo por ingresso do pedido que já tenha
nome e e-mail do participante, incluindo ingressos de terceiros. Cada arquivo preserva o código e os dados
daquela pessoa, além da data e do local do evento. Ingressos ainda sem participante continuam listados como
pendentes de nomeação, sem PDF de entrada. Se todos estiverem pendentes, o recibo é enviado com a orientação
para completar os dados, sem anunciar anexos. Reenvios solicitados pelo organizador seguem a mesma regra.
Falha em qualquer PDF impede o envio parcial: a tentativa é marcada como falha e a próxima gera o conjunto completo.

`TicketPdfRenderer` é a porta da aplicação; `PdfKitTicketRenderer` gera o PDF em memória e `NodemailerGateway`
envia os bytes como anexo `application/pdf`. Fontes e logo ficam em `apps/api/assets/tickets`, incluídos no
pacote de produção; nenhuma requisição ao frontend ou serviço externo é necessária para gerar o arquivo.
O PDF só é gerado após a aquisição da chave de envio. Falha na geração ou no envio marca a tentativa como
falha, permitindo uma nova tentativa com o anexo. O reenvio do ingresso nominal usa o mesmo fluxo.
Pedidos pendentes e planos Pix ainda não quitados continuam sem disparar a entrega.

Dispara em quatro pontos: compra simulada ou gratuita, webhook `checkout.completed`, liquidação pela consulta de status
na volta do provedor e reconciliação periódica. As chaves de idempotência garantem uma mensagem por pessoa mesmo com
vários disparos. Falha de e-mail nunca derruba a confirmação do pagamento. Nomear um ingresso pendente de um pedido já
pago dispara o e-mail da pessoa na hora. Planos Pix disparam a entrega somente após a quitação integral.

Validação do anexo: `ticket-delivery.test.ts`, `ticket-pdf.test.ts` e `nodemailer-attachments.test.ts`
em `apps/api/test` verificam destinatário, conteúdo individual, falhas/reenvios, idempotência, PDF legível,
acentos, dados longos, leitura do QR Code e codificação MIME. `application-services.test.ts` e
`iam-email.test.ts` receberam apenas a nova dependência de geração de PDF na montagem do serviço.
Para “Compra confirmada”, `ticket-delivery.test.ts` também cobre compra de um ou vários ingressos,
participantes incompletos, falha em um dos anexos, nova tentativa com todos os PDFs e reenvio de pedidos pagos/gratuitos.
`pnpm --filter @events-manager/api lint` e `pnpm --filter @events-manager/api build` passaram.
`pnpm --filter @events-manager/api test:coverage`: **1.193 testes aprovados**, cobertura
**81,20% / 77,52% / 83,40% / 83,23%** (statements / branches / functions / lines); permanece a
pendência anterior da catraca global de branches (83,5%). Os limites foram preservados.
A geração a partir de `dist` e o empacotamento com `pnpm --filter @events-manager/api pack` também foram
conferidos. Não há migration ou variável de ambiente nova. Foram adicionados `pdfkit` e `qrcode` à API;
leitura de PDF e decodificação de QR são dependências exclusivas dos testes.
Exemplo com dados fictícios: [PDF](evidencias/ingresso-email/ingresso-exemplo.pdf) e
[prévia](evidencias/ingresso-email/ingresso-exemplo.png). Nenhum e-mail real foi disparado na validação.

Referências técnicas: [anexos no Nodemailer](https://nodemailer.com/message/attachments),
[PDFKit](https://pdfkit.org/docs/getting_started.html) e [geração de QR Code](https://github.com/soldair/node-qrcode).

## Área da pessoa

- `GET /api/user/tickets` devolve `NominalTicket[]`: os ingressos que a pessoa comprou e os que outra pessoa comprou em
  nome dela (e-mail da conta igual ao do participante). Ninguém precisa criar conta para receber um ingresso; ao criar,
  ele aparece.
- `PATCH /api/user/tickets/:id/attendee` nomeia ou corrige o participante. Só quem comprou pode, até o check-in e
  enquanto o pedido não estiver cancelado ou reembolsado, e somente em ingressos para terceiros.
- Um pedido com `payment_status=pending` (inclusive parcelamento incompleto), ausente ou desconhecido aparece como
  **Aguardando pagamento**, mesmo que já tenha participante ou que `status=confirmed` tenha sido informado. A reserva
  ainda não libera código de entrada, QR, PDF, comprovante ou transmissão. Cancelamento e reembolso também bloqueiam
  essas ações. Somente `paid` ou `free`, sem cancelamento, confirmam o pagamento.
- Ingressos pagos sem participante mostram **Pendente de nomeação**, sem QR de entrada nem download do PDF. Nomear
  libera essas ações apenas quando o pagamento também estiver confirmado. O check-in mantém essa exigência na API.
- A API omite o link da transmissão para ingressos não pagos ou não nomeados, e o comprovante para pedidos não pagos,
  tanto na listagem quanto na resposta de nomeação. O resumo **Investido** soma somente pedidos pagos/ gratuitos não
  cancelados, sem incluir pagamentos pendentes ou reembolsados.

## Painel do organizador

`/api/admin/participantes` lista **um ingresso por linha** com o pedido, o evento e o tipo. Check-in, edição do
participante e reenvio de e-mail são por ingresso (o id nas rotas é o do ingresso). Cancelamento continua sendo do
**pedido inteiro**: a rota aceita o id do ingresso e resolve o pedido. O check-in exige participante nomeado e pedido
pago. **Depois do check-in o ingresso é imutável**: nem quem comprou nem o organizador alteram o participante (a API
responde 409 `TICKET_CHECKED_IN`); para corrigir, o organizador desfaz o check-in primeiro. A ordenação por status do
pedido não atravessa a relação no PostgREST e cai na data de compra.

## Limitações conhecidas

- O perfil (avatar) de quem comprou não é embutido na resposta: `user_id` aponta para `auth.users`, sem chave
  estrangeira para `profiles`.
- Limite de compra continua sendo por pedido, não por CPF.

## Regressões do comprador e da nomeação

Testes desta alteração:

- API: `apps/api/test/transparent-routes.test.ts` e `apps/api/test/nominal-tickets.test.ts`.
- Checkout: `apps/web/src/components/events/EventCheckout.test.tsx`,
  `apps/web/src/app/(checkout)/eventos/[slug]/checkout/page.test.tsx`,
  `apps/web/src/features/checkout/components/TransparentCheckoutForm.test.tsx` e
  `apps/web/src/features/checkout/components/AttendeeCards.test.tsx`.
- Área de ingressos: `apps/web/src/components/tickets/TicketDetailsModal.test.tsx` e
  `apps/web/src/components/tickets/MyTicketsContent.test.tsx`.

Validação: `pnpm test:coverage` e `pnpm lint` em `apps/api` e `apps/web`, `pnpm exec tsc --noEmit` no frontend e
`pnpm build` na API. A cobertura global já estava abaixo das catracas; os limites foram preservados. Evidências visuais
em `docs/evidencias/checkout-nomeacao/`.

## Correção de confirmação antes do pagamento — 19/11/2026

A causa estava na apresentação: `TicketCard` usava participante, cancelamento e horário do evento para escolher
“Confirmado”, sem consultar `payment_status`. Cartão e modal também geravam QR para qualquer participante nomeado. A
consulta local ao banco encontrou os pedidos não pagos como `pending/pending`, sem necessidade de corrigir registros ou
criar migration.

A apresentação agora usa a confirmação explícita do pagamento, compartilha a regra entre cartão/modal/resumo e retira o
QR quando o pagamento deixa de estar confirmado. A API também retira transmissão e comprovante de pagamentos pendentes
ou cancelados. Os testes existentes confirmam que check-in e entrega por e-mail já recusavam pedidos não pagos.

Testes adicionados/alterados:

- `apps/web/src/components/tickets/TicketCard.test.tsx`: grade e lista pendentes, pagamento parcial/ausente, ingresso
  pago/gratuito e retirada de QR após mudança.
- `apps/web/src/components/tickets/TicketDetailsModal.test.tsx`: QR, código, PDF, transmissão e comprovante
  indisponíveis antes do pagamento ou após reversão.
- `apps/web/src/components/tickets/MyTicketsContent.test.tsx`: pendentes e reembolsados não entram em **Investido**.
- `apps/api/test/ticket-service.test.ts`: transmissão e comprovante protegidos tanto na listagem quanto na nomeação;
  preservação de ingressos pagos/gratuitos.

Validação: `pnpm --filter @events-manager/api test --coverage` (1.147 testes) e
`pnpm --filter @events-manager/web test --coverage --maxWorkers=4 --testTimeout=15000` (1.048 testes), todos aprovados.
Cobertura sem regressão: API 80,73% statements, 76,73% branches, 83,06% functions, 82,84% lines; frontend 75,18%,
68,87%, 75,53% e 76,74%, respectivamente. Permanecem os bloqueios preexistentes dos limiares globais.
`pnpm --filter @events-manager/api lint`, `pnpm --filter @events-manager/api build` e
`pnpm --filter @events-manager/web exec tsc --noEmit` passaram. `pnpm --filter @events-manager/web lint` continua com os
quatro erros anteriores da sidebar; os arquivos desta correção estão sem erros.

Conferência visual em Chromium com componentes reais e dados simulados, desktop 1280 px e celular 390 px: pendente sem
QR/código e com PDF bloqueado, pago com QR/PDF liberados, sem rolagem horizontal. Capturas em
[evidencias/ingressos-pagamento-pendente](evidencias/ingressos-pagamento-pendente).

## Compras agrupadas e parcelamento independente — 19/11/2026

A configuração do ingresso separa **Permitir parcelamento no cartão** (`allow_installments`,
`max_installments`) de **Permitir parcelamento no Pix** (`allow_pix_installments`, `max_pix_installments`,
`min_amount_for_pix_installments`). Boleto permanece à vista. O Pix exige habilitação explícita; a migration
não transforma automaticamente a permissão antiga de cartão em permissão para Pix. Planos Pix existentes
mantêm suas parcelas e vencimentos.

As migrations `202611190002_ticket_pix_installments.sql`, `202611190003_pix_ticket_release.sql` e
`202611190004_reconcile_overdue_pix_installments.sql` foram aplicadas no banco local. O gatilho do pedido
impede a liberação de um plano antes de todas as parcelas estarem pagas e somarem o total; a quitação define
`installment_plan_status=completed`. Webhook, reconciliação e confirmação de teste acionam a entrega por e-mail,
cuja regra continua aceitando somente pedidos pagos/gratuitos. Parcelas vencidas também podem ser quitadas.

`GET /api/user/purchases/:id` resolve o grupo da compra ou o pedido legado e devolve os ingressos acessíveis
à conta. O comprador vê os ingressos de todos os tipos adquiridos no mesmo checkout. O destinatário vê apenas
os ingressos recebidos, sem o histórico financeiro do comprador. Metadados internos do provedor não são expostos.
A listagem `/perfil?section=ingressos` apresenta um card por compra; a busca por um participante preserva as
outras unidades da mesma compra.

**Ver detalhes** abre `/perfil/ingressos/[purchaseId]`. A página mostra participantes, método de pagamento,
parcelas Pix pagas/vencidas/a vencer, saldo pendente, emissão do Pix de cada parcela e ingresso visual com QR
Code e PDF após pagamento e nomeação. Ao abrir a página, o QR Code e o Pix copia e cola da primeira parcela
em aberto aparecem automaticamente, inclusive quando vencida; parcelas pagas e canceladas são ignoradas.
Após a confirmação, a próxima parcela em aberto é apresentada. Atualizações periódicas não repetem a
solicitação nem reabrem um código fechado pelo comprador. Em caso de falha, **Pagar parcela** permite tentar
novamente. Compras quitadas, canceladas ou reembolsadas não solicitam cobranças. Um Pix ainda válido é reutilizado. O botão **Confirmar parcela de teste**
só aparece quando a API autoriza e a rota de simulação exige ambiente de desenvolvimento com gateway mock
ou credencial sandbox; a API verifica o pagamento no provedor antes de baixar a parcela. A reconciliação
não inventa tarifas nem saldo sacável.

No cartão, a página informa a quantidade de parcelas registrada na compra e explica que os pagamentos da
fatura são acompanhados pelo banco. A aprovação do cartão libera o ingresso. Compras antigas sem a quantidade
armazenada não recebem um parcelamento presumido. Boleto e Pix à vista são identificados explicitamente.

**Alterar participante** e **Informar participante** ficam dentro do card, junto aos dados do participante,
e são exclusivos de ingressos para terceiros. Quando falta o participante, o botão usa o violeta da marca
para destacar a ação; os controles de edição não aparecem no PDF baixado. O ingresso
marcado como `is_buyer` é protegido também na API (`BUYER_TICKET_LOCKED`), inclusive quando uma chamada direta
tenta alterá-lo. Cancelamento, reembolso e check-in também bloqueiam alterações. O indicador `purchased_by_me`
mantém a identificação do comprador independente da permissão de edição.

A confirmação do checkout mantém os confetes e passa a mostrar o ingresso real, com seu QR Code e download,
além do acesso aos detalhes da compra e aos outros participantes.

### Marca e alinhamento

Ilustração nova: `apps/web/public/illustrations/tickets/purchase-tickets.png`, criada com ImageGen a partir da
paleta do `Guia-da-marca.pdf`: violeta `#743DF5`, ameixa `#231A33`, damasco `#FFD09D`, névoa `#F3EEFF` e branco.
Prompt: “Premium compact 3D editorial illustration for Flouvi: a fan of three event admission tickets, front
ticket with an embossed checkmark medallion and decorative dotted motif, satin ribbon arcs, two confetti shapes;
transparent background, rounded matte clay material, soft studio lighting; brand palette only; no text, logo,
letters, digits or scannable QR.” O QR funcional é gerado separadamente a partir de `ticket_code`.

Páginas do perfil, detalhes da compra, configurações de recebimento e checkout utilizam o mesmo `Container`
do header e footer (`max-w-7xl`, espaçamento lateral compartilhado). Estados de confirmação e pagamento
pendente não impõem uma segunda largura máxima ao painel principal. A mesma correção foi aplicada às telas
legadas de parcelas. Campos e parágrafos internos podem ter largura de leitura própria.

Conferência na aplicação real, com conta e compra temporárias, nas páginas do perfil, compra e checkout: em 1440 px, header/conteúdo/footer ocupam as
bordas internas **112–1328 px**; em 390 px, **16–374 px**, sem rolagem horizontal. As fixtures foram removidas
após a verificação. Evidências em [evidencias/compra-parcelas](evidencias/compra-parcelas).
A prévia com componentes reais também exercitou nomeação de convidado, ausência de QR no plano parcial,
agrupamento, confirmação e download efetivo do PDF.

### Regressões e validação

Testes novos: `packages/contracts/src/ticket-installments.test.ts`,
`apps/api/test/pix-installment-payment.test.ts`, `pix-installment-routes.test.ts`,
`ticket-purchase-projection.test.ts`, `apps/web/src/features/tickets/purchases.test.ts`,
`components/PurchaseDetails.test.tsx`, `components/PurchasePayments.test.tsx` e
`supabase/tests/pix_installment_release.sql`. Os testes SQL são transacionais e fazem rollback.

Testes atualizados: `hosted-checkout`, `nominal-tickets`, `receiving-production-access`, `ticket-service`,
`ticket-delivery`, `user-tickets-routes` na API; `TicketFormSheet`, `PaymentMethodSection`, `EventCheckout`,
`MyTicketsContent`, `TransparentPaymentResult`, confirmação SSR e edição do assistente de eventos no frontend.

Comandos executados: `pnpm db:migrate`, `pnpm db:types`, `pnpm test` nos três pacotes,
`pnpm --filter @events-manager/web exec vitest run --coverage --maxWorkers=2`, `pnpm test:coverage` na API e
nos contratos, `pnpm lint` nos três pacotes, `pnpm build` na API e contratos e `pnpm exec tsc --noEmit` no web.
A primeira execução paralela do web teve timeouts; a execução com dois workers passou integralmente.

Cobertura sem regressão: API **81,07% / 77,15% / 83,35% / 83,18%**;
web **75,54% / 69,51% / 75,98% / 77,13%**; contratos **98,05% / 95,32% / 99,26% / 98,99%**
(statements / branches / functions / lines). As catracas globais preexistentes da API/web ainda falham e não
foram reduzidas. O lint do web permanece com os quatro erros preexistentes de `AdminSidebar`, `SidebarSubmenu`
e `sidebar.test`; os arquivos desta entrega estão sem erros.

Suítes concluídas: **1.177 testes de API**, **1.069 testes web** e **356 testes dos contratos**, todos aprovados.

### Controles de parcelamento no formulário

As opções de cartão e Pix usam switches independentes, com descrição à esquerda e controle à direita.
Os testes existentes em `TicketFormSheet.test.tsx` e `EventCreationWizard.edit.test.tsx` foram atualizados
para localizar o papel acessível `switch`; o teste de Pix falhou antes da troca e passou após a implementação.
Os dois arquivos somam **27 testes aprovados**. A prévia no navegador validou teclado, independência dos
controles e ausência de rolagem horizontal no celular; imagens em `evidencias/compra-parcelas/toggles-*.png`.

Validação: Prettier nos três arquivos alterados, ESLint direcionado, `pnpm --filter @events-manager/web exec tsc --noEmit`,
`pnpm --filter @events-manager/web lint` e
`pnpm --filter @events-manager/web exec vitest run --coverage --maxWorkers=4 --testTimeout=15000`.
Os **1.069 testes web passaram**; a cobertura global ficou em **75,54% / 69,58% / 75,96% / 77,14%**
(statements / branches / functions / lines), ainda abaixo das catracas preexistentes. Os limites foram preservados.

### Destaque da prévia de valores

`TicketFeeSummary` usa névoa, violeta, ameixa e damasco do manual da marca, inclusive no tema neutro do
admin. O valor recebido ganha um painel violeta; taxas e aviso de estimativa ficam em uma área separada.
O botão de detalhes acompanha a paleta. O layout empilha os valores quando o espaço disponível diminui.
Evidências: `evidencias/compra-parcelas/fee-preview-{desktop,mobile,form}.png`.

Teste atualizado: `apps/web/src/features/tickets/components/TicketFeeSummary.test.tsx`, com o título
acessível “Prévia por ingresso” verificado antes da implementação (Red) e depois (Green).
Os testes de `TicketFeeSummary`, `TicketOrganizationFees` e `TicketFormSheet` passaram (**12 testes**).
O navegador confirmou os valores de R$ 50,90 / R$ 49,10, abertura dos detalhes e ausência de rolagem
horizontal em 320, 390 e 1440 px.

Comandos: Prettier e ESLint nos três arquivos alterados; `pnpm --filter @events-manager/web exec tsc --noEmit`;
`pnpm --filter @events-manager/web exec vitest run src/features/tickets/components/TicketFeeSummary.test.tsx src/features/tickets/components/TicketOrganizationFees.test.tsx src/features/tickets/components/TicketFormSheet.test.tsx`;
`pnpm --filter @events-manager/web lint`; e
`pnpm --filter @events-manager/web exec vitest run --coverage --maxWorkers=4 --testTimeout=15000`.
O lint direcionado e o TypeScript passaram; o lint global mantém os mesmos quatro erros preexistentes de sidebar.
Suíte completa: **1.069 testes aprovados**; cobertura inalterada em **75,54% / 69,58% / 75,96% / 77,14%**,
com as mesmas catracas globais pendentes.

### Pix automático e participante no card

Testes de regressão em `apps/web/src/features/tickets/components/PurchasePayments.test.tsx` e
`PurchaseDetails.test.tsx`: abertura automática da primeira parcela pendente/vencida, escolha da próxima
parcela ainda não paga, reutilização da visualização durante o polling, fechamento voluntário, recuperação
após erro e bloqueio em compras quitadas/canceladas/reembolsadas. O fluxo de nomeação também verifica a ação
junto aos dados do participante, sua atualização após salvar e a ausência de edição no ingresso do comprador.
O ciclo Red reproduziu as falhas antes da alteração; os **18 testes específicos passaram** após a correção.

O navegador validou os componentes reais com respostas simuladas da API em **390, 768 e 1440 px**, sem
rolagem horizontal: Pix da primeira parcela visível sem clique, QR de entrada bloqueado até a quitação,
botão violeta dentro do card e edição do participante funcionando. Evidências em
`evidencias/compra-parcelas/pix-automatico-*.png`, `participante-no-ingresso-*.png` e
`pix-automatico-validacao.json`.

Comandos desta alteração:

- `pnpm --filter @events-manager/web exec vitest run src/features/tickets/components/PurchasePayments.test.tsx src/features/tickets/components/PurchaseDetails.test.tsx`
- `pnpm --filter @events-manager/web exec prettier --write src/features/tickets/components/PurchasePayments.tsx src/features/tickets/components/PurchasePayments.test.tsx src/features/tickets/components/PurchaseDetails.test.tsx src/features/tickets/components/TicketPass.tsx`
- `pnpm --filter @events-manager/web exec eslint src/features/tickets/components/PurchasePayments.tsx src/features/tickets/components/PurchasePayments.test.tsx src/features/tickets/components/PurchaseDetails.test.tsx src/features/tickets/components/TicketPass.tsx`
- `pnpm --filter @events-manager/web exec tsc --noEmit`
- `pnpm --filter @events-manager/web lint`
- `pnpm --filter @events-manager/web test:coverage --maxWorkers=4 --testTimeout=15000`

Resultado: **1.084 testes passaram em 237 arquivos**. ESLint dos arquivos alterados e TypeScript passaram.
Cobertura global: **75,73% / 69,82% / 76,08% / 77,31%** (statements / branches / functions / lines),
acima da medição anterior em todas as métricas. O comando de cobertura ainda falha nas catracas globais
preexistentes de statements, branches e functions; nenhum limite foi alterado. O lint geral mantém somente
os quatro erros preexistentes de `AdminSidebar.tsx`, `SidebarSubmenu.tsx` e `sidebar.test.tsx`.
