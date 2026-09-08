-- CMS gerenciado pelo superadmin: limpeza do que não é usado, invariantes de
-- URL no banco e integridade entre páginas e seus blocos polimórficos.

-- ---------------------------------------------------------------------------
-- 1. Limpeza: ai_prompts veio do template Directus e nenhuma camada a lê.
-- ---------------------------------------------------------------------------
drop policy if exists public_read_prompts on public.ai_prompts;
drop table if exists public.ai_prompts;

-- ---------------------------------------------------------------------------
-- 2. Invariantes de URL. Os mesmos padrões vivem em
--    packages/contracts/src/cms.ts (permalinkSchema, slugSchema); o banco é a
--    última linha de defesa contra um caminho que nunca resolveria no site.
-- ---------------------------------------------------------------------------
alter table public.pages
  drop constraint if exists pages_permalink_format,
  add constraint pages_permalink_format check (
    permalink = '/'
    or permalink ~ '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$'
  );

alter table public.posts
  drop constraint if exists posts_slug_format,
  add constraint posts_slug_format check (
    slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  );

alter table public.redirects
  drop constraint if exists redirects_url_from_relative,
  add constraint redirects_url_from_relative check (
    url_from is null or (url_from ~ '^/' and url_from !~ '^//')
  );

-- ---------------------------------------------------------------------------
-- 3. Bloco de eventos: o filtro por categoria passa a ser uma FK real, para a
--    exclusão de uma categoria não deixar o bloco apontando para um id morto.
-- ---------------------------------------------------------------------------
-- A migration de hardening já criou block_events_category_fk; ela sai para o
-- PostgREST enxergar uma única relação ao expandir a categoria do bloco.
alter table public.block_events
  drop constraint if exists block_events_category_fk,
  drop constraint if exists block_events_filter_by_category_fkey,
  add constraint block_events_filter_by_category_fkey
    foreign key (filter_by_category) references public.event_categories(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Imagem padrão de compartilhamento (Open Graph) nas configurações do site.
-- ---------------------------------------------------------------------------
alter table public.site_settings
  add column if not exists default_og_image uuid references public.media_files(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Blocos polimórficos: page_blocks.item aponta para uma das tabelas
--    block_* sem FK. Ao remover o page_block (ou a página, em cascata), o item
--    correspondente é removido também, para não acumular linhas órfãs.
-- ---------------------------------------------------------------------------
create or replace function public.delete_page_block_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- old.collection é restrito pelo check de page_blocks aos nomes block_*;
  -- format('%I') ainda protege a identidade contra qualquer valor inesperado.
  execute format('delete from public.%I where id = $1', old.collection) using old.item;
  return old;
end;
$$;

revoke execute on function public.delete_page_block_item() from public, anon, authenticated;

drop trigger if exists page_blocks_delete_item on public.page_blocks;
create trigger page_blocks_delete_item
  after delete on public.page_blocks
  for each row execute procedure public.delete_page_block_item();

-- ---------------------------------------------------------------------------
-- 6. A data de atualização da página acompanha seus blocos: é ela que
--    alimenta o lastmod do sitemap e a invalidação de cache do site.
-- ---------------------------------------------------------------------------
create or replace function public.touch_page_from_block()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.pages
  set date_updated = pg_catalog.timezone('utc', pg_catalog.now())
  where id = coalesce(new.page, old.page);
  return coalesce(new, old);
end;
$$;

revoke execute on function public.touch_page_from_block() from public, anon, authenticated;

drop trigger if exists page_blocks_touch_page on public.page_blocks;
create trigger page_blocks_touch_page
  after insert or update or delete on public.page_blocks
  for each row execute procedure public.touch_page_from_block();

-- ---------------------------------------------------------------------------
-- 7. date_updated existia nestas tabelas sem gatilho que o mantivesse.
-- ---------------------------------------------------------------------------
drop trigger if exists navigation_updated_at on public.navigation;
create trigger navigation_updated_at
  before update on public.navigation for each row execute procedure public.set_updated_at();

drop trigger if exists navigation_items_updated_at on public.navigation_items;
create trigger navigation_items_updated_at
  before update on public.navigation_items for each row execute procedure public.set_updated_at();

drop trigger if exists forms_updated_at on public.forms;
create trigger forms_updated_at
  before update on public.forms for each row execute procedure public.set_updated_at();

drop trigger if exists redirects_updated_at on public.redirects;
create trigger redirects_updated_at
  before update on public.redirects for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Índices para as listagens do painel e para as consultas públicas.
-- ---------------------------------------------------------------------------
create index if not exists pages_status_published_idx on public.pages(status, published_at desc);
create index if not exists posts_status_published_idx on public.posts(status, published_at desc);
create index if not exists form_submissions_form_timestamp_idx on public.form_submissions(form, "timestamp" desc);
create index if not exists media_files_date_created_idx on public.media_files(date_created desc);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id, date_created desc);
