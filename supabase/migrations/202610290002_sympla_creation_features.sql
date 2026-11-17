begin;

alter table public.events
 add column cover_image_alt text check (char_length(cover_image_alt) <= 240),
 add column description_en text check (char_length(description_en) <= 100000),
 add column description_es text check (char_length(description_es) <= 100000),
 add column location_tbd boolean not null default false,
 add column show_map boolean not null default true,
 add column location_street text,
 add column location_number text,
 add column location_complement text,
 add column location_neighborhood text,
 add column location_city text,
 add column location_state text,
 add column location_postal_code text,
 add column online_platform text check (online_platform in ('custom','youtube','zoom','google_meet','microsoft_teams','vimeo')),
 add constraint events_id_organizer_unique unique (id, organizer_id);

alter table public.event_configurations
 add column platform_fee_minimum numeric(12,2) not null default 0 check (platform_fee_minimum >= 0);
comment on column public.event_configurations.platform_fee_minimum is
 'Minimum platform fee per paid ticket unit in BRL; free tickets have zero platform fee.';

create table public.event_drafts (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.organizers(id) on delete cascade,
 "values" jsonb not null default '{}'::jsonb,
 current_step smallint not null default 0 check (current_step between 0 and 6),
 event_id uuid,
 date_created timestamptz not null default now(),
 date_updated timestamptz not null default now(),
 constraint event_drafts_id_organizer_unique unique (id, organizer_id),
 constraint event_drafts_values_object check (jsonb_typeof("values") = 'object' and octet_length("values"::text) <= 1048576),
 constraint event_drafts_event_organizer_fkey foreign key (event_id, organizer_id)
  references public.events(id, organizer_id) on delete set null (event_id)
);
alter table public.events
 add column source_draft_id uuid unique,
 add constraint events_source_draft_organizer_fkey foreign key (source_draft_id,organizer_id)
  references public.event_drafts(id,organizer_id) on delete set null (source_draft_id);

create index event_drafts_organizer_updated_idx on public.event_drafts(organizer_id,date_updated desc)
 where event_id is null;

create table public.event_ticket_groups (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 parent_id uuid,
 title text not null check (char_length(btrim(title)) between 1 and 120),
 sort integer not null default 0 check (sort >= 0),
 date_created timestamptz not null default now(),
 date_updated timestamptz not null default now(),
 constraint event_ticket_groups_id_event_unique unique (id,event_id),
 constraint event_ticket_groups_parent_event_fkey foreign key (parent_id,event_id)
  references public.event_ticket_groups(id,event_id) on delete cascade
);
create index event_ticket_groups_event_sort_idx on public.event_ticket_groups(event_id,sort,id);
create index event_ticket_groups_parent_idx on public.event_ticket_groups(parent_id);

alter table public.event_tickets
 add column group_id uuid,
 add column admission_type text not null default 'standard' check (admission_type in ('standard','half_price')),
 add constraint event_tickets_group_event_fkey foreign key (group_id,event_id)
  references public.event_ticket_groups(id,event_id) on delete set null (group_id);
create index event_tickets_group_sort_idx on public.event_tickets(group_id,sort,id);

create function public.touch_event_creation_updated_at()
returns trigger language plpgsql set search_path = '' as $function$
begin
 new.date_updated := now();
 return new;
end;
$function$;
create trigger event_drafts_updated_at before update on public.event_drafts
 for each row execute function public.touch_event_creation_updated_at();
create trigger event_ticket_groups_updated_at before update on public.event_ticket_groups
 for each row execute function public.touch_event_creation_updated_at();

create function public.check_event_ticket_group_depth()
returns trigger language plpgsql set search_path = '' as $function$
declare parent_parent uuid;
begin
 perform 1 from public.events e where e.id=new.event_id for update;
 if not found then raise exception using errcode='23503',message='Event not found.'; end if;
 if new.parent_id is null then return new; end if;
 if new.parent_id = new.id then
  raise exception using errcode='23514', message='A group cannot be its own parent.';
 end if;
 select g.parent_id into parent_parent from public.event_ticket_groups g
 where g.id=new.parent_id and g.event_id=new.event_id;
 if not found then
  raise exception using errcode='23503', message='The parent group must belong to the same event.';
 end if;
 if parent_parent is not null or exists (
  select 1 from public.event_ticket_groups g where g.parent_id=new.id
 ) then
  raise exception using errcode='23514', message='Only a main group and one subgroup level are supported.';
 end if;
 return new;
