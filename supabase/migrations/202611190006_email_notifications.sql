-- Durable notifications: business changes and their outbox entries commit together.
-- No SMTP/network calls in triggers. Personal information is resolved only by the worker.
alter table public.profiles add column email_preferences jsonb not null default '{}'::jsonb
 check(jsonb_typeof(email_preferences)='object'
 and email_preferences - array['welcome','payment_updates','payment_reminders','event_updates','event_reminders','organization_notifications'] = '{}'::jsonb
 and not jsonb_path_exists(email_preferences,'$.* ? (@.type() != "boolean")'));
alter table public.organizers add column email_preferences jsonb not null default '{}'::jsonb
 check(jsonb_typeof(email_preferences)='object'
 and email_preferences - array['organization_updates','sales','refunds','payouts','receiving_account','event_publication'] = '{}'::jsonb
 and not jsonb_path_exists(email_preferences,'$.* ? (@.type() != "boolean")'));

create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), event_key text not null,
 kind text not null check(kind in ('welcome','purchase_pending','installment_paid','payment_reminder','purchase_refunded',
 'event_changed','event_cancelled','event_reminder','organization_created','organization_status','organization_sale',
 'organization_refund','organization_payout','organization_receiving','organization_event_published')),
 user_id uuid not null references auth.users(id) on delete cascade,
 organizer_id uuid references public.organizers(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=8192),
 status text not null default 'pending' check(status in ('pending','processing','sent','suppressed','failed')),
 attempts integer not null default 0 check(attempts>=0), next_attempt_at timestamptz not null default now(),
 lease_token uuid, locked_until timestamptz, last_error text, created_at timestamptz not null default now(), completed_at timestamptz,
 unique(event_key,user_id)
);
create index notification_outbox_due_idx on public.notification_outbox(next_attempt_at,created_at) where status in ('pending','processing');
create index notification_outbox_user_idx on public.notification_outbox(user_id);
create index notification_outbox_org_idx on public.notification_outbox(organizer_id);
create index notification_outbox_cleanup_idx on public.notification_outbox(completed_at) where completed_at is not null;
create table public.notification_event_batches (
 id uuid primary key default gen_random_uuid(), event_key text not null unique,
 event_id uuid not null references public.events(id) on delete cascade,
 kind text not null check(kind in ('event_changed','event_cancelled','event_reminder')),
 payload jsonb not null, last_user_id uuid, completed boolean not null default false, created_at timestamptz not null default now()
);
create index notification_event_batches_pending_idx on public.notification_event_batches(created_at) where not completed;
create index notification_event_batches_event_idx on public.notification_event_batches(event_id);
create index notification_registration_buyers_idx on public.event_registrations(event_id,user_id) where user_id is not null;
create index notification_installments_due_idx on public.payment_installments(due_date) where status in ('pending','overdue');
alter table public.notification_outbox enable row level security;
alter table public.notification_event_batches enable row level security;
revoke all on public.notification_outbox,public.notification_event_batches from anon,authenticated;
grant all on public.notification_outbox,public.notification_event_batches to service_role;

create function public.enqueue_email_notification(k text, event_key text, recipient uuid, organization uuid, data jsonb, available_at timestamptz default now())
returns void language sql security definer set search_path='' as $$
 insert into public.notification_outbox(kind,event_key,user_id,organizer_id,payload,next_attempt_at)
 select k,event_key,recipient,organization,data,available_at where recipient is not null
 on conflict(event_key,user_id) do nothing;
$$;

create function public.capture_account_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and (tg_op='INSERT' or old.email_confirmed_at is null) then
  perform public.enqueue_email_notification('welcome','welcome:'||new.id,new.id,null,'{"path":"/perfil"}'::jsonb);
 end if;
 return new;
end $$;
create trigger notification_account_verified after insert or update of email_confirmed_at on auth.users for each row execute function public.capture_account_notification();

