insert into public.site_settings (id, title, description, tagline, url, accent_color)
values (
  '10000000-0000-0000-0000-000000000001',
  'Events Manager',
  'Descubra e gerencie experiências inesquecíveis.',
  'Eventos que conectam pessoas',
  'http://localhost:3003',
  '#6644ff'
)
on conflict (id) do nothing;

insert into public.event_configurations (
  id, allow_free_events, max_tickets_per_event, ticket_code_prefix,
  registration_confirmation_email, platform_fee_percentage,
  payment_gateway, card_fee_percentage, card_fee_fixed,
  card_installment_2_6_percentage, card_installment_7_12_percentage,
  pix_fee_fixed, boleto_fee_fixed, payout_fee_fixed, minimum_payout,
  convenience_fee_calculation_method
)
values (1, true, 10, 'EVT', true, 5, 'abacatepay', 3.5, 0.60, 4, 4.5, 0.80, 2.50, 0.80, 3.50, 'buyer_pays')
on conflict (id) do nothing;

insert into public.pages (id, title, permalink, status, published_at, seo)
values (
  '20000000-0000-0000-0000-000000000001',
  'Início',
  '/',
  'published',
  timezone('utc', now()),
  '{"title":"Events Manager","meta_description":"Encontre os melhores eventos perto de você."}'::jsonb
)
on conflict (id) do nothing;

insert into public.navigation (id, title, is_active)
values ('main', 'Navegação principal', true), ('footer', 'Rodapé', true)
on conflict (id) do nothing;

insert into public.navigation_items (id, navigation, page, title, type, sort)
values (
  '30000000-0000-0000-0000-000000000001',
  'main',
  '20000000-0000-0000-0000-000000000001',
  'Início',
  'page',
  1
)
on conflict (id) do nothing;

insert into public.block_button_groups (id, sort)
values ('40000000-0000-0000-0000-000000000001', 1)
on conflict (id) do nothing;

insert into public.block_buttons (id, button_group, type, label, variant, url, sort)
values (
  '41000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'url',
  'Explorar eventos',
  'default',
  '#eventos',
  1
)
on conflict (id) do nothing;

insert into public.block_hero (id, tagline, headline, description, button_group, layout)
values (
  '42000000-0000-0000-0000-000000000001',
  'Sua próxima experiência começa aqui',
  'Eventos que viram boas histórias',
  'O ambiente local já está conectado ao Supabase e pronto para receber seus eventos.',
  '40000000-0000-0000-0000-000000000001',
  'image_right'
)
on conflict (id) do nothing;

insert into public.block_events (id, headline, description, filter_featured, max_items, show_past_events)
values (
  '43000000-0000-0000-0000-000000000001',
  'Próximos eventos',
  'Cadastre seu primeiro evento pelo painel do organizador.',
  false,
  10,
  false
)
on conflict (id) do nothing;

insert into public.page_blocks (id, page, collection, item, sort, background)
values
  (
    '44000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'block_hero',
    '42000000-0000-0000-0000-000000000001',
    1,
    'light'
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    'block_events',
    '43000000-0000-0000-0000-000000000001',
    2,
    'light'
  )
on conflict (id) do nothing;

insert into public.event_categories (id, name, slug, description, icon, color, sort)
values
  ('50000000-0000-0000-0000-000000000001', 'Tecnologia', 'tecnologia', 'Conferências, workshops e meetups.', 'Laptop', '#6644ff', 1),
  ('50000000-0000-0000-0000-000000000002', 'Música', 'musica', 'Shows, festivais e apresentações.', 'Music', '#ec4899', 2)
on conflict (id) do nothing;

insert into public.organizers (id, name, email, description, status)
values (
  '60000000-0000-0000-0000-000000000001',
  'Events Manager Demo',
  'demo@events.local',
  'Organizador usado somente para o conteúdo inicial local.',
  'active'
)
on conflict (id) do nothing;

insert into public.events (
  id, organizer_id, category_id, title, slug, short_description, description,
  status, event_type, start_date, end_date, location_name, location_address,
  is_free, featured
)
values (
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'Evento local de demonstração',
  'evento-local-demonstracao',
  'Valide a página pública e o fluxo de inscrição no ambiente local.',
  '<p>Este evento foi criado pelo seed do Supabase local.</p>',
  'published',
  'in_person',
  timezone('utc', now()) + interval '30 days',
  timezone('utc', now()) + interval '30 days 4 hours',
  'Centro de Eventos Local',
  'Av. Desenvolvimento, 100',
  true,
  true
)
on conflict (id) do nothing;

insert into public.event_tickets (
  id, event_id, title, description, status, quantity, price,
  service_fee_type, buyer_price, visibility, sort
)
values (
  '71000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'Ingresso gratuito',
  'Ingresso de demonstração para o ambiente local.',
  'active',
  100,
  0,
  'absorbed',
  0,
  'public',
  1
)
on conflict (id) do nothing;
