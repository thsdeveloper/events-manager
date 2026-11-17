-- TAP output for `supabase test db --local/--linked`; also works with psql.
-- Read-only assertions; no application fixtures or remote services required.
begin;
select '1..1';
do $$
declare target_table text; target_role text;
begin
  foreach target_table in array array['event_coupons', 'registration_tickets', 'event_pages'] loop
    foreach target_role in array array['anon', 'authenticated'] loop
      if has_table_privilege(target_role, 'public.' || target_table, 'SELECT,INSERT,UPDATE,DELETE') then
        raise exception '% can bypass the API for %', target_role, target_table;
      end if;
    end loop;
    if not has_table_privilege('service_role', 'public.' || target_table, 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'API service role lost access to %', target_table;
    end if;
  end loop;
  if exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname in ('authenticated_upload_storage', 'owner_manage_storage')
  ) then
    raise exception 'Browser uploads can bypass API file validation';
  end if;
end $$;
select 'ok 1 - API security boundaries and storage upload restrictions are intact';
rollback;
