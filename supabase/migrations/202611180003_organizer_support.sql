-- Support operations are available only through the authenticated superadmin API.
create index if not exists audit_logs_resource_date_idx
 on public.audit_logs(resource_type, resource_id, date_created desc, id);

create or replace function public.get_organizer_support_detail(target_organizer uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'organizer',to_jsonb(o),
  'owner',(select jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,'email',p.email,'phone',p.phone,'document',p.document,'status',p.status,'phone_verified_at',p.phone_verified_at) from public.profiles p where p.id=o.user_id),
  'metrics',jsonb_build_object(
   'events',(select count(*) from public.events e where e.organizer_id=o.id),
   'publishedEvents',(select count(*) from public.events e where e.organizer_id=o.id and e.status='published'),
   'registrations',(select count(*) from public.event_registrations r join public.events e on e.id=r.event_id where e.organizer_id=o.id),
   'ticketsSold',(select coalesce(sum(r.quantity),0) from public.event_registrations r join public.events e on e.id=r.event_id where e.organizer_id=o.id and r.payment_status='paid'),
   'grossRevenue',(select coalesce(sum(r.total_amount),0) from public.event_registrations r join public.events e on e.id=r.event_id where e.organizer_id=o.id and r.payment_status='paid'),
   'failedPayments',(select count(*) from public.payment_transactions t join public.event_registrations r on r.id=t.registration_id join public.events e on e.id=r.event_id where e.organizer_id=o.id and t.status='failed'),
   'availableBalance',public.get_organizer_available_balance(o.id),
   'reservedPayouts',(select coalesce(sum(p.amount),0) from public.organizer_payouts p where p.organizer_id=o.id and p.status in ('pending','processing')),
   'completedPayouts',(select coalesce(sum(p.amount),0) from public.organizer_payouts p where p.organizer_id=o.id and p.status='completed')
  )
 ) from public.organizers o where o.id=target_organizer;
$$;

