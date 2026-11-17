begin;

-- Preserve the effective intersection of the old two windows. Disjoint windows
-- were never available and stay unavailable instead of accidentally opening sales.
with periods as (
  select t.id,
    greatest(t.sale_start_date, e.registration_start) as opens_at,
    least(t.sale_end_date, e.registration_end) as closes_at
  from public.event_tickets t join public.events e on e.id = t.event_id
  where e.registration_start is not null or e.registration_end is not null
)
update public.event_tickets t set
  sale_start_date = case when p.closes_at <= p.opens_at then t.sale_start_date else p.opens_at end,
  sale_end_date = case when p.closes_at <= p.opens_at then t.sale_end_date else p.closes_at end,
  status = case when p.closes_at <= p.opens_at then 'inactive' else t.status end
from periods p where t.id = p.id;

update public.events set registration_start = null, registration_end = null
where registration_start is not null or registration_end is not null;

-- Retain nullable columns for read compatibility, but forbid reintroducing a
-- second rule through old clients. The application rejects these writes with 422.
alter table public.events add constraint events_sales_period_on_tickets_only
  check (registration_start is null and registration_end is null);
comment on column public.events.registration_start is 'Retired: configure event_tickets.sale_start_date.';
comment on column public.events.registration_end is 'Retired: configure event_tickets.sale_end_date.';

commit;