create function public.capture_organization_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if tg_op='INSERT' then k:='organization_created';
 elsif new.status is distinct from old.status then k:='organization_status'; else return new; end if;
 perform public.enqueue_email_notification(k,k||':'||new.id||':'||gen_random_uuid(),new.user_id,new.id,
  jsonb_build_object('title',left(new.name,250),'status',new.status,'path','/admin/configuracoes'));
 return new;
end $$;
create trigger notification_organization after insert or update of status on public.organizers for each row execute function public.capture_organization_notification();

create function public.capture_registration_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.events%rowtype; owner_id uuid; purchase text; data jsonb;
begin
 select * into e from public.events where id=new.event_id;
 select user_id into owner_id from public.organizers where id=e.organizer_id;
 purchase:=coalesce(new.additional_info->>'checkout_group_id',new.id::text);
 data:=jsonb_build_object('title',left(e.title,250),'registrationId',new.id,'eventId',e.id,'purchaseId',purchase,'path','/perfil/ingressos/'||purchase);
 if tg_op='INSERT' and new.payment_status='pending' then
  perform public.enqueue_email_notification('purchase_pending','pending:'||purchase,new.user_id,null,data,now()+interval '2 minutes');
 end if;
 if new.payment_status='paid' and (tg_op='INSERT' or old.payment_status is distinct from new.payment_status)
 and not exists(select 1 from public.event_registrations x where x.event_id=new.event_id and x.user_id is not distinct from new.user_id
   and coalesce(x.additional_info->>'checkout_group_id',x.id::text)=purchase and x.payment_status not in ('paid','free')) then
  perform public.enqueue_email_notification('organization_sale','sale:'||purchase,owner_id,e.organizer_id,
   data||jsonb_build_object('path','/admin/financeiro','status',new.payment_status),now()+interval '2 minutes');
 end if;
 if new.payment_status='refunded' and (tg_op='INSERT' or old.payment_status is distinct from new.payment_status) then
  perform public.enqueue_email_notification('purchase_refunded','refund:'||new.id,new.user_id,null,data);
  perform public.enqueue_email_notification('organization_refund','org-refund:'||new.id,owner_id,e.organizer_id,data||jsonb_build_object('path','/admin/financeiro'));
 end if;
 return new;
end $$;
create trigger notification_registration after insert or update of payment_status on public.event_registrations for each row execute function public.capture_registration_notification();

create function public.capture_installment_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.event_registrations%rowtype; title text;
begin
 if new.status<>'paid' or (tg_op='UPDATE' and old.status='paid') then return new; end if;
 select * into r from public.event_registrations where id=new.registration_id;
 -- Final payment already produces the essential purchase confirmation with tickets.
 if not r.is_installment_payment or
  (select count(*) from public.payment_installments where registration_id=r.id and status='paid')>=new.total_installments
 then return new; end if;
 select e.title into title from public.events e where e.id=r.event_id;
 perform public.enqueue_email_notification('installment_paid','installment-paid:'||new.id,r.user_id,null,
  jsonb_build_object('title',left(title,250),'registrationId',r.id,'installmentId',new.id,'installmentNumber',new.installment_number,
  'totalInstallments',new.total_installments,'amount',new.amount,'path','/perfil/ingressos/'||coalesce(r.additional_info->>'checkout_group_id',r.id::text)));
 return new;
end $$;
create trigger notification_installment after insert or update of status on public.payment_installments for each row execute function public.capture_installment_notification();

