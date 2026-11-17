-- Baseline needed by a fresh cloud deployment; never create demo users or events.
-- Preserve all settings already managed by the superadmin.
insert into public.site_settings (id, title, description, tagline, accent_color)
select '10000000-0000-0000-0000-000000000001', 'Flouvi',
  'Descubra e gerencie experiências inesquecíveis.', 'Eventos que conectam pessoas', '#5422ff'
where not exists (select 1 from public.site_settings);

insert into public.event_configurations (id) values (1) on conflict (id) do nothing;

insert into public.event_categories (id, name, slug, description, icon, color, sort)
values
  ('50000000-0000-0000-0000-000000000001', 'Tecnologia', 'tecnologia', 'Conferências, workshops e meetups.', 'laptop', '#6644ff', 1),
  ('50000000-0000-0000-0000-000000000002', 'Música', 'musica', 'Shows, festivais e apresentações.', 'music', '#ec4899', 2),
  ('50000000-0000-0000-0000-000000000003', 'Negócios', 'negocios', 'Palestras, networking e treinamentos corporativos.', 'briefcase', '#0ea5e9', 3),
  ('50000000-0000-0000-0000-000000000004', 'Educação', 'educacao', 'Cursos, oficinas e congressos acadêmicos.', 'graduation-cap', '#22c55e', 4),
  ('50000000-0000-0000-0000-000000000005', 'Gastronomia', 'gastronomia', 'Degustações, festivais de comida e aulas de culinária.', 'utensils-crossed', '#f97316', 5),
  ('50000000-0000-0000-0000-000000000006', 'Esporte', 'esporte', 'Corridas, campeonatos e competições.', 'trophy', '#eab308', 6),
  ('50000000-0000-0000-0000-000000000007', 'Saúde e bem-estar', 'saude-e-bem-estar', 'Retiros, terapias e encontros de autocuidado.', 'heart-pulse', '#14b8a6', 7),
  ('50000000-0000-0000-0000-000000000008', 'Arte e cultura', 'arte-e-cultura', 'Exposições, saraus e mostras culturais.', 'palette', '#8b5cf6', 8),
  ('50000000-0000-0000-0000-000000000009', 'Teatro', 'teatro', 'Peças, stand-up e espetáculos de palco.', 'drama', '#ef4444', 9),
  ('50000000-0000-0000-0000-000000000010', 'Religioso', 'religioso', 'Cultos, congressos e encontros de fé.', 'church', '#6366f1', 10),
  ('50000000-0000-0000-0000-000000000011', 'Infantil', 'infantil', 'Programação para crianças e famílias.', 'baby', '#64748b', 11),
  ('50000000-0000-0000-0000-000000000012', 'Comunidade', 'comunidade', 'Encontros de bairro, voluntariado e causas sociais.', 'users', '#0f172a', 12)
on conflict do nothing;
