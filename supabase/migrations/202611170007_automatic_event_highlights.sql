-- O destaque passa a usar os eventos públicos mais recentes, em destaque único
-- ou slider. Preserva os campos editoriais existentes para não apagar conteúdo.
alter table public.block_event_highlight
  add column display_mode text not null default 'slider' check (display_mode in ('single', 'slider')),
  add column max_items integer not null default 5 check (max_items between 1 and 12),
  alter column headline drop not null,
  alter column button_url drop not null;
