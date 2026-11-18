-- Additional accounts reuse the existing multi-organization schema.
create or replace function public.create_organizer_profile(
  target_user uuid,
  target_name text,
  target_email text,
  target_phone text,
  target_description text,
  target_website text,
  target_document text,
  target_logo uuid,
  target_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  organizer public.organizers%rowtype;
  normalized_document text := nullif(pg_catalog.regexp_replace(target_document, '[^0-9]', '', 'g'), '');
begin
  if target_status not in ('active', 'pending') then
    raise exception 'invalid organizer status';
  end if;

  -- Serialize signups for a fiscal document. Existing installations may contain
  -- historical duplicates, so this protects new signups without deleting rows.
  if normalized_document is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized_document, 0));
    if exists (
      select 1 from public.organizers o
      where pg_catalog.regexp_replace(o.document, '[^0-9]', '', 'g') = normalized_document
    ) then
      return null;
    end if;
  end if;

  insert into public.organizers (
    user_id, name, email, phone, description, website, document, logo, status
  ) values (
    target_user, target_name, target_email, target_phone, target_description,
    target_website, normalized_document, target_logo, target_status
  )
  returning * into organizer;

  if target_status = 'active' then
    update public.profiles p
    set role = case when p.role = 'super_admin' then p.role else 'organizer' end,
        active_organizer_id = organizer.id,
        date_updated = pg_catalog.timezone('utc', pg_catalog.now())
    where p.id = target_user;
  end if;

  return pg_catalog.to_jsonb(organizer);
exception
  when unique_violation then
    return null;
end;
$$;

revoke execute on function public.create_organizer_profile(uuid, text, text, text, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_organizer_profile(uuid, text, text, text, text, text, text, uuid, text) to service_role;
