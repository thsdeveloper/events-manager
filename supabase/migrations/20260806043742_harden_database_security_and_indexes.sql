-- Keep privileged database operations behind the Fastify API. The service role is
-- the only caller of this RPC and already bypasses RLS, so SECURITY DEFINER is
-- unnecessary and would only widen the attack surface.
alter function public.increment_ticket_sales(uuid, integer) security invoker;

revoke execute on all functions in schema public from public, anon, authenticated, service_role;
grant execute on function public.increment_ticket_sales(uuid, integer) to service_role;

-- These helpers are evaluated by RLS policies. They expose only authorization
-- booleans and always bind their lookup to the authenticated user.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

create or replace function public.owns_event(target_event uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.organizers o on o.id = e.organizer_id
    where e.id = target_event
      and o.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
      and status = 'active'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_event(uuid) to anon, authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- Future functions start closed. Migrations must grant each callable RPC
-- explicitly to the minimum required role.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated, service_role;

-- Cross-replica throttling for costly and anonymous API operations. Keeping
-- counters in a non-exposed schema avoids leaking request fingerprints through
-- the Data API while a single upsert serializes each key/window atomically.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.api_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  hits integer not null check (hits > 0)
);
create index if not exists api_rate_limits_window_idx
  on private.api_rate_limits(window_started_at);

revoke all on table private.api_rate_limits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  target_key text,
  target_limit integer,
  target_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if target_key is null
     or pg_catalog.length(target_key) > 200
     or target_limit < 1
     or target_window_seconds < 1 then
    raise exception 'invalid rate limit configuration';
  end if;

  if pg_catalog.random() < 0.01 then
    delete from private.api_rate_limits
    where window_started_at < pg_catalog.now() - interval '1 day';
  end if;

  insert into private.api_rate_limits as rate_limit (key, window_started_at, hits)
  values (target_key, pg_catalog.now(), 1)
  on conflict (key) do update
  set window_started_at = case
        when rate_limit.window_started_at <= pg_catalog.now() - pg_catalog.make_interval(secs => target_window_seconds)
          then pg_catalog.now()
        else rate_limit.window_started_at
      end,
      hits = case
        when rate_limit.window_started_at <= pg_catalog.now() - pg_catalog.make_interval(secs => target_window_seconds)
          then 1
        else rate_limit.hits + 1
      end
  returning rate_limit.hits <= target_limit into allowed;

  return allowed;
end;
$$;

revoke execute on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;

-- All mutations are performed by Fastify after application-level checks.
-- Authenticated browser JWTs remain read-only even if a client is introduced.
revoke insert, update, delete on all tables in schema public from authenticated;
alter default privileges in schema public revoke insert, update, delete on tables from authenticated;

-- The browser never reads PostgREST directly. Public content is selected by
-- explicit API repositories, so Data API table reads remain closed as well.
revoke select on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke select on tables from anon, authenticated;

-- Public form and checkout writes go through Fastify, where their payload,
-- relationships, rate limits and payment invariants are validated.
drop policy if exists anyone_submit_forms on public.form_submissions;
drop policy if exists anyone_submit_form_values on public.form_submission_values;
drop policy if exists create_registrations on public.event_registrations;
drop policy if exists public_read_event_config on public.event_configurations;

-- Cache auth.uid() once per statement instead of evaluating it for every row.
alter policy user_insert_media on public.media_files
  with check (uploaded_by = (select auth.uid()));
alter policy user_manage_media on public.media_files
  using (uploaded_by = (select auth.uid()) or (select public.is_admin()))
  with check (uploaded_by = (select auth.uid()) or (select public.is_admin()));
alter policy read_own_profile on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()));
alter policy update_own_profile on public.profiles
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
alter policy public_read_pages on public.pages
  using (status = 'published' or (select public.is_admin()));
alter policy public_read_posts on public.posts
  using (status = 'published' or author = (select auth.uid()) or (select public.is_admin()));
alter policy public_read_navigation on public.navigation
  using (is_active or (select public.is_admin()));
alter policy public_read_page_blocks on public.page_blocks
  using (not hide_block or (select public.is_admin()));
alter policy public_read_forms on public.forms
  using (is_active or (select public.is_admin()));
alter policy read_organizers on public.organizers
  using (status = 'active' or user_id = (select auth.uid()) or (select public.is_admin()));
alter policy create_organizer on public.organizers
  with check (user_id = (select auth.uid()));
alter policy update_organizer on public.organizers
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
alter policy read_events on public.events
  using (status = 'published' or (select public.owns_event(id)) or (select public.is_admin()));
alter policy create_events on public.events
  with check (
    exists (
      select 1
      from public.organizers o
      where o.id = organizer_id
        and o.user_id = (select auth.uid())
        and o.status = 'active'
    )
    or (select public.is_admin())
  );
alter policy update_events on public.events
  using ((select public.owns_event(id)) or (select public.is_admin()))
  with check ((select public.owns_event(id)) or (select public.is_admin()));
alter policy delete_events on public.events
  using ((select public.owns_event(id)) or (select public.is_admin()));
alter policy read_tickets on public.event_tickets
  using (
    (
      status = 'active'
      and visibility = 'public'
      and exists (
        select 1
        from public.events e
        where e.id = event_id
          and e.status = 'published'
      )
    )
    or (select public.owns_event(event_id))
    or (select public.is_admin())
  );
alter policy manage_tickets on public.event_tickets
  using ((select public.owns_event(event_id)) or (select public.is_admin()))
  with check ((select public.owns_event(event_id)) or (select public.is_admin()));
