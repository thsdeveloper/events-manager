-- Credit keeps the legacy fields. Pix requires its own explicit opt-in.
alter table public.event_tickets
  add column allow_pix_installments boolean not null default false,
  add column max_pix_installments integer,
  add column min_amount_for_pix_installments numeric not null default 0,
  add constraint event_tickets_pix_installments_limit check (
    (max_pix_installments is null or max_pix_installments between 2 and 12)
    and (not allow_pix_installments or max_pix_installments is not null)
    and min_amount_for_pix_installments >= 0
  );

comment on column public.event_tickets.allow_installments is 'Permite parcelamento no cartão de crédito.';
comment on column public.event_tickets.allow_pix_installments is 'Permite plano Pix mensal; libera ingresso após quitação integral.';
