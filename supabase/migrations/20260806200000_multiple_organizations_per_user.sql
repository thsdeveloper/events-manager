-- An organizer may run more than one company, so the one-row-per-user rule goes
-- away. Ownership is still the user_id column; only its uniqueness is dropped.
alter table public.organizers
  drop constraint if exists organizers_user_id_key;

-- Ownership lookups now return many rows and happen on every admin request.
create index if not exists organizers_user_id_idx on public.organizers (user_id);

-- Remembers which organization the user last worked in, so a new session opens
-- where the previous one stopped. Nullable: a user may have none yet.
alter table public.profiles
  add column if not exists active_organizer_id uuid;

alter table public.profiles
  drop constraint if exists profiles_active_organizer_id_fkey,
  add constraint profiles_active_organizer_id_fkey
    foreign key (active_organizer_id) references public.organizers(id) on delete set null;

comment on column public.profiles.active_organizer_id is
  'Last organization the user had open in the admin panel.';

-- RLS already scoped organizers by user_id rather than assuming a single row,
-- so the read/update policies keep working. This one is restated to make the
-- multi-row intent explicit and to cover deletes, which had no policy at all.
drop policy if exists "delete_organizer" on public.organizers;
create policy "delete_organizer" on public.organizers
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