alter policy read_registrations on public.event_registrations
  using (
    user_id = (select auth.uid())
    or (select public.owns_event(event_id))
    or (select public.is_admin())
  );
alter policy manage_registrations on public.event_registrations
  using (
    user_id = (select auth.uid())
    or (select public.owns_event(event_id))
    or (select public.is_admin())
  )
  with check (
    user_id = (select auth.uid())
    or (select public.owns_event(event_id))
    or (select public.is_admin())
  );
alter policy read_installments on public.payment_installments
  using (
    exists (
      select 1
      from public.event_registrations r
      where r.id = registration_id
        and (
          r.user_id = (select auth.uid())
          or (select public.owns_event(r.event_id))
        )
    )
    or (select public.is_admin())
  );
alter policy read_transactions on public.payment_transactions
  using (
    exists (
      select 1
      from public.event_registrations r
      where r.id = registration_id
        and (
          r.user_id = (select auth.uid())
          or (select public.owns_event(r.event_id))
        )
    )
    or (select public.is_admin())
  );
alter policy read_own_organizer_payouts on public.organizer_payouts
  using (
    (select public.is_super_admin())
    or exists (
      select 1
      from public.organizers o
      where o.id = organizer_id
        and o.user_id = (select auth.uid())
    )
  );
alter policy super_admin_manage_payouts on public.organizer_payouts
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));
alter policy super_admin_read_audit_logs on public.audit_logs
  using ((select public.is_super_admin()));
alter policy super_admin_insert_audit_logs on public.audit_logs
  with check ((select public.is_super_admin()) and actor_id = (select auth.uid()));

alter policy authenticated_upload_storage on storage.objects
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
alter policy owner_manage_storage on storage.objects
  using (bucket_id = 'media' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'media' and owner_id = (select auth.uid())::text);

-- Domain invariants belong in Postgres as a final line of defense, including
-- calls made by privileged API clients and future maintenance scripts.
alter table public.events
  add constraint events_registration_dates_valid
  check (registration_start is null or registration_end is null or registration_end > registration_start);

alter table public.event_tickets
  add constraint event_tickets_sale_dates_valid
  check (sale_start_date is null or sale_end_date is null or sale_end_date > sale_start_date),
  add constraint event_tickets_purchase_limits_valid
  check (min_quantity_per_purchase > 0 and max_quantity_per_purchase >= min_quantity_per_purchase),
  add constraint event_tickets_buyer_price_valid
  check (buyer_price is null or buyer_price >= 0),
  add constraint event_tickets_installments_valid
  check (
    not allow_installments
    or (
      max_installments is not null
      and max_installments between 2 and 12
      and (min_amount_for_installments is null or min_amount_for_installments >= 0)
    )
  );

alter table public.event_registrations
  add column inventory_reserved boolean not null default false,
  add column reconciliation_checked_at timestamptz,
  add constraint registrations_inventory_reservation_valid
  check (not inventory_reserved or ticket_type_id is not null),
  add constraint registrations_amounts_valid
  check (
    (payment_amount is null or payment_amount >= 0)
    and (unit_price is null or unit_price >= 0)
    and (service_fee is null or service_fee >= 0)
    and (total_amount is null or total_amount >= 0)
    and provider_fee >= 0
    and platform_fee >= 0
  );

alter table public.payment_installments
  add constraint payment_installments_sequence_valid
  check (total_installments between 2 and 12 and installment_number between 1 and total_installments),
  add constraint payment_installments_amount_valid
  check (amount > 0);

alter table public.payment_transactions
  add constraint payment_transactions_amounts_valid
  check (
    (amount is null or amount >= 0)
    and provider_fee >= 0
    and platform_fee >= 0
    and organizer_net >= 0
  );

-- Existing quantity_sold values were maintained from registrations. Make that
-- relationship explicit before the idempotent reservation RPC starts serving
-- webhook retries, otherwise an old paid registration could be counted twice.
update public.event_registrations
set inventory_reserved = true
where ticket_type_id is not null
  and status in ('confirmed', 'pending', 'partial_payment', 'payment_overdue', 'checked_in');

with reserved_inventory as (
  select r.ticket_type_id, sum(r.quantity)::integer as sold
  from public.event_registrations r
  where r.inventory_reserved
  group by r.ticket_type_id
)
update public.event_tickets t
set quantity_sold = coalesce(inventory.sold, 0),
    status = case
      when t.status = 'inactive' then 'inactive'
      when coalesce(inventory.sold, 0) >= t.quantity then 'sold_out'
      when t.status = 'sold_out' then 'active'
      else t.status
    end,
    date_updated = pg_catalog.timezone('utc', pg_catalog.now())
from (
  select tickets.id, reserved_inventory.sold
  from public.event_tickets tickets
  left join reserved_inventory on reserved_inventory.ticket_type_id = tickets.id
) inventory
where t.id = inventory.id;