create function public.capture_event_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid; k text; data jsonb;
begin
 select user_id into owner_id from public.organizers where id=new.organizer_id;
 data:=jsonb_build_object('title',left(new.title,250),'eventId',new.id,'eventDate',new.start_date,'locationName',left(new.location_name,250),'path','/eventos/'||new.slug);
 if new.status='published' and (tg_op='INSERT' or old.status<>'published') then
  perform public.enqueue_email_notification('organization_event_published','published:'||new.id||':'||gen_random_uuid(),owner_id,new.organizer_id,data);
 end if;
 if tg_op='INSERT' then return new; end if;
 if new.status='cancelled' and old.status<>'cancelled' then k:='event_cancelled';
 elsif old.status='published' and new.status='published' and (new.start_date,new.end_date,new.location_name,new.location_address,new.online_url) is distinct from (old.start_date,old.end_date,old.location_name,old.location_address,old.online_url) then k:='event_changed';
 else return new; end if;
 insert into public.notification_event_batches(event_key,event_id,kind,payload)
 values(k||':'||new.id||':'||gen_random_uuid(),new.id,k,data||jsonb_build_object('path','/perfil?section=ingressos'));
 return new;
end $$;
create trigger notification_event after insert or update of status,start_date,end_date,location_name,location_address,online_url on public.events for each row execute function public.capture_event_notification();

create function public.capture_receiving_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare o public.organizers%rowtype;
begin
 if new.status not in ('approved','rejected') or new.status is not distinct from old.status then return new; end if;
 select * into o from public.organizers where id=new.organizer_id;
 perform public.enqueue_email_notification('organization_receiving','receiving:'||new.id||':'||new.status,o.user_id,o.id,
  jsonb_build_object('title',left(o.name,250),'status',new.status,'path','/perfil/organizador/'||o.id||'/recebimento'));
 return new;
end $$;
create trigger notification_receiving after update of status on public.organizer_receiving_requests for each row execute function public.capture_receiving_notification();

create function public.capture_payout_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare o public.organizers%rowtype;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
 if new.status='processing' then return new; end if;
 select * into o from public.organizers where id=new.organizer_id;
 perform public.enqueue_email_notification('organization_payout','payout:'||new.id||':'||new.status,o.user_id,o.id,
  jsonb_build_object('title',left(o.name,250),'status',new.status,'amount',new.net_amount,'path','/admin/financeiro'));
 return new;
end $$;
create trigger notification_payout after insert or update of status on public.organizer_payouts for each row execute function public.capture_payout_notification();

create function public.schedule_email_notifications() returns void language plpgsql security definer set search_path='' as $$
declare batch public.notification_event_batches%rowtype; last_recipient uuid; recipient_count integer;
begin
 if not pg_try_advisory_xact_lock(191106,1) then return; end if;
 insert into public.notification_event_batches(event_key,event_id,kind,payload)
 select 'event-reminder:'||e.id||':'||e.start_date,e.id,'event_reminder',
  jsonb_build_object('title',left(e.title,250),'eventId',e.id,'eventDate',e.start_date,'locationName',left(e.location_name,250),'path','/perfil?section=ingressos')
 from public.events e where e.status='published' and e.start_date>now() and e.start_date<=now()+interval '24 hours'
 and not exists(select 1 from public.notification_event_batches b where b.event_key='event-reminder:'||e.id||':'||e.start_date)
 order by e.start_date limit 100 on conflict(event_key) do nothing;
 for batch in select * from public.notification_event_batches where not completed order by created_at limit 5 for update skip locked loop
  with targets as materialized (
   select distinct r.user_id from public.event_registrations r where r.event_id=batch.event_id and r.user_id is not null
   and r.status<>'cancelled' and (batch.kind<>'event_reminder' or r.payment_status in ('paid','free'))
   and (batch.last_user_id is null or r.user_id>batch.last_user_id) order by r.user_id limit 200
  ), queued as (
   insert into public.notification_outbox(kind,event_key,user_id,payload)
   select batch.kind,batch.event_key,t.user_id,batch.payload from targets t on conflict(event_key,user_id) do nothing returning id
  ) select count(*),(array_agg(user_id order by user_id desc))[1] into recipient_count,last_recipient from targets;
  update public.notification_event_batches set last_user_id=coalesce(last_recipient,last_user_id),completed=recipient_count<200 where id=batch.id;
 end loop;
 insert into public.notification_outbox(kind,event_key,user_id,payload)
 select 'payment_reminder','payment-reminder:'||p.id||':'||p.due_date||':'||case when p.due_date>now() then 'due' else 'overdue' end,r.user_id,
  jsonb_build_object('title',left(e.title,250),'registrationId',r.id,'installmentId',p.id,'dueDate',p.due_date,
  'phase',case when p.due_date>now() then 'due' else 'overdue' end,'installmentNumber',p.installment_number,'totalInstallments',p.total_installments,
  'amount',p.amount,'path','/perfil/ingressos/'||coalesce(r.additional_info->>'checkout_group_id',r.id::text))
 from public.payment_installments p join public.event_registrations r on r.id=p.registration_id join public.events e on e.id=r.event_id
 where p.status in ('pending','overdue') and r.user_id is not null and r.is_installment_payment and r.status<>'cancelled'
 and e.status<>'cancelled' and e.end_date>now() and r.payment_status='pending'
 and ((p.due_date>now() and p.due_date<=now()+interval '24 hours') or (p.due_date<=now()-interval '24 hours' and p.due_date>now()-interval '48 hours'))
 and not exists(select 1 from public.notification_outbox q where q.user_id=r.user_id and q.event_key='payment-reminder:'||p.id||':'||p.due_date||':'||case when p.due_date>now() then 'due' else 'overdue' end)
 order by p.due_date limit 500 on conflict(event_key,user_id) do nothing;
 -- Bounded retention; queue contents do not become an indefinite copy of customer data.
 delete from public.notification_outbox where id in (select id from public.notification_outbox where completed_at<now()-interval '90 days' limit 1000);
 delete from public.notification_event_batches where id in (select id from public.notification_event_batches where completed and created_at<now()-interval '90 days' limit 1000);
