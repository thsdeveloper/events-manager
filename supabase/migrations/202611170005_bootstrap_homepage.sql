-- A fresh installation must have a published CMS homepage. Never replace
-- pages or navigation already managed by the superadmin.
do $$
declare
  home_id uuid := gen_random_uuid();
  hero_id uuid := gen_random_uuid();
  events_id uuid := gen_random_uuid();
  buttons_id uuid := gen_random_uuid();
  menu_id text;
begin
  if exists (select 1 from public.pages where permalink = '/') then
    return;
  end if;

  insert into public.pages (id, title, permalink, status, published_at, seo)
  values (home_id, 'Início', '/', 'published', now(),
    '{"title":"Flouvi","meta_description":"Descubra eventos e viva experiências que conectam pessoas."}'::jsonb);

  insert into public.block_button_groups (id, sort) values (buttons_id, 1);
  insert into public.block_buttons (button_group, type, label, variant, url, sort)
  values (buttons_id, 'url', 'Explorar eventos', 'default', '/eventos', 1);
  insert into public.block_hero (id, tagline, headline, description, button_group, layout)
  values (hero_id, 'Sua próxima experiência começa aqui', 'Eventos que conectam pessoas',
    'Descubra experiências, encontre sua comunidade e faça parte de momentos que merecem ser vividos.',
    buttons_id, 'image_right');
  insert into public.block_events (id, headline, description, filter_featured, max_items, show_past_events)
  values (events_id, 'Próximos eventos', 'Encontre experiências para viver e compartilhar.', false, 10, false);
  insert into public.page_blocks (page, collection, item, sort, background)
  values (home_id, 'block_hero', hero_id, 1, 'light'),
         (home_id, 'block_events', events_id, 2, 'light');

  insert into public.navigation (id, title, is_active)
  values ('main', 'Navegação principal', true), ('footer', 'Rodapé', true)
  on conflict (id) do nothing;
  foreach menu_id in array array['main', 'footer'] loop
    if not exists (select 1 from public.navigation_items where navigation = menu_id) then
      insert into public.navigation_items (navigation, page, title, type, url, sort)
      values (menu_id, home_id, 'Início', 'page', null, 1),
             (menu_id, null, 'Eventos', 'url', '/eventos', 2),
             (menu_id, null, 'Blog', 'url', '/blog', 3);
    end if;
  end loop;
end $$;