-- Reserve every registration in a checkout in one transaction. Tickets are
-- locked in UUID order so concurrent multi-ticket checkouts cannot deadlock or
-- oversell. The registration flag makes retries and duplicate webhooks safe.
create or replace function public.reserve_registration_inventory(target_registrations uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  registration_count integer;
  ticket_to_lock uuid;
begin
  if target_registrations is null or cardinality(target_registrations) = 0 then
    raise exception 'registration inventory target is required';
  end if;

  select count(*)
  into expected_count
  from (select distinct id from pg_catalog.unnest(target_registrations) as ids(id)) requested;

  select count(*)
  into registration_count
  from public.event_registrations r
  where r.id = any(target_registrations);

  if registration_count <> expected_count
     or exists (
       select 1
       from public.event_registrations r
       where r.id = any(target_registrations)
         and r.ticket_type_id is null
     ) then
    raise exception 'registration inventory target not found';
  end if;

  for ticket_to_lock in
    select distinct r.ticket_type_id
    from public.event_registrations r
    where r.id = any(target_registrations)
      and not r.inventory_reserved
    order by r.ticket_type_id
  loop
    perform 1
    from public.event_tickets t
    where t.id = ticket_to_lock
    for update;
  end loop;

  if exists (
    select 1
    from (
      select
        t.quantity,
        t.quantity_sold,
        t.status,
        sum(r.quantity)::integer as requested_quantity
      from public.event_registrations r
      join public.event_tickets t on t.id = r.ticket_type_id
      where r.id = any(target_registrations)
        and not r.inventory_reserved
      group by t.id, t.quantity, t.quantity_sold, t.status
    ) inventory
    where inventory.status <> 'active'
       or inventory.quantity_sold + inventory.requested_quantity > inventory.quantity
  ) then
    raise exception 'ticket inventory unavailable';
  end if;

  with requested as (
    select r.ticket_type_id, sum(r.quantity)::integer as requested_quantity
    from public.event_registrations r
    where r.id = any(target_registrations)
      and not r.inventory_reserved
    group by r.ticket_type_id
  )
  update public.event_tickets t
  set quantity_sold = t.quantity_sold + requested.requested_quantity,
      status = case
        when t.quantity_sold + requested.requested_quantity >= t.quantity then 'sold_out'
        else t.status
      end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  from requested
  where t.id = requested.ticket_type_id;

  update public.event_registrations
  set inventory_reserved = true,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where id = any(target_registrations)
    and not inventory_reserved;
end;
$$;

-- Claim old pending checkouts in bounded batches. The advisory lock prevents
-- multiple API replicas from polling the same provider checkout concurrently;
-- reconciliation_checked_at provides a retry cooldown after the transaction.
create or replace function public.claim_pending_checkout_reconciliations(
  target_before timestamptz,
  target_batch_size integer default 25
)
returns table(checkout_id text, registration_ids uuid[])
language plpgsql
security invoker
set search_path = ''
as $$
declare
  checkout_to_claim record;
  claimed_ids uuid[];
begin
  if target_batch_size < 1 or target_batch_size > 100 then
    raise exception 'reconciliation batch size must be between 1 and 100';
  end if;

  for checkout_to_claim in
    select
      r.provider_checkout_id as id,
      min(r.date_created) as created_at
    from public.event_registrations r
    where r.inventory_reserved
      and r.payment_status = 'pending'
      and r.provider_checkout_id is not null
      and r.date_created < target_before
      and (
        r.reconciliation_checked_at is null
        or r.reconciliation_checked_at < pg_catalog.now() - interval '5 minutes'
      )
    group by r.provider_checkout_id
    order by created_at
    limit target_batch_size
  loop
    if pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended(checkout_to_claim.id, 742846329)
    ) then
      update public.event_registrations r
      set reconciliation_checked_at = pg_catalog.now(),
          date_updated = pg_catalog.timezone('utc', pg_catalog.now())
      where r.provider_checkout_id = checkout_to_claim.id
        and r.inventory_reserved
        and r.payment_status = 'pending';

      select pg_catalog.array_agg(r.id order by r.id)
      into claimed_ids
      from public.event_registrations r
      where r.provider_checkout_id = checkout_to_claim.id
        and r.inventory_reserved
        and r.payment_status = 'pending';

      if cardinality(claimed_ids) > 0 then
        checkout_id := checkout_to_claim.id;
        registration_ids := claimed_ids;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

-- Provider status transitions and inventory changes happen in the same
-- transaction. A PAID reconciliation records a non-payable pending ledger
-- entry; the signed webhook later supplies the final provider fee and makes it
-- payable using the same deterministic provider_event_id.
create or replace function public.settle_reconciled_checkout(
  target_checkout_id text,
  target_registrations uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.reserve_registration_inventory(target_registrations);

  update public.event_registrations r
  set status = 'confirmed',
      payment_status = 'paid',
      provider_transaction_id = target_checkout_id,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = any(target_registrations)
    and r.provider_checkout_id = target_checkout_id;

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
  )
  select
    r.id,
    'abacatepay',
    'checkout.completed:' || target_checkout_id || ':' || r.id::text,
    target_checkout_id,
    'checkout.reconciled_paid',
    r.total_amount,
    0,
    r.platform_fee,
    0,
    'pending',
    pg_catalog.jsonb_build_object('source', 'provider_status_reconciliation')
  from public.event_registrations r
  where r.id = any(target_registrations)
    and r.provider_checkout_id = target_checkout_id
  on conflict (provider_event_id) where provider_event_id is not null
  do nothing;
end;
$$;