create or replace function public.list_organizer_support(target_page integer,target_limit integer,target_search text,target_status text,target_sort text,target_direction text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; pattern text;
begin
 if target_page<1 or target_limit<1 or target_limit>100 or target_sort not in ('name','email','status','payout_status','date_created') or target_direction not in ('asc','desc') then raise exception 'INVALID_QUERY'; end if;
 pattern := '%' || replace(replace(replace(coalesce(target_search,''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
 with filtered as materialized (
  select o.* from public.organizers o where (target_status is null or o.status=target_status)
  and (coalesce(target_search,'')='' or o.name ilike pattern or o.email ilike pattern or coalesce(o.document,'') ilike pattern)
 ), page as (
  select * from filtered o order by
   case when target_direction='asc' then case target_sort when 'name' then o.name when 'email' then o.email when 'status' then o.status when 'payout_status' then o.payout_status else o.date_created::text end end asc,
   case when target_direction='desc' then case target_sort when 'name' then o.name when 'email' then o.email when 'status' then o.status when 'payout_status' then o.payout_status else o.date_created::text end end desc,
   o.id
  limit target_limit offset (target_page-1)*target_limit
 )
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('metrics',jsonb_build_object(
  'events',(select count(*) from public.events e where e.organizer_id=o.id),
  'ticketsSold',(select coalesce(sum(r.quantity),0) from public.event_registrations r join public.events e on e.id=r.event_id where e.organizer_id=o.id and r.payment_status='paid'),
  'grossRevenue',(select coalesce(sum(r.total_amount),0) from public.event_registrations r join public.events e on e.id=r.event_id where e.organizer_id=o.id and r.payment_status='paid')
 ))) from page o),'[]'::jsonb),'pagination',jsonb_build_object('page',target_page,'limit',target_limit,'total',(select count(*) from filtered),'pageCount',ceil((select count(*) from filtered)::numeric/target_limit))) into result;
 return result;
end;
$$;

create or replace function public.list_organizer_support_records(target_organizer uuid,target_kind text,target_page integer,target_limit integer)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare records jsonb; total bigint;
begin
 if not exists(select 1 from public.organizers where id=target_organizer) then return null; end if;
 if target_page<1 or target_limit<1 or target_limit>100 then raise exception 'INVALID_QUERY'; end if;
 if target_kind='events' then
  select count(*) into total from public.events where organizer_id=target_organizer;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into records from (
   select e.id,e.title,e.slug,e.status,e.start_date,e.end_date,e.location_name,e.visibility,e.date_created,
    (select count(*) from public.event_registrations r where r.event_id=e.id) as registrations
   from public.events e where e.organizer_id=target_organizer order by e.date_created desc,e.id limit target_limit offset (target_page-1)*target_limit
  )x;
 elsif target_kind='transactions' then
  select count(*) into total from public.payment_transactions t join public.event_registrations r on r.id=t.registration_id join public.events e on e.id=r.event_id where e.organizer_id=target_organizer;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into records from (
   select t.id,t.registration_id,t.provider,t.provider_object_id,t.status,t.amount,t.provider_fee,t.platform_fee,t.organizer_net,t.date_created,
    r.participant_name,r.participant_email,e.id as event_id,e.title as event_title
   from public.payment_transactions t join public.event_registrations r on r.id=t.registration_id join public.events e on e.id=r.event_id
   where e.organizer_id=target_organizer order by t.date_created desc,t.id limit target_limit offset (target_page-1)*target_limit
  )x;
 elsif target_kind='payouts' then
  select count(*) into total from public.organizer_payouts where organizer_id=target_organizer;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into records from (
   select p.id,p.amount,p.net_amount,p.provider_fee,p.status,p.pix_key,p.pix_key_type,p.provider,p.provider_payout_id,p.receipt_url,p.failure_reason,p.requested_at,p.processed_at
   from public.organizer_payouts p where p.organizer_id=target_organizer order by p.requested_at desc,p.id limit target_limit offset (target_page-1)*target_limit
  )x;
 elsif target_kind='activity' then
  select count(*) into total from public.audit_logs a where (a.resource_type='organizer' and a.resource_id=target_organizer::text)
   or (a.resource_type='organizer_payout' and exists(select 1 from public.organizer_payouts p where p.organizer_id=target_organizer and p.id::text=a.resource_id));
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into records from (
   select a.id,a.action,a.date_created,a.before_data,a.after_data,a.metadata->>'reason' as reason,
    jsonb_build_object('id',p.id,'name',concat_ws(' ',p.first_name,p.last_name),'email',p.email) as actor
   from public.audit_logs a left join public.profiles p on p.id=a.actor_id where (a.resource_type='organizer' and a.resource_id=target_organizer::text)
    or (a.resource_type='organizer_payout' and exists(select 1 from public.organizer_payouts p where p.organizer_id=target_organizer and p.id::text=a.resource_id))
   order by a.date_created desc,a.id limit target_limit offset (target_page-1)*target_limit
  )x;
 else raise exception 'INVALID_QUERY'; end if;
 return jsonb_build_object('data',records,'total',total);
end;
$$;

create or replace function public.update_organizer_support(target_organizer uuid,target_actor uuid,target_patch jsonb,target_reason text,target_reviewed_pix_key text,target_context jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous public.organizers%rowtype; updated public.organizers%rowtype; key_changed boolean;
begin
 if length(trim(coalesce(target_reason,'')))<5 then raise exception 'REASON_REQUIRED'; end if;
 if exists(select 1 from jsonb_object_keys(target_patch) k where k not in ('name','email','phone','description','website','status','payout_status','payout_pix_key','payout_pix_key_type')) then raise exception 'INVALID_PATCH'; end if;
 select * into previous from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 updated:=jsonb_populate_record(previous,target_patch);
 key_changed:=target_patch ? 'payout_pix_key' or target_patch ? 'payout_pix_key_type';
 if key_changed then
  if (updated.payout_pix_key is null) <> (updated.payout_pix_key_type is null) then raise exception 'PAYOUT_ACCOUNT_INVALID'; end if;
  updated.payout_status:=case when updated.payout_pix_key is null then 'not_configured' else 'pending_review' end;
 end if;
 if updated.status<>'active' and updated.payout_status='enabled' then updated.payout_status:='blocked'; end if;
 if target_patch->>'payout_status'='enabled' then
  if key_changed or updated.status<>'active' or nullif(updated.payout_pix_key,'') is null or updated.payout_pix_key_type is null then raise exception 'PAYOUT_ACCOUNT_INVALID'; end if;
  if target_reviewed_pix_key is distinct from previous.payout_pix_key then raise exception 'PIX_REVIEW_CHANGED'; end if;
 end if;
 update public.organizers set name=updated.name,email=updated.email,phone=updated.phone,description=updated.description,website=updated.website,
  status=updated.status,payout_status=updated.payout_status,payout_pix_key=updated.payout_pix_key,payout_pix_key_type=updated.payout_pix_key_type
 where id=target_organizer returning * into updated;
 if updated.status='active' then update public.profiles set role='organizer' where id=updated.user_id and role<>'super_admin'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,metadata)
 values(target_actor,'organizer.updated','organizer',target_organizer::text,to_jsonb(previous),to_jsonb(updated),coalesce(target_context,'{}')||jsonb_build_object('reason',target_reason));
 return to_jsonb(updated);
end;
$$;

create or replace function public.add_organizer_support_note(target_organizer uuid,target_actor uuid,target_note text,target_context jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.organizers where id=target_organizer) then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 if length(trim(coalesce(target_note,'')))<5 or length(target_note)>4000 then raise exception 'INVALID_NOTE'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata)
 values(target_actor,'organizer.support_note_added','organizer',target_organizer::text,jsonb_build_object('note',target_note),coalesce(target_context,'{}'));
 return jsonb_build_object('success',true);
end;
$$;

revoke execute on function public.get_organizer_support_detail(uuid),public.list_organizer_support(integer,integer,text,text,text,text),public.list_organizer_support_records(uuid,text,integer,integer),public.update_organizer_support(uuid,uuid,jsonb,text,text,jsonb),public.add_organizer_support_note(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.get_organizer_support_detail(uuid),public.list_organizer_support(integer,integer,text,text,text,text),public.list_organizer_support_records(uuid,text,integer,integer),public.update_organizer_support(uuid,uuid,jsonb,text,text,jsonb),public.add_organizer_support_note(uuid,uuid,text,jsonb) to service_role;
