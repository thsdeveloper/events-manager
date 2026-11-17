-- Later feature migrations reopened direct Data API access. All reads and
-- writes for these resources must pass through Fastify's ownership checks.
revoke all on table public.event_coupons, public.registration_tickets, public.event_pages
  from public, anon, authenticated;
grant select, insert, update, delete on table public.event_coupons, public.registration_tickets, public.event_pages
  to service_role;

-- Uploads must pass through API authentication, file inspection and limits.
-- The media bucket remains publicly readable for published site assets.
drop policy if exists authenticated_upload_storage on storage.objects;
drop policy if exists owner_manage_storage on storage.objects;
