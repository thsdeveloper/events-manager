-- API callers may update structured address fields without the legacy address string.
-- Keep event notifications independent of the frontend's address normalization.
create or replace function public.capture_event_notification()
returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; k text; data jsonb;
begin
 select user_id into owner_id from public.organizers where id=new.organizer_id;
 data:=jsonb_build_object('title',left(new.title,250),'eventId',new.id,'eventDate',new.start_date,'locationName',left(new.location_name,250),'path','/eventos/'||new.slug);
 if new.status='published' and (tg_op='INSERT' or old.status<>'published') then
  perform public.enqueue_email_notification('organization_event_published','published:'||new.id||':'||gen_random_uuid(),owner_id,new.organizer_id,data);
 end if;
 if tg_op='INSERT' then return new; end if;
 if new.status='cancelled' and old.status<>'cancelled' then k:='event_cancelled';
 elsif old.status='published' and new.status='published' and
  (new.start_date,new.end_date,new.event_type,new.location_name,new.location_address,new.location_tbd,
   new.location_street,new.location_number,new.location_complement,new.location_neighborhood,new.location_city,
   new.location_state,new.location_postal_code,new.latitude,new.longitude,new.online_platform,new.online_url)
  is distinct from
  (old.start_date,old.end_date,old.event_type,old.location_name,old.location_address,old.location_tbd,
   old.location_street,old.location_number,old.location_complement,old.location_neighborhood,old.location_city,
   old.location_state,old.location_postal_code,old.latitude,old.longitude,old.online_platform,old.online_url)
 then k:='event_changed';
 else return new; end if;
 insert into public.notification_event_batches(event_key,event_id,kind,payload)
 values(k||':'||new.id||':'||gen_random_uuid(),new.id,k,data||jsonb_build_object('path','/perfil?section=ingressos'));
 return new;
end $$;

drop trigger notification_event on public.events;
create trigger notification_event after insert or update of
 status,start_date,end_date,event_type,location_name,location_address,location_tbd,
 location_street,location_number,location_complement,location_neighborhood,location_city,
 location_state,location_postal_code,latitude,longitude,online_platform,online_url
on public.events for each row execute function public.capture_event_notification();

revoke all on function public.capture_event_notification() from public,anon,authenticated;
