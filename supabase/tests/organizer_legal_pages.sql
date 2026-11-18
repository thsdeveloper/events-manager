begin;
select '1..1';
do $$
declare link text; doc public.pages%rowtype;
begin
 foreach link in array array['/termos-de-uso','/politica-de-acesso','/politica-de-privacidade'] loop
  select * into doc from public.pages where permalink=link;
  assert found and doc.status='published' and doc.published_at<=now(), 'acceptance document must be public: '||link;
  assert exists(select 1 from public.page_blocks b join public.block_richtext r on r.id=b.item where b.page=doc.id and b.collection='block_richtext' and length(r.content)>500), 'document must be editable CMS content';
  assert exists(select 1 from public.navigation_items n where n.navigation='footer' and n.page=doc.id), 'footer must link to document';
 end loop;
end;
$$;
select 'ok 1 - organizer acceptance documents are published, editable and linked';
rollback;
