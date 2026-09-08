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

insert into public.pages (id, title, permalink, status, published_at, seo)
values
  (
    '20000000-0000-0000-0000-000000000002',
    'Sobre',
    '/sobre',
    'published',
    timezone('utc', now()),
    '{"title":"Sobre o Events Manager","meta_description":"Conheça a plataforma que conecta organizadores e participantes."}'::jsonb
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Contato',
    '/contato',
    'published',
    timezone('utc', now()),
    '{"title":"Fale com a gente","meta_description":"Tire dúvidas sobre eventos, ingressos e a plataforma."}'::jsonb
  )
on conflict (id) do nothing;

insert into public.navigation_items (id, navigation, page, title, type, url, sort)
values
  ('30000000-0000-0000-0000-000000000001', 'main', '20000000-0000-0000-0000-000000000001', 'Início', 'page', null, 1),
  ('30000000-0000-0000-0000-000000000002', 'main', null, 'Eventos', 'url', '/eventos', 2),
  ('30000000-0000-0000-0000-000000000003', 'main', null, 'Blog', 'url', '/blog', 3),
  ('30000000-0000-0000-0000-000000000004', 'main', '20000000-0000-0000-0000-000000000002', 'Sobre', 'page', null, 4),
  ('30000000-0000-0000-0000-000000000011', 'footer', '20000000-0000-0000-0000-000000000001', 'Início', 'page', null, 1),
  ('30000000-0000-0000-0000-000000000012', 'footer', null, 'Eventos', 'url', '/eventos', 2),
  ('30000000-0000-0000-0000-000000000013', 'footer', '20000000-0000-0000-0000-000000000002', 'Sobre', 'page', null, 3),
  ('30000000-0000-0000-0000-000000000014', 'footer', '20000000-0000-0000-0000-000000000003', 'Contato', 'page', null, 4)
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

insert into public.block_richtext (id, tagline, headline, content, alignment)
values
  (
    '45000000-0000-0000-0000-000000000001',
    'Como funciona',
    'Do cadastro ao check-in em um só lugar',
    '<p>Organizadores publicam eventos, vendem ingressos com Pix, cartão ou boleto e acompanham as inscrições em tempo real. Participantes encontram experiências perto de si e recebem o ingresso por e-mail.</p><ul><li>Ingressos com lotes, cupons e parcelamento.</li><li>Check-in por QR Code no dia do evento.</li><li>Repasses automáticos para o organizador.</li></ul>',
    'center'
  ),
  (
    '45000000-0000-0000-0000-000000000002',
    'Sobre nós',
    'Uma plataforma feita para quem cria experiências',
    '<p>O Events Manager nasceu para simplificar a vida de quem organiza eventos: menos planilha, mais palco. Toda a operação — divulgação, ingressos, pagamentos e relatórios — fica no mesmo painel.</p><p>Quer organizar o seu? <a href="/perfil/organizador">Crie sua organização</a> em poucos minutos.</p>',
    'left'
  ),
  (
    '45000000-0000-0000-0000-000000000003',
    'Contato',
    'Fale com a gente',
    '<p>Dúvidas sobre ingressos, pagamentos ou como publicar um evento? Envie sua mensagem e respondemos em até um dia útil.</p>',
    'center'
  )
on conflict (id) do nothing;

insert into public.forms (id, title, submit_label, success_message, on_success, is_active)
values (
  '46000000-0000-0000-0000-000000000001',
  'Contato',
  'Enviar mensagem',
  'Recebemos sua mensagem. Em breve entraremos em contato.',
  'message',
  true
)
on conflict (id) do nothing;

insert into public.form_fields (id, form, name, type, label, placeholder, validation, width, required, sort)
values
  ('47000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 'nome', 'text', 'Nome', 'Seu nome', 'min:2|max:100', '50', true, 1),
  ('47000000-0000-0000-0000-000000000002', '46000000-0000-0000-0000-000000000001', 'email', 'text', 'E-mail', 'voce@exemplo.com', 'email|max:255', '50', true, 2),
  ('47000000-0000-0000-0000-000000000003', '46000000-0000-0000-0000-000000000001', 'mensagem', 'textarea', 'Mensagem', 'Como podemos ajudar?', 'min:10|max:2000', '100', true, 3)
on conflict (id) do nothing;

insert into public.block_form (id, form, tagline, headline)
values ('48000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', null, null)
on conflict (id) do nothing;

insert into public.page_blocks (id, page, collection, item, sort, background)
values
  ('44000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'block_richtext', '45000000-0000-0000-0000-000000000001', 3, 'light'),
  ('44000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000002', 'block_richtext', '45000000-0000-0000-0000-000000000002', 1, 'light'),
  ('44000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000003', 'block_richtext', '45000000-0000-0000-0000-000000000003', 1, 'light'),
  ('44000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000003', 'block_form', '48000000-0000-0000-0000-000000000001', 2, 'light')
on conflict (id) do nothing;

insert into public.posts (id, title, name, slug, description, content, status, published_at, seo)
values (
  '49000000-0000-0000-0000-000000000001',
  'Bem-vindo ao blog do Events Manager',
  'Bem-vindo ao blog do Events Manager',
  'bem-vindo-ao-blog',
  'Novidades da plataforma, dicas para organizadores e bastidores dos eventos.',
  '<p>Este é o primeiro post do blog. Aqui vamos compartilhar novidades da plataforma, boas práticas para vender ingressos e histórias de quem organiza eventos com a gente.</p><h2>O que vem por aí</h2><ul><li>Guias passo a passo para publicar seu evento.</li><li>Dicas de divulgação e precificação.</li><li>Estudos de caso com organizadores.</li></ul>',
  'published',
  timezone('utc', now()),
  '{"title":"Bem-vindo ao blog","meta_description":"Novidades, dicas e bastidores dos eventos."}'::jsonb
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
