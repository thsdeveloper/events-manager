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

Na tela, a etapa "Seus dados" mostra um cartão por unidade com "Este ingresso
é para mim" (uma unidade por vez) e "Preencher depois".

O parcelamento via Pix (`POST /api/checkout/installments`) ainda não recebe
participantes: a primeira unidade fica com quem compra e as demais pendentes.

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
