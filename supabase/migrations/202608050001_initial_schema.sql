create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.date_updated = timezone('utc', now());
  return new;
end;
$$;

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null unique,
  filename text not null,
  title text,
  type text,
  filesize bigint,
  width integer,
  height integer,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid references auth.users(id) on delete set null,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  avatar uuid references public.media_files(id) on delete set null,
  location text,
  title text,
  description text,
  role text not null default 'attendee' check (role in ('attendee', 'organizer', 'admin', 'super_admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  tagline text,
  url text,
  favicon uuid references public.media_files(id) on delete set null,
  logo uuid references public.media_files(id) on delete set null,
  logo_dark_mode uuid references public.media_files(id) on delete set null,
  social_links jsonb not null default '[]'::jsonb,
  accent_color text not null default '#6644ff',
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  permalink text not null unique,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  published_at timestamptz,
  seo jsonb,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  name text not null default '',
  slug text unique,
  description text,
  content text,
  image uuid references public.media_files(id) on delete set null,
  author uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  published_at timestamptz,
  seo jsonb,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.navigation (
  id text primary key,
  title text,
  is_active boolean not null default true,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  navigation text not null references public.navigation(id) on delete cascade,
  page uuid references public.pages(id) on delete set null,
  post uuid references public.posts(id) on delete set null,
  parent uuid references public.navigation_items(id) on delete cascade,
  title text not null,
  type text not null default 'url' check (type in ('page', 'post', 'url', 'group')),
  url text,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.block_button_groups (
  id uuid primary key default gen_random_uuid(),
  sort integer,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_buttons (
  id uuid primary key default gen_random_uuid(),
  button_group uuid references public.block_button_groups(id) on delete cascade,
  type text check (type in ('page', 'post', 'url')),
  page uuid references public.pages(id) on delete set null,
  post uuid references public.posts(id) on delete set null,
  label text,
  variant text check (variant in ('default', 'outline', 'soft', 'ghost', 'link')),
  url text,
  sort integer,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_hero (
  id uuid primary key default gen_random_uuid(),
  tagline text,
  headline text,
  description text,
  image uuid references public.media_files(id) on delete set null,
  button_group uuid references public.block_button_groups(id) on delete set null,
  layout text check (layout in ('image_left', 'image_center', 'image_right')),
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_richtext (
  id uuid primary key default gen_random_uuid(),
  tagline text,
  headline text,
  content text,
  alignment text check (alignment in ('left', 'center')),
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_gallery (
  id uuid primary key default gen_random_uuid(),
  tagline text,
  headline text,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_gallery_items (
  id uuid primary key default gen_random_uuid(),
  block_gallery uuid not null references public.block_gallery(id) on delete cascade,
  file uuid not null references public.media_files(id) on delete cascade,
  sort integer,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_pricing (
  id uuid primary key default gen_random_uuid(),
  tagline text,
  headline text,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_pricing_cards (
  id uuid primary key default gen_random_uuid(),
  pricing uuid not null references public.block_pricing(id) on delete cascade,
  title text,
  description text,
  price text,
  badge text,
  features jsonb,
  button uuid references public.block_buttons(id) on delete set null,
  is_highlighted boolean not null default false,
  sort integer,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_posts (
  id uuid primary key default gen_random_uuid(),
  tagline text,
  headline text,
  collection text not null default 'posts',
  "limit" integer not null default 6,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_events (
  id uuid primary key default gen_random_uuid(),
  headline text,
  description text,
  filter_by_category uuid,
  filter_featured boolean not null default false,
  max_items integer not null default 10,
  show_past_events boolean not null default false
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  title text,
  submit_label text,
  success_message text,
  on_success text check (on_success in ('redirect', 'message')),
  success_redirect_url text,
  is_active boolean not null default true,
  emails jsonb,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form uuid not null references public.forms(id) on delete cascade,
  name text,
  type text check (type in ('text', 'textarea', 'checkbox', 'checkbox_group', 'radio', 'file', 'select', 'hidden')),
  label text,
  placeholder text,
  help text,
  validation text,
  width text check (width in ('100', '67', '50', '33')),
  choices jsonb,
  required boolean not null default false,
  sort integer,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.block_form (
  id uuid primary key default gen_random_uuid(),
  form uuid references public.forms(id) on delete set null,
  headline text,
  tagline text,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page uuid not null references public.pages(id) on delete cascade,
  collection text not null check (collection in ('block_hero', 'block_richtext', 'block_gallery', 'block_pricing', 'block_posts', 'block_events', 'block_form')),
  item uuid not null,
  sort integer,
  hide_block boolean not null default false,
  background text check (background in ('light', 'dark')),
  date_created timestamptz not null default timezone('utc', now())
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form uuid not null references public.forms(id) on delete cascade,
  submitted_by uuid references auth.users(id) on delete set null,
  timestamp timestamptz not null default timezone('utc', now())
);

create table public.form_submission_values (
  id uuid primary key default gen_random_uuid(),
  form_submission uuid not null references public.form_submissions(id) on delete cascade,
  field uuid references public.form_fields(id) on delete set null,
  value text,
  file uuid references public.media_files(id) on delete set null,
  sort integer,
  timestamp timestamptz not null default timezone('utc', now())
);

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  color text,
  sort integer
);

alter table public.block_events
  add constraint block_events_category_fk foreign key (filter_by_category) references public.event_categories(id) on delete set null;

create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  description text,
  logo uuid references public.media_files(id) on delete set null,
  website text,
  document text,
  status text not null default 'pending' check (status in ('active', 'pending', 'archived')),
  payout_pix_key text,
  payout_pix_key_type text check (payout_pix_key_type in ('CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM')),
  payout_status text not null default 'not_configured'
    check (payout_status in ('not_configured', 'pending_review', 'enabled', 'blocked')),
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  category_id uuid references public.event_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  short_description text,
  cover_image uuid references public.media_files(id) on delete set null,
  status text not null default 'draft' check (status in ('published', 'draft', 'cancelled', 'archived')),
  event_type text check (event_type in ('in_person', 'online', 'hybrid')),
  start_date timestamptz not null,
  end_date timestamptz not null,
  location_name text,
  location_address text,
  online_url text,
  max_attendees integer,
  registration_start timestamptz,
  registration_end timestamptz,
  is_free boolean not null default false,
  tags text[] not null default '{}',
  featured boolean not null default false,
  sort integer,
  user_created uuid references auth.users(id) on delete set null,
  user_updated uuid references auth.users(id) on delete set null,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now()),
  constraint event_dates_valid check (end_date > start_date)
);

create table public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'sold_out', 'inactive')),
  quantity integer not null check (quantity > 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0 and quantity_sold <= quantity),
  price numeric(12,2) not null check (price >= 0),
  service_fee_type text not null check (service_fee_type in ('absorbed', 'passed_to_buyer')),
  buyer_price numeric(12,2),
  sale_start_date timestamptz,
  sale_end_date timestamptz,
  min_quantity_per_purchase integer not null default 1,
  max_quantity_per_purchase integer not null default 10,
  visibility text not null default 'public' check (visibility in ('public', 'invited_only', 'manual')),
  allow_installments boolean not null default false,
  max_installments integer,
  min_amount_for_installments numeric(12,2),
  provider_product_id text,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid references public.event_tickets(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  participant_name text not null,
  participant_email text not null,
  participant_phone text,
  participant_document text,
  ticket_code text unique,
  status text not null default 'pending' check (status in ('confirmed', 'pending', 'partial_payment', 'payment_overdue', 'cancelled', 'checked_in')),
  payment_status text check (payment_status in ('free', 'paid', 'pending', 'refunded')),
  payment_amount numeric(12,2),
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2),
  service_fee numeric(12,2),
  total_amount numeric(12,2),
  payment_method text check (payment_method in ('card', 'pix', 'boleto', 'free')),
  payment_provider text not null default 'mock' check (payment_provider in ('mock', 'abacatepay')),
  provider_transaction_id text,
  provider_checkout_id text,
  provider_refund_id text,
  provider_fee numeric(12,2) not null default 0,
  platform_fee numeric(12,2) not null default 0,
  check_in_date timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  notes text,
  additional_info jsonb not null default '{}'::jsonb,
  is_installment_payment boolean not null default false,
  total_installments integer,
  installment_plan_status text check (installment_plan_status in ('active', 'completed', 'defaulted')),
  blocked_reason text,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete cascade,
  installment_number integer not null,
  total_installments integer not null,
  amount numeric(12,2) not null,
  due_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  provider_transaction_id text,
  pix_qr_code_base64 text,
  pix_copy_paste text,
  paid_at timestamptz,
  payment_confirmed_at timestamptz,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now()),
  unique (registration_id, installment_number)
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.event_registrations(id) on delete set null,
  provider text not null default 'mock' check (provider in ('mock', 'abacatepay')),
  provider_event_id text,
  provider_object_id text,
  event_type text,
  amount numeric(12,2),
  provider_fee numeric(12,2) not null default 0,
  platform_fee numeric(12,2) not null default 0,
  organizer_net numeric(12,2) not null default 0,
  status text check (status in ('succeeded', 'failed', 'pending', 'refunded')),
  metadata jsonb not null default '{}'::jsonb,
  date_created timestamptz not null default timezone('utc', now())
);

create table public.event_configurations (
  id integer primary key default 1 check (id = 1),
  allow_free_events boolean not null default true,
  max_tickets_per_event integer,
  ticket_code_prefix text not null default 'EVT',
  registration_confirmation_email boolean not null default true,
  platform_fee_percentage numeric(6,3) not null default 5,
  payment_gateway text not null default 'abacatepay' check (payment_gateway in ('abacatepay')),
  card_fee_percentage numeric(6,3) not null default 3.5,
  card_fee_fixed numeric(12,2) not null default 0.60,
  card_installment_2_6_percentage numeric(6,3) not null default 4,
  card_installment_7_12_percentage numeric(6,3) not null default 4.5,
  pix_fee_fixed numeric(12,2) not null default 0.80,
  boleto_fee_fixed numeric(12,2) not null default 2.50,
  payout_fee_fixed numeric(12,2) not null default 0.80,
  minimum_payout numeric(12,2) not null default 3.50,
  payouts_enabled boolean not null default false,
  convenience_fee_calculation_method text not null default 'buyer_pays' check (convenience_fee_calculation_method in ('buyer_pays', 'organizer_absorbs'))
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  response_code text check (response_code in ('301', '302')),
  url_from text unique,
  url_to text,
  note text,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.ai_prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'published')),
  description text,
  messages jsonb,
  system_prompt text,
  sort integer,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  template text not null,
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now())
);

create or replace function public.increment_ticket_sales(target_ticket uuid, sold_amount integer)
returns public.event_tickets
language plpgsql
security definer set search_path = ''
as $$
declare
  updated_ticket public.event_tickets;
begin
  if sold_amount <= 0 then
    raise exception 'sold_amount must be positive';
  end if;

  update public.event_tickets
  set quantity_sold = quantity_sold + sold_amount,
      status = case when quantity_sold + sold_amount >= quantity then 'sold_out' else status end,
      date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where id = target_ticket
    and status = 'active'
    and quantity_sold + sold_amount <= quantity
  returning * into updated_ticket;

  if updated_ticket.id is null then
    raise exception 'ticket inventory unavailable';
  end if;
  return updated_ticket;
end;
$$;

create index events_status_start_date_idx on public.events(status, start_date);
create index events_organizer_id_idx on public.events(organizer_id);
create index event_tickets_event_id_idx on public.event_tickets(event_id);
create index registrations_event_id_idx on public.event_registrations(event_id);
create index registrations_user_id_idx on public.event_registrations(user_id);
create index transactions_registration_id_idx on public.payment_transactions(registration_id);
create index installments_registration_id_idx on public.payment_installments(registration_id);
create index navigation_items_navigation_sort_idx on public.navigation_items(navigation, sort);
create index page_blocks_page_sort_idx on public.page_blocks(page, sort);

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute procedure public.set_updated_at();
create trigger pages_updated_at before update on public.pages for each row execute procedure public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute procedure public.set_updated_at();
create trigger organizers_updated_at before update on public.organizers for each row execute procedure public.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute procedure public.set_updated_at();
create trigger tickets_updated_at before update on public.event_tickets for each row execute procedure public.set_updated_at();
create trigger registrations_updated_at before update on public.event_registrations for each row execute procedure public.set_updated_at();
create trigger installments_updated_at before update on public.payment_installments for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin') and status = 'active'
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
    where e.id = target_event and o.user_id = auth.uid()
  );
$$;

alter table public.media_files enable row level security;
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.posts enable row level security;
alter table public.navigation enable row level security;
alter table public.navigation_items enable row level security;
alter table public.block_button_groups enable row level security;
alter table public.block_buttons enable row level security;
alter table public.block_hero enable row level security;
alter table public.block_richtext enable row level security;
alter table public.block_gallery enable row level security;
alter table public.block_gallery_items enable row level security;
alter table public.block_pricing enable row level security;
alter table public.block_pricing_cards enable row level security;
alter table public.block_posts enable row level security;
alter table public.block_events enable row level security;
alter table public.block_form enable row level security;
alter table public.page_blocks enable row level security;
alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_submission_values enable row level security;
alter table public.event_categories enable row level security;
alter table public.organizers enable row level security;
alter table public.events enable row level security;
alter table public.event_tickets enable row level security;
alter table public.event_registrations enable row level security;
alter table public.payment_installments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.event_configurations enable row level security;
alter table public.redirects enable row level security;
alter table public.ai_prompts enable row level security;
alter table public.email_deliveries enable row level security;

create policy public_read_media on public.media_files for select using (true);
create policy user_insert_media on public.media_files for insert to authenticated with check (uploaded_by = auth.uid());
create policy user_manage_media on public.media_files for all to authenticated using (uploaded_by = auth.uid() or public.is_admin()) with check (uploaded_by = auth.uid() or public.is_admin());
create policy read_own_profile on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy update_own_profile on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy public_read_site on public.site_settings for select using (true);
create policy public_read_pages on public.pages for select using (status = 'published' or public.is_admin());
create policy public_read_posts on public.posts for select using (status = 'published' or author = auth.uid() or public.is_admin());
create policy public_read_navigation on public.navigation for select using (is_active or public.is_admin());
create policy public_read_navigation_items on public.navigation_items for select using (true);
create policy public_read_button_groups on public.block_button_groups for select using (true);
create policy public_read_buttons on public.block_buttons for select using (true);
create policy public_read_hero on public.block_hero for select using (true);
create policy public_read_richtext on public.block_richtext for select using (true);
create policy public_read_gallery on public.block_gallery for select using (true);
create policy public_read_gallery_items on public.block_gallery_items for select using (true);
create policy public_read_pricing on public.block_pricing for select using (true);
create policy public_read_pricing_cards on public.block_pricing_cards for select using (true);
create policy public_read_post_blocks on public.block_posts for select using (true);
create policy public_read_event_blocks on public.block_events for select using (true);
create policy public_read_form_blocks on public.block_form for select using (true);
create policy public_read_page_blocks on public.page_blocks for select using (not hide_block or public.is_admin());
create policy public_read_forms on public.forms for select using (is_active or public.is_admin());
create policy public_read_form_fields on public.form_fields for select using (true);
create policy anyone_submit_forms on public.form_submissions for insert with check (submitted_by is null or submitted_by = auth.uid());
create policy anyone_submit_form_values on public.form_submission_values for insert with check (true);
create policy public_read_categories on public.event_categories for select using (true);
create policy public_read_event_config on public.event_configurations for select using (true);
create policy public_read_redirects on public.redirects for select using (true);

create policy read_organizers on public.organizers for select using (status = 'active' or user_id = auth.uid() or public.is_admin());
create policy create_organizer on public.organizers for insert to authenticated with check (user_id = auth.uid());
create policy update_organizer on public.organizers for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy read_events on public.events for select using (status = 'published' or public.owns_event(id) or public.is_admin());
create policy create_events on public.events for insert to authenticated with check (exists (select 1 from public.organizers o where o.id = organizer_id and o.user_id = auth.uid()) or public.is_admin());
create policy update_events on public.events for update to authenticated using (public.owns_event(id) or public.is_admin()) with check (public.owns_event(id) or public.is_admin());
create policy delete_events on public.events for delete to authenticated using (public.owns_event(id) or public.is_admin());
create policy read_tickets on public.event_tickets for select using ((status = 'active' and visibility = 'public' and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')) or public.owns_event(event_id) or public.is_admin());
create policy manage_tickets on public.event_tickets for all to authenticated using (public.owns_event(event_id) or public.is_admin()) with check (public.owns_event(event_id) or public.is_admin());
create policy read_registrations on public.event_registrations for select to authenticated using (user_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy create_registrations on public.event_registrations for insert with check (user_id is null or user_id = auth.uid());
create policy manage_registrations on public.event_registrations for update to authenticated using (user_id = auth.uid() or public.owns_event(event_id) or public.is_admin()) with check (user_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy read_installments on public.payment_installments for select to authenticated using (exists (select 1 from public.event_registrations r where r.id = registration_id and (r.user_id = auth.uid() or public.owns_event(r.event_id))) or public.is_admin());
create policy read_transactions on public.payment_transactions for select to authenticated using (exists (select 1 from public.event_registrations r where r.id = registration_id and (r.user_id = auth.uid() or public.owns_event(r.event_id))) or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy public_read_storage on storage.objects for select using (bucket_id = 'media');
create policy authenticated_upload_storage on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy owner_manage_storage on storage.objects for all to authenticated using (bucket_id = 'media' and owner_id = auth.uid()::text) with check (bucket_id = 'media' and owner_id = auth.uid()::text);