create or replace function public.release_registration_inventory(target_registrations uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ticket_to_lock uuid;
begin
  if target_registrations is null or cardinality(target_registrations) = 0 then
    return;
  end if;

  for ticket_to_lock in
    select distinct r.ticket_type_id
    from public.event_registrations r
    where r.id = any(target_registrations)
      and r.inventory_reserved
      and r.ticket_type_id is not null
    order by r.ticket_type_id
  loop
    perform 1
    from public.event_tickets t
    where t.id = ticket_to_lock
    for update;
  end loop;

  with released as (
    select r.ticket_type_id, sum(r.quantity)::integer as released_quantity
    from public.event_registrations r
    where r.id = any(target_registrations)
      and r.inventory_reserved
    group by r.ticket_type_id
  )
  update public.event_tickets t
  set quantity_sold = greatest(0, t.quantity_sold - released.released_quantity),
      status = case
        when t.status = 'sold_out'
          and greatest(0, t.quantity_sold - released.released_quantity) < t.quantity
          then 'active'
        else t.status
      end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  from released
  where t.id = released.ticket_type_id;

  update public.event_registrations
  set inventory_reserved = false,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where id = any(target_registrations)
    and inventory_reserved;
end;
$$;

create or replace function public.cancel_reconciled_checkout(
  target_checkout_id text,
  target_registrations uuid[],
  target_provider_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_status text := pg_catalog.upper(target_provider_status);
begin
  if normalized_status not in ('EXPIRED', 'CANCELLED', 'REFUNDED') then
    raise exception 'unsupported checkout cancellation status';
  end if;

  perform public.release_registration_inventory(target_registrations);

  update public.event_registrations r
  set status = 'cancelled',
      payment_status = case when normalized_status = 'REFUNDED' then 'refunded' else null end,
      provider_refund_id = case when normalized_status = 'REFUNDED' then target_checkout_id else null end,
      cancelled_at = coalesce(r.cancelled_at, pg_catalog.now()),
      cancelled_reason = case normalized_status
        when 'REFUNDED' then 'Pagamento reembolsado pelo provedor.'
        when 'EXPIRED' then 'Checkout expirado sem pagamento.'
        else 'Checkout cancelado no provedor.'
      end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = any(target_registrations)
    and r.provider_checkout_id = target_checkout_id;
end;
$$;

create or replace function public.claim_pending_installment_reconciliations(
  target_before timestamptz,
  target_batch_size integer default 25
)
returns table(charge_id text, installment_id uuid, registration_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  charge_to_claim record;
begin
  if target_batch_size < 1 or target_batch_size > 100 then
    raise exception 'reconciliation batch size must be between 1 and 100';
  end if;

  for charge_to_claim in
    select
      i.provider_transaction_id as charge,
      i.id as installment,
      r.id as registration
    from public.payment_installments i
    join public.event_registrations r on r.id = i.registration_id
    where i.installment_number = 1
      and i.status = 'pending'
      and i.provider_transaction_id is not null
      and i.date_created < target_before
      and r.inventory_reserved
      and r.is_installment_payment
      and r.payment_status = 'pending'
      and coalesce(r.payment_amount, 0) = 0
      and (
        r.reconciliation_checked_at is null
        or r.reconciliation_checked_at < pg_catalog.now() - interval '5 minutes'
      )
    order by i.date_created
    limit target_batch_size
  loop
    if pg_catalog.pg_try_advisory_xact_lock(
      pg_catalog.hashtextextended(charge_to_claim.charge, 965216373)
    ) then
      update public.event_registrations r
      set reconciliation_checked_at = pg_catalog.now(),
          date_updated = pg_catalog.timezone('utc', pg_catalog.now())
      where r.id = charge_to_claim.registration
        and r.inventory_reserved
        and r.payment_status = 'pending';

      if found then
        charge_id := charge_to_claim.charge;
        installment_id := charge_to_claim.installment;
        registration_id := charge_to_claim.registration;
        return next;
      end if;
    end if;
  end loop;
end;
$$;

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
    and i.status = 'pending'
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

create or replace function public.cancel_reconciled_installment(
  target_charge_id text,
  target_installment_id uuid,
  target_registration_id uuid,
  target_provider_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_status text := pg_catalog.upper(target_provider_status);
begin
  if normalized_status not in ('EXPIRED', 'CANCELLED') then
    raise exception 'unsupported transparent cancellation status';
  end if;

  perform public.release_registration_inventory(array[target_registration_id]);

  update public.payment_installments i
  set status = 'cancelled',
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where i.id = target_installment_id
    and i.registration_id = target_registration_id
    and i.provider_transaction_id = target_charge_id
    and i.status = 'pending';

  if not found then
    if exists (
      select 1
      from public.payment_installments i
      where i.id = target_installment_id
        and i.registration_id = target_registration_id
        and i.provider_transaction_id = target_charge_id
        and i.status = 'paid'
    ) then
      perform public.reserve_registration_inventory(array[target_registration_id]);
    end if;
    return;
  end if;

  update public.payment_installments i
  set status = 'cancelled',
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where i.registration_id = target_registration_id
    and i.status = 'pending';

  update public.event_registrations r
  set status = 'cancelled',
      payment_status = null,
      installment_plan_status = 'defaulted',
      cancelled_at = coalesce(r.cancelled_at, pg_catalog.now()),
      cancelled_reason = case normalized_status
        when 'EXPIRED' then 'Primeira cobrança PIX expirada sem pagamento.'
        else 'Primeira cobrança PIX cancelada no provedor.'
      end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = target_registration_id;
end;
$$;

-- A signed transparent-payment webhook is the source of truth for the final
-- provider fee. The installment, registration aggregate and ledger entry must
-- commit together so a process crash cannot leave a paid charge half-applied.
create or replace function public.settle_installment_webhook(
  target_charge_id text,
  target_installment_id uuid,
  target_registration_id uuid,
  target_provider_fee numeric,
  target_metadata jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  installment_amount numeric(12, 2);
  paid_total numeric(12, 2);
  final_provider_fee numeric(12, 2);
begin
  if target_provider_fee < 0 then
    raise exception 'provider fee cannot be negative';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_charge_id, 965216373)
  );
  perform public.reserve_registration_inventory(array[target_registration_id]);

  select i.amount
  into installment_amount
  from public.payment_installments i
  where i.id = target_installment_id
    and i.registration_id = target_registration_id
    and i.provider_transaction_id = target_charge_id
  for update;

  if installment_amount is null then
    raise exception 'installment does not match provider charge';
  end if;

  update public.payment_installments i
  set status = 'paid',
      paid_at = coalesce(i.paid_at, pg_catalog.now()),
      payment_confirmed_at = coalesce(i.payment_confirmed_at, pg_catalog.now()),
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where i.id = target_installment_id
    and i.status <> 'paid';

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
    'transparent.completed',
    installment_amount,
    target_provider_fee,
    0,
    greatest(0, installment_amount - target_provider_fee),
    'succeeded',
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (provider_event_id) where provider_event_id is not null
  do update set
    event_type = excluded.event_type,
    provider_fee = excluded.provider_fee,
    organizer_net = excluded.organizer_net,
    status = excluded.status,
    metadata = excluded.metadata;

  select coalesce(sum(t.provider_fee) filter (where t.status = 'succeeded'), 0)
  into final_provider_fee
  from public.payment_transactions t
  where t.registration_id = target_registration_id
    and t.provider_event_id like 'transparent.completed:%';

  select coalesce(sum(i.amount) filter (where i.status = 'paid'), 0)
  into paid_total
  from public.payment_installments i
  where i.registration_id = target_registration_id;

  update public.event_registrations r
  set status = case when paid_total >= r.total_amount then 'confirmed' else 'partial_payment' end,
      payment_status = case when paid_total >= r.total_amount then 'paid' else 'pending' end,
      payment_amount = least(r.total_amount, paid_total),
      provider_fee = final_provider_fee,
      provider_transaction_id = target_charge_id,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = target_registration_id;
end;
$$;

create or replace function public.create_validated_form_submission(
  target_form uuid,
  target_submitted_by uuid,
  target_values jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_submission uuid;
begin
  if not exists (
    select 1 from public.forms f where f.id = target_form and f.is_active
  ) then
    raise exception 'form unavailable';
  end if;

  if pg_catalog.jsonb_typeof(target_values) <> 'array'
     or pg_catalog.jsonb_array_length(target_values) > 100
     or exists (
       select 1
       from pg_catalog.jsonb_array_elements(target_values) item
       left join public.form_fields field
         on field.id = (item->>'field')::uuid
        and field.form = target_form
       where field.id is null
          or (item ? 'value') = (item ? 'file')
     )
     or exists (
       select 1
       from pg_catalog.jsonb_array_elements(target_values) item
       group by item->>'field'
       having count(*) > 1
     )
     or exists (
       select 1
       from public.form_fields field
       where field.form = target_form
         and field.required
         and not exists (
           select 1
           from pg_catalog.jsonb_array_elements(target_values) item
           where item->>'field' = field.id::text
             and coalesce(nullif(pg_catalog.btrim(item->>'value'), ''), item->>'file') is not null
         )
     )
     or exists (
       select 1
       from pg_catalog.jsonb_array_elements(target_values) item
       join public.form_fields field on field.id = (item->>'field')::uuid
       where (field.type = 'file') <> (item ? 'file')
     )
     or exists (
       select 1
       from pg_catalog.jsonb_array_elements(target_values) item
       left join public.media_files media on media.id = (item->>'file')::uuid
       where item ? 'file'
         and (
           target_submitted_by is null
           or media.id is null
           or media.uploaded_by is distinct from target_submitted_by
         )
     ) then
    raise exception 'invalid form submission';
  end if;

  insert into public.form_submissions (form, submitted_by)
  values (target_form, target_submitted_by)
  returning id into created_submission;

  insert into public.form_submission_values (form_submission, field, value, file, sort)
  select
    created_submission,
    (item->>'field')::uuid,
    nullif(item->>'value', ''),
    (item->>'file')::uuid,
    item.ordinality::integer
  from pg_catalog.jsonb_array_elements(target_values) with ordinality as item(item, ordinality);

  return created_submission;
end;
$$;

create or replace function public.cancel_registration_by_organizer(
  target_organizer uuid,
  target_registration uuid,
  target_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  registration public.event_registrations%rowtype;
begin
  if pg_catalog.length(pg_catalog.btrim(target_reason)) < 3 then
    raise exception 'cancellation reason is required';
  end if;

  select r.*
  into registration
  from public.event_registrations r
  join public.events e on e.id = r.event_id
  where r.id = target_registration
    and e.organizer_id = target_organizer
  for update of r;

  if not found then
    return null;
  end if;

  if registration.status = 'cancelled' then
    return pg_catalog.to_jsonb(registration);
  end if;

  if registration.inventory_reserved then
    update public.event_tickets t
    set quantity_sold = greatest(0, t.quantity_sold - registration.quantity),
        status = case when t.status = 'sold_out' then 'active' else t.status end,
        date_updated = pg_catalog.timezone('utc', pg_catalog.now())
    where t.id = registration.ticket_type_id;
  end if;

  update public.payment_installments i
  set status = case when i.status in ('pending', 'overdue') then 'cancelled' else i.status end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where i.registration_id = registration.id;

  update public.event_registrations r
  set status = 'cancelled',
      inventory_reserved = false,
      installment_plan_status = case when r.is_installment_payment then 'defaulted' else r.installment_plan_status end,
      cancelled_at = pg_catalog.now(),
      cancelled_reason = pg_catalog.btrim(target_reason),
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where r.id = registration.id
  returning r.* into registration;

  return pg_catalog.to_jsonb(registration);
end;
$$;

alter table public.email_deliveries drop constraint if exists email_deliveries_status_check;
alter table public.email_deliveries
  add constraint email_deliveries_status_check check (status in ('pending', 'sending', 'sent', 'failed'));

create or replace function public.claim_email_delivery(
  target_idempotency_key text,
  target_template text,
  target_recipient text,
  target_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  delivery public.email_deliveries%rowtype;
  should_send boolean := false;
begin
  insert into public.email_deliveries (idempotency_key, template, recipient, payload)
  values (target_idempotency_key, target_template, target_recipient, target_payload)
  on conflict (idempotency_key) do nothing;

  select d.*
  into delivery
  from public.email_deliveries d
  where d.idempotency_key = target_idempotency_key
  for update;

  if delivery.status in ('pending', 'failed')
    or (delivery.status = 'sending' and delivery.date_updated < pg_catalog.now() - interval '10 minutes') then
    update public.email_deliveries d
    set status = 'sending',
        template = target_template,
        recipient = target_recipient,
        payload = target_payload,
        date_updated = pg_catalog.timezone('utc', pg_catalog.now())
    where d.id = delivery.id
    returning d.* into delivery;
    should_send := true;
  end if;

  return pg_catalog.to_jsonb(delivery) || pg_catalog.jsonb_build_object('shouldSend', should_send);
end;
$$;

create or replace function public.get_organizer_available_balance(target_organizer uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select greatest(
    0,
    pg_catalog.round(
      coalesce((
        select sum(t.organizer_net)
        from public.payment_transactions t
        join public.event_registrations r on r.id = t.registration_id
        join public.events e on e.id = r.event_id
        where e.organizer_id = target_organizer
          and t.status = 'succeeded'
      ), 0) - coalesce((
        select sum(p.amount)
        from public.organizer_payouts p
        where p.organizer_id = target_organizer
          and p.status in ('pending', 'processing', 'completed')
      ), 0),
      2
    )
  );
$$;

create or replace function public.create_organizer_payout(
  target_id uuid,
  target_organizer uuid,
  target_actor uuid,
  target_amount numeric,
  target_provider_fee numeric,
  target_provider text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  organizer public.organizers%rowtype;
  configuration public.event_configurations%rowtype;
  payout public.organizer_payouts%rowtype;
  available numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_organizer::text, 152400771));

  select o.* into organizer
  from public.organizers o
  where o.id = target_organizer;
  if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;

  select c.* into configuration
  from public.event_configurations c
  where c.id = 1;

  if organizer.payout_pix_key is null
    or organizer.payout_pix_key_type is null
    or organizer.payout_status <> 'enabled' then
    raise exception 'PAYOUT_ACCOUNT_DISABLED';
  end if;
  if target_provider <> 'mock' and not configuration.payouts_enabled then
    raise exception 'PAYOUTS_DISABLED';
  end if;
  if target_amount < configuration.minimum_payout then
    raise exception 'PAYOUT_BELOW_MINIMUM';
  end if;

  available := public.get_organizer_available_balance(target_organizer);
  if target_amount > available then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into public.organizer_payouts (
    id, organizer_id, requested_by, processed_by, amount, provider_fee,
    net_amount, pix_key, pix_key_type, status, provider
  ) values (
    target_id, target_organizer, target_actor, target_actor, target_amount,
    target_provider_fee, greatest(0, target_amount - target_provider_fee),
    organizer.payout_pix_key, organizer.payout_pix_key_type, 'processing', target_provider
  )
  returning * into payout;

  return pg_catalog.to_jsonb(payout);
end;
$$;

create or replace function public.create_organizer_profile(
  target_user uuid,
  target_name text,
  target_email text,
  target_phone text,
  target_description text,
  target_website text,
  target_document text,
  target_logo uuid,
  target_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  organizer public.organizers%rowtype;
begin
  if target_status not in ('active', 'pending') then
    raise exception 'invalid organizer status';
  end if;

  insert into public.organizers (
    user_id, name, email, phone, description, website, document, logo, status
  ) values (
    target_user, target_name, target_email, target_phone, target_description,
    target_website, target_document, target_logo, target_status
  )
  returning * into organizer;

  if target_status = 'active' then
    update public.profiles p
    set role = case when p.role = 'super_admin' then p.role else 'organizer' end,
        date_updated = pg_catalog.timezone('utc', pg_catalog.now())
    where p.id = target_user;
  end if;

  return pg_catalog.to_jsonb(organizer);
exception
  when unique_violation then
    return null;
end;
$$;

-- Search must run before pagination; filtering an already paginated response
-- produces incomplete pages and incorrect totals as transaction volume grows.
create or replace function public.list_super_admin_transactions(
  target_page integer,
  target_limit integer,
  target_status text default null,
  target_search text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if target_page < 1 or target_limit < 1 or target_limit > 100 then
    raise exception 'invalid transaction pagination';
  end if;
  if target_status is not null and target_status not in ('succeeded', 'pending', 'failed', 'refunded') then
    raise exception 'invalid transaction status';
  end if;

  with filtered as materialized (
    select
      t as transaction,
      t.date_created as transaction_date,
      r.id as registration_id,
      r.participant_name,
      r.participant_email,
      e.id as event_id,
      e.title as event_title,
      o.id as organizer_id,
      o.name as organizer_name
    from public.payment_transactions t
    left join public.event_registrations r on r.id = t.registration_id
    left join public.events e on e.id = r.event_id
    left join public.organizers o on o.id = e.organizer_id
    where (target_status is null or t.status = target_status)
      and (
        pg_catalog.btrim(target_search) = ''
        or pg_catalog.concat_ws(
          ' ', r.participant_name, r.participant_email, e.title, o.name, t.provider_object_id
        ) ilike '%' || pg_catalog.btrim(target_search) || '%'
      )
  ), paged as (
    select *
    from filtered
    order by transaction_date desc
    limit target_limit
    offset (target_page - 1) * target_limit
  )
  select pg_catalog.jsonb_build_object(
    'data', coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.to_jsonb(p.transaction) || pg_catalog.jsonb_build_object(
          'registration_id', case
            when p.registration_id is null then null
            else pg_catalog.jsonb_build_object(
              'id', p.registration_id,
              'participant_name', p.participant_name,
              'participant_email', p.participant_email,
              'event_id', case
                when p.event_id is null then null
                else pg_catalog.jsonb_build_object(
                  'id', p.event_id,
                  'title', p.event_title,
                  'organizer_id', case
                    when p.organizer_id is null then null
                    else pg_catalog.jsonb_build_object('id', p.organizer_id, 'name', p.organizer_name)
                  end
                )
              end
            )
          end
        ) order by p.transaction_date desc
      ),
      '[]'::jsonb
    ),
    'total', (select pg_catalog.count(*) from filtered)
  )
  into result
  from paged p;

  return result;
end;
$$;

revoke execute on function public.reserve_registration_inventory(uuid[]) from public, anon, authenticated;
revoke execute on function public.release_registration_inventory(uuid[]) from public, anon, authenticated;
revoke execute on function public.claim_pending_checkout_reconciliations(timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.settle_reconciled_checkout(text, uuid[]) from public, anon, authenticated;
revoke execute on function public.cancel_reconciled_checkout(text, uuid[], text) from public, anon, authenticated;
revoke execute on function public.claim_pending_installment_reconciliations(timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.settle_reconciled_installment(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.cancel_reconciled_installment(text, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.settle_installment_webhook(text, uuid, uuid, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.create_validated_form_submission(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.cancel_registration_by_organizer(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_email_delivery(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.get_organizer_available_balance(uuid) from public, anon, authenticated;
revoke execute on function public.create_organizer_payout(uuid, uuid, uuid, numeric, numeric, text) from public, anon, authenticated;
revoke execute on function public.create_organizer_profile(uuid, text, text, text, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.list_super_admin_transactions(integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.reserve_registration_inventory(uuid[]) to service_role;
grant execute on function public.release_registration_inventory(uuid[]) to service_role;
grant execute on function public.claim_pending_checkout_reconciliations(timestamptz, integer) to service_role;
grant execute on function public.settle_reconciled_checkout(text, uuid[]) to service_role;
grant execute on function public.cancel_reconciled_checkout(text, uuid[], text) to service_role;
grant execute on function public.claim_pending_installment_reconciliations(timestamptz, integer) to service_role;
grant execute on function public.settle_reconciled_installment(text, uuid, uuid) to service_role;
grant execute on function public.cancel_reconciled_installment(text, uuid, uuid, text) to service_role;
grant execute on function public.settle_installment_webhook(text, uuid, uuid, numeric, jsonb) to service_role;
grant execute on function public.create_validated_form_submission(uuid, uuid, jsonb) to service_role;
grant execute on function public.cancel_registration_by_organizer(uuid, uuid, text) to service_role;
grant execute on function public.claim_email_delivery(text, text, text, jsonb) to service_role;
grant execute on function public.get_organizer_available_balance(uuid) to service_role;
grant execute on function public.create_organizer_payout(uuid, uuid, uuid, numeric, numeric, text) to service_role;
grant execute on function public.create_organizer_profile(uuid, text, text, text, text, text, text, uuid, text) to service_role;
grant execute on function public.list_super_admin_transactions(integer, integer, text, text) to service_role;

-- PostgreSQL does not create indexes for the referencing side of foreign keys.
-- These indexes protect joins, RLS lookups and cascading deletes as data grows.
create index if not exists media_files_uploaded_by_idx on public.media_files(uploaded_by);
create index if not exists profiles_avatar_idx on public.profiles(avatar);
create index if not exists site_settings_favicon_idx on public.site_settings(favicon);
create index if not exists site_settings_logo_idx on public.site_settings(logo);
create index if not exists site_settings_logo_dark_mode_idx on public.site_settings(logo_dark_mode);
create index if not exists posts_image_idx on public.posts(image);
create index if not exists posts_author_idx on public.posts(author);
create index if not exists navigation_items_page_idx on public.navigation_items(page);
create index if not exists navigation_items_post_idx on public.navigation_items(post);
create index if not exists navigation_items_parent_idx on public.navigation_items(parent);
create index if not exists block_buttons_button_group_sort_idx on public.block_buttons(button_group, sort);
create index if not exists block_buttons_page_idx on public.block_buttons(page);
create index if not exists block_buttons_post_idx on public.block_buttons(post);
create index if not exists block_hero_image_idx on public.block_hero(image);
create index if not exists block_hero_button_group_idx on public.block_hero(button_group);
create index if not exists block_gallery_items_file_idx on public.block_gallery_items(file);
create index if not exists block_pricing_cards_pricing_sort_idx on public.block_pricing_cards(pricing, sort);
create index if not exists block_pricing_cards_button_idx on public.block_pricing_cards(button);
create index if not exists block_form_form_idx on public.block_form(form);
create index if not exists form_fields_form_sort_idx on public.form_fields(form, sort);
create index if not exists form_submissions_form_idx on public.form_submissions(form);
create index if not exists form_submissions_submitted_by_idx on public.form_submissions(submitted_by);
create index if not exists submission_values_submission_idx on public.form_submission_values(form_submission);
create index if not exists submission_values_field_idx on public.form_submission_values(field);
create index if not exists submission_values_file_idx on public.form_submission_values(file);
create index if not exists organizers_logo_idx on public.organizers(logo);
create index if not exists events_category_id_idx on public.events(category_id);
create index if not exists events_cover_image_idx on public.events(cover_image);
create index if not exists events_user_created_idx on public.events(user_created);
create index if not exists events_user_updated_idx on public.events(user_updated);
create index if not exists registrations_ticket_type_id_idx on public.event_registrations(ticket_type_id);
create index if not exists payouts_requested_by_idx on public.organizer_payouts(requested_by);
create index if not exists payouts_processed_by_idx on public.organizer_payouts(processed_by);

-- Composite and partial indexes follow the filters used by dashboards and
-- provider webhooks, avoiding large in-memory sorts and sequential scans.
create index if not exists events_organizer_created_idx
  on public.events(organizer_id, date_created desc);
create index if not exists event_tickets_event_status_idx
  on public.event_tickets(event_id, status);
create index if not exists registrations_user_created_idx
  on public.event_registrations(user_id, date_created desc);
create index if not exists registrations_event_created_idx
  on public.event_registrations(event_id, date_created desc);
create index if not exists registrations_event_status_idx
  on public.event_registrations(event_id, status);
create index if not exists registrations_reserved_pending_idx
  on public.event_registrations(provider_checkout_id, date_created)
  where inventory_reserved and payment_status = 'pending';
create index if not exists transactions_registration_created_idx
  on public.payment_transactions(registration_id, date_created desc);
create index if not exists transactions_status_created_idx
  on public.payment_transactions(status, date_created desc);
create index if not exists installments_registration_status_idx
  on public.payment_installments(registration_id, status);
create index if not exists installments_provider_transaction_idx
  on public.payment_installments(provider_transaction_id)
  where provider_transaction_id is not null;
create index if not exists posts_status_published_idx
  on public.posts(status, published_at desc);

-- One set-based query powers the organizer dashboard. Keeping aggregation in
-- Postgres avoids transferring every registration to Node.js and eliminates
-- N+1 reads as the organizer history grows.
create or replace function public.get_organizer_dashboard(target_organizer uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with organizer_events as materialized (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      coalesce(
        nullif(e.location_name, ''),
        nullif(e.location_address, ''),
        case when e.event_type = 'online' then 'Online' else 'Local a definir' end
      ) as location
    from public.events e
    where e.organizer_id = target_organizer
  ),
  event_metrics as (
    select
      count(*)::bigint as total_events,
      count(*) filter (where status = 'published')::bigint as published_events,
      count(*) filter (
        where status = 'published'
          and start_date >= pg_catalog.now()
      )::bigint as upcoming_events
    from organizer_events
  ),
  registrations_by_event as (
    select
      r.event_id,
      coalesce(sum(r.quantity) filter (where r.status <> 'cancelled'), 0)::bigint as participants,
      coalesce(sum(r.total_amount) filter (where r.payment_status = 'paid'), 0)::numeric as gross_revenue
    from public.event_registrations r
    join organizer_events e on e.id = r.event_id
    group by r.event_id
  ),
  registration_metrics as (
    select
      coalesce(sum(participants), 0)::bigint as participants,
      coalesce(sum(gross_revenue), 0)::numeric as gross_revenue
    from registrations_by_event
  ),
  tickets_by_event as (
    select
      t.event_id,
      coalesce(sum(t.quantity_sold), 0)::bigint as tickets_sold
    from public.event_tickets t
    join organizer_events e on e.id = t.event_id
    group by t.event_id
  ),
  ticket_metrics as (
    select coalesce(sum(tickets_sold), 0)::bigint as tickets_sold
    from tickets_by_event
  ),
  recent_events as (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      e.location,
      coalesce(r.participants, 0)::bigint as participant_count,
      coalesce(t.tickets_sold, 0)::bigint as tickets_sold
    from organizer_events e
    left join registrations_by_event r on r.event_id = e.id
    left join tickets_by_event t on t.event_id = e.id
    order by e.start_date desc
    limit 5
  )
  select pg_catalog.jsonb_build_object(
    'metrics', pg_catalog.jsonb_build_object(
      'totalEvents', event_metrics.total_events,
      'publishedEvents', event_metrics.published_events,
      'upcomingEvents', event_metrics.upcoming_events,
      'participants', registration_metrics.participants,
      'ticketsSold', ticket_metrics.tickets_sold,
      'grossRevenue', registration_metrics.gross_revenue
    ),
    'recentEvents', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', recent_events.id,
            'title', recent_events.title,
            'slug', recent_events.slug,
            'status', recent_events.status,
            'startDate', recent_events.start_date,
            'location', recent_events.location,
            'participantCount', recent_events.participant_count,
            'ticketsSold', recent_events.tickets_sold
          )
          order by recent_events.start_date desc
        )
        from recent_events
      ),
      '[]'::jsonb
    )
  )
  from event_metrics, registration_metrics, ticket_metrics;
$$;

revoke execute on function public.get_organizer_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.get_organizer_dashboard(uuid) to service_role;
