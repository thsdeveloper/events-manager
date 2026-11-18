-- Run against the local database with psql -v ON_ERROR_STOP=1 -f this-file.
-- All test content is rolled back.
begin;
select '1..1';
do $$
begin
  if to_regclass('public.block_event_highlight') is null then
    raise exception 'The CMS must persist event highlight blocks';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
    and table_name = 'block_event_highlight' and column_name = 'display_mode') then
    raise exception 'Event highlights must support automatic sliders';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.block_event_highlight'::regclass) then
    raise exception 'Event highlights must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.block_event_highlight', 'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated', 'public.block_event_highlight', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Event highlights must only be accessed through the API';
  end if;
end $$;
set local role service_role;
do $$
declare
  test_page uuid;
  test_item uuid;
begin
  insert into public.pages (title, permalink, status)
    values ('Highlight regression', '/highlight-regression-' || gen_random_uuid(), 'draft') returning id into test_page;
  insert into public.block_event_highlight default values returning id into test_item;
  insert into public.page_blocks (page, collection, item, sort)
    values (test_page, 'block_event_highlight', test_item, 1);
  if not exists (select 1 from public.block_event_highlight where id = test_item
    and display_mode = 'slider' and max_items = 5
    and image_position = 'right' and button_label = 'Comprar ingressos') then
    raise exception 'The block must keep its default crop and ticket label';
  end if;
  delete from public.pages where id = test_page;
  if exists (select 1 from public.block_event_highlight where id = test_item) then
    raise exception 'Deleting the page must clean up its highlight item';
  end if;
end $$;
select 'ok 1 - event highlights preserve API access, defaults and page cleanup';
rollback;
