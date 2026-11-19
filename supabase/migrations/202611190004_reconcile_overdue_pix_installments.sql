-- A paid overdue installment completes the plan exactly like an on-time installment.
create or replace function public.settle_reconciled_installment(
  target_charge_id text,
  target_installment_id uuid,
  target_registration_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  installment_amount numeric(12, 2);
  paid_total numeric(12, 2);
begin
  perform public.reserve_registration_inventory(array[target_registration_id]);

  update public.payment_installments i
  set status = 'paid',
      paid_at = pg_catalog.now(),
      payment_confirmed_at = pg_catalog.now(),
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where i.id = target_installment_id
    and i.registration_id = target_registration_id
    and i.provider_transaction_id = target_charge_id
    and i.status in ('pending', 'overdue')
  returning i.amount into installment_amount;

  if installment_amount is null then
    return;
  end if;

  select coalesce(sum(i.amount) filter (where i.status = 'paid'), 0)
  into paid_total
  from public.payment_installments i
  where i.registration_id = target_registration_id;

  update public.event_registrations r
  set status = case when paid_total >= r.total_amount then 'confirmed' else 'partial_payment' end,
      payment_status = case when paid_total >= r.total_amount then 'paid' else 'pending' end,
      payment_amount = least(r.total_amount, paid_total),
      provider_transaction_id = target_charge_id,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = target_registration_id;

  insert into public.payment_transactions (
    registration_id,
    provider,
    provider_event_id,
    provider_object_id,
    event_type,
    amount,
    provider_fee,
    platform_fee,
    organizer_net,
    status,
    metadata
  ) values (
    target_registration_id,
    'abacatepay',
    'transparent.completed:' || target_charge_id || ':' || target_installment_id::text,
    target_charge_id,
    'transparent.reconciled_paid',
    installment_amount,
    0,
    0,
    0,
    'pending',
    pg_catalog.jsonb_build_object('source', 'provider_status_reconciliation')
  )
  on conflict (provider_event_id) where provider_event_id is not null
  do nothing;
end;
$$;
