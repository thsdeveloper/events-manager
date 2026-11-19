-- All payment entry points must obey the same Pix-plan release condition.
create or replace function public.enforce_pix_plan_release()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  paid_count integer;
  paid_total numeric;
begin
  if not coalesce(new.is_installment_payment, false)
     or new.status = 'cancelled' or new.payment_status = 'refunded' then
    return new;
  end if;
  select count(*) filter (where status = 'paid'),
         coalesce(sum(amount) filter (where status = 'paid'), 0)
  into paid_count, paid_total
  from public.payment_installments where registration_id = new.id;
  new.payment_amount := least(new.total_amount, paid_total);
  if paid_count >= coalesce(new.total_installments, 2) and paid_total >= new.total_amount then
    new.status := 'confirmed';
    new.payment_status := 'paid';
    new.installment_plan_status := 'completed';
  else
    new.status := 'partial_payment';
    new.payment_status := 'pending';
    new.installment_plan_status := 'active';
  end if;
  return new;
end $$;

create trigger enforce_pix_plan_release
before update of status, payment_status, payment_amount on public.event_registrations
for each row execute function public.enforce_pix_plan_release();

-- Re-evaluate existing plans without changing their charges or due dates.
update public.event_registrations set payment_status = payment_status
where is_installment_payment and status <> 'cancelled' and payment_status is distinct from 'refunded';
