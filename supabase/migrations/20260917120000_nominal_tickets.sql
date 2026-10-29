-- Ingressos nominais: uma linha por unidade comprada.
--
-- Até aqui uma compra de 5 meias-entradas era uma única inscrição com
-- quantidade 5, um único código e os dados de uma só pessoa (quem comprou).
-- Isso não sustenta ingresso nominal: cinco pessoas na porta com o mesmo
-- código, um check-in só, um e-mail só.
--
-- A inscrição (`event_registrations`) passa a ser o pedido: quem comprou,
-- pagou, cupom e comprovante. Cada unidade vira uma linha aqui, com código
-- próprio, participante próprio (ou pendente, até quem comprou nomear) e
-- check-in próprio. O estado de pagamento continua no pedido; o ingresso
-- herda o estado dele.

create table public.registration_tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid references public.event_tickets(id) on delete set null,
  -- Posição da unidade dentro do pedido (1..quantidade).
  sequence integer not null check (sequence > 0),
  ticket_code text not null,
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  attendee_document text,
  -- Este ingresso é de quem comprou.
  is_buyer boolean not null default false,
  named_at timestamptz,
  -- Valores rateados por unidade, para reembolso e relatório por ingresso.
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  service_fee numeric(12,2) not null default 0 check (service_fee >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  check_in_date timestamptz,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now()),
  constraint registration_tickets_code_key unique (ticket_code),
  constraint registration_tickets_sequence_key unique (registration_id, sequence),
  -- Ou o ingresso tem nome e e-mail, ou está pendente. Nunca metade.
  constraint registration_tickets_attendee_complete check (
    (attendee_name is null and attendee_email is null)
    or (attendee_name is not null and attendee_email is not null)
  )
);

comment on table public.registration_tickets is
  'Uma unidade de ingresso, nominal, dentro de um pedido (event_registrations).';
comment on column public.registration_tickets.attendee_name is
  'Nulo enquanto quem comprou ainda não informou o participante.';

create index registration_tickets_registration_id_idx on public.registration_tickets(registration_id);
create index registration_tickets_event_id_idx on public.registration_tickets(event_id);
create index registration_tickets_ticket_type_id_idx on public.registration_tickets(ticket_type_id);
create index registration_tickets_attendee_email_idx on public.registration_tickets(lower(attendee_email));

create trigger registration_tickets_updated_at
  before update on public.registration_tickets
  for each row execute procedure public.set_updated_at();

-- Backfill: cada pedido existente vira `quantity` ingressos. A primeira
-- unidade fica com quem comprou e mantém o código já enviado por e-mail; as
-- demais ficam pendentes de nome, com códigos novos. O check-in feito no
-- pedido passa para a primeira unidade.
insert into public.registration_tickets (
  registration_id, event_id, ticket_type_id, sequence, ticket_code,
  attendee_name, attendee_email, attendee_phone, attendee_document,
  is_buyer, named_at, unit_price, service_fee, discount, total_amount,
  check_in_date, date_created
)
select
  r.id,
  r.event_id,
  r.ticket_type_id,
  s.sequence,
  case
    when s.sequence = 1 and r.ticket_code is not null then r.ticket_code
    else 'EVT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
  end,
  case when s.sequence = 1 then r.participant_name end,
  case when s.sequence = 1 then r.participant_email end,
  case when s.sequence = 1 then r.participant_phone end,
  case when s.sequence = 1 then r.participant_document end,
  s.sequence = 1,
  case when s.sequence = 1 then r.date_created end,
  coalesce(r.unit_price, 0),
  round(coalesce(r.service_fee, 0) / greatest(r.quantity, 1), 2),
  round(coalesce((r.additional_info ->> 'coupon_discount')::numeric, 0) / greatest(r.quantity, 1), 2),
  round(coalesce(r.total_amount, 0) / greatest(r.quantity, 1), 2),
  case when s.sequence = 1 then r.check_in_date end,
  r.date_created
from public.event_registrations r
cross join lateral generate_series(1, greatest(r.quantity, 1)) as s(sequence);

-- Leitura: quem comprou, quem foi nomeado (pelo e-mail da conta), o
-- organizador do evento e a administração. Escrita só pela API (service role).
alter table public.registration_tickets enable row level security;

create policy read_registration_tickets on public.registration_tickets for select to authenticated using (
  exists (
    select 1 from public.event_registrations r
    where r.id = registration_id and r.user_id = (select auth.uid())
  )
  or (attendee_email is not null and lower(attendee_email) = lower(coalesce((select auth.jwt()) ->> 'email', '')))
  or public.owns_event(event_id)
  or public.is_admin()
);

grant select on public.registration_tickets to authenticated;
revoke insert, update, delete on public.registration_tickets from anon, authenticated;
