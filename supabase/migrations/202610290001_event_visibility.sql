begin;

alter table public.events
  add column visibility text not null default 'public'
  check (visibility in ('public', 'unlisted'));

comment on column public.events.visibility is
  'public: discoverable; unlisted: accessible through its direct link using the API.';

create index events_public_catalog_idx
  on public.events (start_date)
  where status = 'published' and visibility = 'public';

-- Public discovery through direct database access also omits unlisted events.
-- The API authorizes organizer reads and serves published direct links explicitly.
alter policy read_events on public.events using (
  (status = 'published' and visibility = 'public')
  or (select public.owns_event(id))
  or (select public.is_admin())
);
alter policy read_tickets on public.event_tickets using (
  (
    status = 'active' and visibility = 'public'
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'published' and e.visibility = 'public'
    )
  )
  or (select public.owns_event(event_id))
  or (select public.is_admin())
);

commit;
