# Ingressos nominais

Desde 17/09/2026 cada unidade comprada é um ingresso próprio. Este documento
descreve o modelo, os fluxos e as regras que a API aplica.

## Modelo

- `event_registrations` é o **pedido**: quem comprou (`participant_*`), o
  pagamento (`payment_status`, `payment_method`, `receipt_url`), o cupom em
  `additional_info` e a quantidade. Uma compra com dois tipos de ingresso gera
  dois pedidos ligados pelo `checkout_group_id`.
- `registration_tickets` é o **ingresso**: uma linha por unidade, com
  `sequence` (1..quantidade), `ticket_code` único, participante
  (`attendee_name`, `attendee_email`, `attendee_phone`, `attendee_document`),
  `is_buyer`, `named_at`, valores rateados ao centavo (`unit_price`,
  `service_fee`, `discount`, `total_amount`) e `check_in_date`.
- O ingresso não tem estado de pagamento próprio: herda o do pedido. O
  check-in é por ingresso.
- Um ingresso está **nomeado** (nome e e-mail) ou **pendente** (ambos nulos);
  a constraint `registration_tickets_attendee_complete` impede meio-termo.
- Migração `20260917120000_nominal_tickets.sql`. O backfill converteu cada
  pedido existente em `quantity` ingressos: a primeira unidade ficou com quem
  comprou e manteve o código já enviado por e-mail; as demais ficaram
  pendentes.

## Checkout

`POST /api/payments/checkout` aceita, em cada item de `tickets`, uma lista
opcional `attendees` com um participante por unidade (`{ name, email,
document?, phone? }`) ou `null` para deixar a unidade pendente. Sem a lista, a
primeira unidade fica com quem compra. O contrato é `checkoutTicketSelectionSchema`
em `packages/contracts`.

Na tela, os dados do comprador (nome, e-mail, CPF e telefone) vêm do perfil
autenticado e são somente leitura nas etapas de dados e pagamento. A API confere
esses dados com o perfil e rejeita divergências, inclusive no parcelamento Pix.
Para completar ou corrigir o cadastro, a pessoa abre **Atualizar meu perfil** e
depois usa **Atualizar dados do perfil** no checkout, preservando o carrinho.
Cartão e boleto só podem avançar quando os dados exigidos estiverem no perfil.

O comprador e o participante são independentes. A etapa "Seus dados" mostra
um cartão por unidade com "Este ingresso é para mim" (uma unidade por vez),
campos para outra pessoa e "Preencher depois". Nesta última opção, a unidade
fica **Pendente de nomeação**, com participante e `named_at` nulos; os dados
do comprador continuam no pedido. Após a compra, o comprador informa quem
usará o ingresso em **Meus ingressos → Informar participante**. A nomeação
nunca altera os dados do comprador ou seu perfil.

O parcelamento via Pix (`POST /api/checkout/installments`) também recebe
`attendees`, com uma entrada por unidade. Ele preserva participantes nomeados
e unidades pendentes. Sem a lista, mantém a compatibilidade: primeira unidade
com quem compra e demais pendentes.

## Entrega por e-mail

`DeliverTickets` (`apps/api/src/application/tickets/deliver-tickets.ts`) envia,
para pedidos pagos ou gratuitos:

- um **recibo da compra** por checkout para quem comprou, listando todos os
  ingressos, inclusive os pendentes (template `purchase-confirmation`, chave
  `purchase-confirmation-<checkout_group_id>`);
- o **ingresso nominal** para cada participante com e-mail diferente do de
  quem comprou (template `attendee-ticket`, chave
  `attendee-ticket-<ticket_id>-<email>`).

Dispara em quatro pontos: compra simulada ou gratuita, webhook
`checkout.completed`, liquidação pela consulta de status na volta do provedor e
reconciliação periódica. As chaves de idempotência garantem uma mensagem por
pessoa mesmo com vários disparos. Falha de e-mail nunca derruba a confirmação
do pagamento. Nomear um ingresso pendente de um pedido já pago dispara o e-mail
da pessoa na hora. Parcelas via Pix ainda não disparam a entrega ao concluir o
plano.

## Área da pessoa

- `GET /api/user/tickets` devolve `NominalTicket[]`: os ingressos que a pessoa
  comprou e os que outra pessoa comprou em nome dela (e-mail da conta igual ao
  do participante). Ninguém precisa criar conta para receber um ingresso; ao
  criar, ele aparece.
- `PATCH /api/user/tickets/:id/attendee` nomeia ou corrige o participante. Só
  quem comprou pode, até o check-in e enquanto o pedido não estiver cancelado.
- Ingressos sem participante mostram **Pendente de nomeação**, sem QR de
  entrada nem download do PDF. Nomear libera essas ações; o check-in continua
  exigindo também pagamento confirmado.

## Painel do organizador

`/api/admin/participantes` lista **um ingresso por linha** com o pedido, o
evento e o tipo. Check-in, edição do participante e reenvio de e-mail são por
ingresso (o id nas rotas é o do ingresso). Cancelamento continua sendo do
**pedido inteiro**: a rota aceita o id do ingresso e resolve o pedido. O
check-in exige participante nomeado e pedido pago. **Depois do check-in o
ingresso é imutável**: nem quem comprou nem o organizador alteram o
participante (a API responde 409 `TICKET_CHECKED_IN`); para corrigir, o
organizador desfaz o check-in primeiro. A ordenação por status do
pedido não atravessa a relação no PostgREST e cai na data de compra.

## Limitações conhecidas

- O perfil (avatar) de quem comprou não é embutido na resposta: `user_id`
  aponta para `auth.users`, sem chave estrangeira para `profiles`.
- Limite de compra continua sendo por pedido, não por CPF.

## Regressões do comprador e da nomeação

Testes desta alteração:

- API: `apps/api/test/transparent-routes.test.ts` e `apps/api/test/nominal-tickets.test.ts`.
- Checkout: `apps/web/src/components/events/EventCheckout.test.tsx`,
  `apps/web/src/app/(checkout)/eventos/[slug]/checkout/page.test.tsx`,
  `apps/web/src/features/checkout/components/TransparentCheckoutForm.test.tsx` e
  `apps/web/src/features/checkout/components/AttendeeCards.test.tsx`.
- Área de ingressos: `apps/web/src/components/tickets/TicketDetailsModal.test.tsx`
  e `apps/web/src/components/tickets/MyTicketsContent.test.tsx`.

Validação: `pnpm test:coverage` e `pnpm lint` em `apps/api` e `apps/web`,
`pnpm exec tsc --noEmit` no frontend e `pnpm build` na API. A cobertura global
já estava abaixo das catracas; os limites foram preservados. Evidências visuais
em `docs/evidencias/checkout-nomeacao/`.
