-- Payment-provider neutral schema, AbacatePay configuration and platform administration.
-- Complements the provider-neutral initial schema with financial governance.

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('attendee', 'organizer', 'admin', 'super_admin'));
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and status = 'active'
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
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'active'
  );
$$;

alter table public.organizers
  add column if not exists payout_pix_key text,
  add column if not exists payout_pix_key_type text
    check (payout_pix_key_type in ('CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM')),
  add column if not exists payout_status text not null default 'not_configured'
    check (payout_status in ('not_configured', 'pending_review', 'enabled', 'blocked'));

alter table public.event_tickets
  add column if not exists provider_product_id text;

alter table public.event_registrations
  add column if not exists payment_provider text not null default 'mock'
    check (payment_provider in ('mock', 'abacatepay')),
  add column if not exists provider_transaction_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_refund_id text,
  add column if not exists provider_fee numeric(12,2) not null default 0,
  add column if not exists platform_fee numeric(12,2) not null default 0;

alter table public.payment_installments
  add column if not exists provider_transaction_id text;

alter table public.payment_transactions
  add column if not exists provider text not null default 'mock'
    check (provider in ('mock', 'abacatepay')),
  add column if not exists provider_event_id text,
  add column if not exists provider_object_id text,
  add column if not exists provider_fee numeric(12,2) not null default 0,
  add column if not exists platform_fee numeric(12,2) not null default 0,
  add column if not exists organizer_net numeric(12,2) not null default 0;

create unique index if not exists payment_transactions_provider_event_idx
  on public.payment_transactions(provider_event_id)
  where provider_event_id is not null;

alter table public.event_configurations
  add column if not exists payment_gateway text not null default 'abacatepay'
    check (payment_gateway in ('abacatepay')),
  add column if not exists card_fee_percentage numeric(6,3) not null default 3.5,
  add column if not exists card_fee_fixed numeric(12,2) not null default 0.60,
  add column if not exists card_installment_2_6_percentage numeric(6,3) not null default 4,
  add column if not exists card_installment_7_12_percentage numeric(6,3) not null default 4.5,
  add column if not exists pix_fee_fixed numeric(12,2) not null default 0.80,
  add column if not exists boleto_fee_fixed numeric(12,2) not null default 2.50,
  add column if not exists payout_fee_fixed numeric(12,2) not null default 0.80,
  add column if not exists minimum_payout numeric(12,2) not null default 3.50,
  add column if not exists payouts_enabled boolean not null default false;

update public.event_configurations
set card_fee_percentage = 3.5,
    card_fee_fixed = 0.60,
    card_installment_2_6_percentage = 4,
    card_installment_7_12_percentage = 4.5,
    pix_fee_fixed = 0.80,
    boleto_fee_fixed = 2.50,
    payout_fee_fixed = 0.80,
    minimum_payout = 3.50,
    payment_gateway = 'abacatepay'
where id = 1;

create table if not exists public.organizer_payouts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  processed_by uuid references public.profiles(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  provider_fee numeric(12,2) not null default 0 check (provider_fee >= 0),
  net_amount numeric(12,2) not null check (net_amount >= 0),
  pix_key text not null,
  pix_key_type text not null check (pix_key_type in ('CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  provider text not null default 'abacatepay' check (provider in ('mock', 'abacatepay')),
  provider_payout_id text unique,
  receipt_url text,
  failure_reason text,
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  date_updated timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  date_created timestamptz not null default timezone('utc', now())
);

create index if not exists organizer_payouts_organizer_status_idx
  on public.organizer_payouts(organizer_id, status, requested_at desc);
create index if not exists audit_logs_actor_date_idx
  on public.audit_logs(actor_id, date_created desc);
create index if not exists registrations_provider_checkout_idx
  on public.event_registrations(provider_checkout_id)
  where provider_checkout_id is not null;

drop trigger if exists organizer_payouts_updated_at on public.organizer_payouts;
create trigger organizer_payouts_updated_at
  before update on public.organizer_payouts
  for each row execute procedure public.set_updated_at();

alter table public.organizer_payouts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists read_own_organizer_payouts on public.organizer_payouts;
create policy read_own_organizer_payouts on public.organizer_payouts
for select to authenticated using (
  public.is_super_admin()
  or exists (
    select 1 from public.organizers o
    where o.id = organizer_id and o.user_id = auth.uid()
  )
);

drop policy if exists super_admin_manage_payouts on public.organizer_payouts;
create policy super_admin_manage_payouts on public.organizer_payouts
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists super_admin_read_audit_logs on public.audit_logs;
create policy super_admin_read_audit_logs on public.audit_logs
for select to authenticated using (public.is_super_admin());

drop policy if exists super_admin_insert_audit_logs on public.audit_logs;
create policy super_admin_insert_audit_logs on public.audit_logs
for insert to authenticated with check (public.is_super_admin() and actor_id = auth.uid());