end $$;

create function public.claim_email_notifications(batch_size integer default 10)
returns setof public.notification_outbox language plpgsql security definer set search_path='' as $$
begin
 update public.notification_outbox set status='failed',completed_at=now(),last_error='attempt_limit_reached',lease_token=null,locked_until=null
 where attempts>=8 and status='processing' and locked_until<=now();
 return query with candidates as (
  select id from public.notification_outbox where attempts<8 and next_attempt_at<=now()
  and (status='pending' or (status='processing' and locked_until<=now()))
  order by next_attempt_at,created_at limit greatest(1,least(batch_size,10)) for update skip locked
 ) update public.notification_outbox q set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),locked_until=now()+interval '15 minutes'
 from candidates c where q.id=c.id returning q.*;
end $$;

create function public.finish_email_notification(job_id uuid, token uuid, outcome text, retry_at timestamptz default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if outcome not in ('sent','suppressed','failed') then raise exception 'invalid notification outcome'; end if;
 update public.notification_outbox set
 status=case when outcome='failed' and attempts<8 and retry_at is not null then 'pending' else outcome end,
 next_attempt_at=coalesce(retry_at,next_attempt_at),lease_token=null,locked_until=null,
 last_error=case when outcome='failed' then 'delivery_failed' else null end,
 completed_at=case when outcome='failed' and attempts<8 and retry_at is not null then null else now() end
 where id=job_id and lease_token=token and status='processing' and locked_until>now();
 get diagnostics affected=row_count; return affected=1;
end $$;

create function public.email_notification_recipient(job_id uuid, token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.notification_outbox%rowtype; u auth.users%rowtype; p public.profiles%rowtype; o public.organizers%rowtype;
 r public.event_registrations%rowtype; i public.payment_installments%rowtype; e public.events%rowtype; eligible boolean:=true; details jsonb:='{}';
begin
 select * into q from public.notification_outbox where id=job_id and lease_token=token and status='processing' and locked_until>now();
 if not found then return jsonb_build_object('eligible',false); end if;
 select * into u from auth.users where id=q.user_id;
 select * into p from public.profiles where id=q.user_id;
 if q.organizer_id is not null then
  select * into o from public.organizers where id=q.organizer_id;
  eligible:=o.user_id=q.user_id;
 end if;
 if q.kind='purchase_pending' then
  select * into r from public.event_registrations where id=(q.payload->>'registrationId')::uuid;
  eligible:=r.user_id=q.user_id and r.payment_status='pending' and r.status<>'cancelled'
    and (r.provider_checkout_id is not null or r.provider_transaction_id is not null or r.is_installment_payment);
 elsif q.kind in ('installment_paid','payment_reminder') then
  select * into i from public.payment_installments where id=(q.payload->>'installmentId')::uuid;
  select * into r from public.event_registrations where id=i.registration_id;
  select * into e from public.events where id=r.event_id;
  eligible:=r.user_id=q.user_id and r.status<>'cancelled' and e.status<>'cancelled' and r.payment_status<>'refunded';
  if q.kind='installment_paid' then eligible:=eligible and i.status='paid' and r.payment_status='pending';
  else eligible:=eligible and i.status in ('pending','overdue') and i.due_date=(q.payload->>'dueDate')::timestamptz
    and r.payment_status='pending' and ((q.payload->>'phase'='due' and i.due_date>now()) or (q.payload->>'phase'='overdue' and i.due_date<=now()-interval '24 hours' and i.due_date>now()-interval '48 hours')) and e.end_date>now(); end if;
 elsif q.kind in ('event_reminder','event_changed','event_cancelled') then
  select * into e from public.events where id=(q.payload->>'eventId')::uuid;
  eligible:=exists(select 1 from public.event_registrations x where x.event_id=e.id and x.user_id=q.user_id and x.status<>'cancelled');
  details:=jsonb_build_object('title',left(e.title,250),'eventDate',e.start_date,'locationName',left(e.location_name,250));
  if q.kind='event_reminder' then eligible:=eligible and e.status='published' and e.start_date>now() and e.start_date=(q.payload->>'eventDate')::timestamptz
   and exists(select 1 from public.event_registrations x where x.event_id=e.id and x.user_id=q.user_id and x.status<>'cancelled' and x.payment_status in ('paid','free'));
  elsif q.kind='event_changed' then eligible:=eligible and e.status='published';
  else eligible:=eligible and e.status='cancelled'; end if;
 elsif q.kind='organization_sale' then
  select * into r from public.event_registrations where id=(q.payload->>'registrationId')::uuid;
  eligible:=eligible and r.payment_status in ('paid','free');
  select jsonb_build_object('amount',sum(x.total_amount),'quantity',sum(x.quantity)) into details
  from public.event_registrations x where x.event_id=r.event_id and x.user_id is not distinct from r.user_id
  and coalesce(x.additional_info->>'checkout_group_id',x.id::text)=coalesce(r.additional_info->>'checkout_group_id',r.id::text) and x.payment_status in ('paid','free');
 end if;
 return jsonb_build_object('email',u.email,'verified',u.email_confirmed_at is not null,'active',p.status='active' and (u.banned_until is null or u.banned_until<now()),
 'eligible',coalesce(eligible,false),'userSettings',coalesce(p.email_preferences,'{}'),'organizationSettings',o.email_preferences,'details',details);
end $$;

revoke all on function public.enqueue_email_notification(text,text,uuid,uuid,jsonb,timestamptz),public.capture_account_notification(),public.capture_organization_notification(),
 public.capture_registration_notification(),public.capture_installment_notification(),public.capture_event_notification(),public.capture_receiving_notification(),public.capture_payout_notification(),
 public.schedule_email_notifications(),public.claim_email_notifications(integer),public.finish_email_notification(uuid,uuid,text,timestamptz),public.email_notification_recipient(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.enqueue_email_notification(text,text,uuid,uuid,jsonb,timestamptz),public.schedule_email_notifications(),public.claim_email_notifications(integer),
 public.finish_email_notification(uuid,uuid,text,timestamptz),public.email_notification_recipient(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