end;
$function$;
create trigger event_ticket_group_depth before insert or update of parent_id,event_id on public.event_ticket_groups
 for each row execute function public.check_event_ticket_group_depth();

-- A direct authenticated database request must obey the same publication gate
-- as the API. Ownership is checked against the resulting organizer_id.
alter policy update_events on public.events using (
 (select public.owns_event(id)) or (select public.is_admin())
) with check (
 exists (
  select 1 from public.organizers o
  where o.id=events.organizer_id and o.user_id=(select auth.uid())
   and (events.status<>'published' or o.status='active')
 )
 or (select public.is_admin())
);

alter table public.event_drafts enable row level security;
alter table public.event_ticket_groups enable row level security;
revoke all on public.event_drafts from anon;
grant select,insert,update,delete on public.event_drafts to authenticated,service_role;
grant select,insert,update,delete on public.event_ticket_groups to authenticated,service_role;
grant select on public.event_ticket_groups to anon;

create policy read_event_drafts on public.event_drafts for select using (
 exists (select 1 from public.organizers o where o.id=organizer_id and o.user_id=(select auth.uid()))
 or (select public.is_admin())
);
create policy create_event_drafts on public.event_drafts for insert with check (
 (event_id is null and exists (
  select 1 from public.organizers o
  where o.id=organizer_id and o.user_id=(select auth.uid()) and o.status in ('active','pending')
 ))
 or (select public.is_admin())
);
create policy update_event_drafts on public.event_drafts for update using (
 exists (select 1 from public.organizers o where o.id=organizer_id and o.user_id=(select auth.uid()))
 or (select public.is_admin())
) with check (
 exists (select 1 from public.organizers o where o.id=organizer_id and o.user_id=(select auth.uid()))
 or (select public.is_admin())
);
create policy delete_event_drafts on public.event_drafts for delete using (
 (event_id is null and exists (select 1 from public.organizers o where o.id=organizer_id and o.user_id=(select auth.uid())))
 or (select public.is_admin())
);
create policy read_event_ticket_groups on public.event_ticket_groups for select using (
 exists (select 1 from public.events e where e.id=event_id and e.status='published' and e.visibility='public')
 or (select public.owns_event(event_id))
 or (select public.is_admin())
);
create policy manage_event_ticket_groups on public.event_ticket_groups for all using (
 (select public.owns_event(event_id)) or (select public.is_admin())
) with check (
 (select public.owns_event(event_id)) or (select public.is_admin())
);

-- The API authorizes the organizer before invoking this operation. The complete
-- set and row locks keep a reorder atomic, including groups and hidden tickets.
create function public.reorder_event_tickets(p_event_id uuid,p_ticket_ids uuid[])
returns void language plpgsql set search_path = '' as $function$
declare expected_count integer;
begin
 perform 1 from public.events e where e.id=p_event_id for update;
 if not found then raise exception using errcode='23503',message='Event not found.'; end if;
 perform 1 from public.event_tickets t where t.event_id=p_event_id for update;
 select count(*) into expected_count from public.event_tickets t where t.event_id=p_event_id;
 if p_ticket_ids is null or cardinality(p_ticket_ids)=0
  or cardinality(p_ticket_ids)<>expected_count
  or (select count(distinct item) from unnest(p_ticket_ids) item)<>expected_count
  or exists (
   select 1 from unnest(p_ticket_ids) item
   where not exists (select 1 from public.event_tickets t where t.id=item and t.event_id=p_event_id)
  ) then
  raise exception using errcode='23514',message='The order must include each event ticket exactly once.';
 end if;
 update public.event_tickets t set sort=(position.ordinality-1)::integer,date_updated=now()
 from unnest(p_ticket_ids) with ordinality as position(ticket_id,ordinality)
 where t.id=position.ticket_id and t.event_id=p_event_id;
end;
$function$;
revoke all on function public.reorder_event_tickets(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.reorder_event_tickets(uuid,uuid[]) to service_role;
revoke all on function public.touch_event_creation_updated_at() from public,anon,authenticated;
revoke all on function public.check_event_ticket_group_depth() from public,anon,authenticated;

commit;
