-- Destaque de evento reutilizável nas páginas do CMS.
create table public.block_event_highlight (
  id uuid primary key default gen_random_uuid(),
  headline text not null check (char_length(btrim(headline)) between 1 and 150),
  description text check (char_length(description) <= 500),
  event_details text check (char_length(event_details) <= 200),
  image uuid references public.media_files(id) on delete set null,
  image_alt text check (char_length(image_alt) <= 200),
  image_position text not null default 'right' check (image_position in ('left', 'center', 'right')),
  button_label text not null default 'Comprar ingressos' check (char_length(btrim(button_label)) between 1 and 60),
  button_url text not null check (char_length(button_url) between 1 and 2000),
  date_created timestamptz not null default timezone('utc', now())
);

create index block_event_highlight_image_idx on public.block_event_highlight(image);

alter table public.block_event_highlight enable row level security;
revoke all on table public.block_event_highlight from public, anon, authenticated;
grant select, insert, update, delete on table public.block_event_highlight to service_role;

alter table public.page_blocks drop constraint page_blocks_collection_check;
alter table public.page_blocks add constraint page_blocks_collection_check check (
  collection in ('block_hero', 'block_richtext', 'block_gallery', 'block_pricing',
    'block_posts', 'block_events', 'block_form', 'block_event_highlight')
);
-- O gatilho page_blocks_delete_item existente já remove o item pelo nome da coleção.
