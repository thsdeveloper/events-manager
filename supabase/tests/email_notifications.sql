begin;
select '1..6';
do $$
declare
 u uuid := gen_random_uuid(); org uuid := gen_random_uuid(); ev uuid := gen_random_uuid();
 reg uuid := gen_random_uuid(); job record; group_id uuid := gen_random_uuid(); n bigint;
begin
 assert to_regclass('public.notification_outbox') is not null, 'notifications need a durable transactional outbox';
 insert into auth.users(id,email) values(u,u||'@notifications.test');
 assert not exists(select 1 from public.notification_outbox where user_id=u), 'unverified signup must not receive welcome';
 update auth.users set email_confirmed_at=now() where id=u;
 update auth.users set last_sign_in_at=now() where id=u;
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='welcome'), 'welcome is only queued on first confirmation';
 insert into public.organizers(id,user_id,name,email,status) values(org,u,'Notifications',u||'@notifications.test','active');
 assert (select count(*)=1 from public.notification_outbox where organizer_id=org and kind='organization_created'), 'organization creation must be recorded atomically';
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status) values(ev,org,'Email event',ev::text,now()+interval '12 hours',now()+interval '14 hours','published');
 insert into public.event_registrations(id,event_id,user_id,participant_name,participant_email,status,payment_status,is_installment_payment,additional_info,total_amount)
 values(reg,ev,u,'Buyer',u||'@notifications.test','partial_payment','pending',true,jsonb_build_object('checkout_group_id',group_id),100);
 assert not exists(select 1 from public.notification_outbox where organizer_id=org and kind='organization_sale'), 'partial Pix payment cannot announce a confirmed sale';
 insert into public.payment_installments(registration_id,installment_number,total_installments,amount,due_date,status)
 values(reg,1,2,50,now(),'paid'),(reg,2,2,50,now(),'paid');
 update public.event_registrations set status='confirmed',payment_status='paid' where id=reg;
 assert (select payment_status='paid' from public.event_registrations where id=reg), 'sale fixture must actually settle the Pix plan';
 update public.event_registrations set notes='repeat webhook' where id=reg;
 insert into public.event_registrations(event_id,user_id,participant_name,participant_email,status,payment_status,additional_info,total_amount)
 values(ev,u,'Buyer',u||'@notifications.test','confirmed','paid',jsonb_build_object('checkout_group_id',group_id),50);
 assert (select count(*)=1 from public.notification_outbox where organizer_id=org and kind='organization_sale'), 'one sale notice per purchase, including multiple ticket types';
 update public.profiles set email_preferences='{"event_reminders":false}' where id=u;
 update public.organizers set email_preferences='{"sales":false}' where id=org;
 perform public.schedule_email_notifications();
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='event_reminder'), 'reminders are grouped per buyer and event';
 perform public.schedule_email_notifications();
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='event_reminder'), 'scheduler retries must not duplicate reminders';
 update public.events set start_date=start_date+interval '1 day',end_date=end_date+interval '1 day' where id=ev;
 assert exists(select 1 from public.notification_event_batches where event_id=ev and kind='event_changed' and not completed), 'event changes fan out in a background batch';
 perform public.schedule_email_notifications();
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='event_changed'), 'event updates do not duplicate the buyer with multiple orders';
 assert not has_table_privilege('authenticated','public.notification_outbox','SELECT,INSERT,UPDATE,DELETE'), 'browser roles cannot access outbox';
 assert not has_function_privilege('anon','public.claim_email_notifications(integer)','EXECUTE'), 'anonymous users cannot claim mail';
 for job in select * from public.claim_email_notifications(10) loop
  assert job.lease_token is not null and job.attempts=1, 'claim must issue a lease and count attempt';
  assert not public.finish_email_notification(job.id,gen_random_uuid(),'sent',null), 'another worker cannot acknowledge this lease';
  assert public.finish_email_notification(job.id,job.lease_token,'sent',null), 'lease owner can acknowledge';
 end loop;
 select count(*) into n from public.claim_email_notifications(10);
 assert n=0, 'completed jobs cannot be claimed again';
end $$;
select 'ok 1 - transactional notifications preserve preferences, isolation and delivery leases';

do $$
declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); i uuid:=gen_random_uuid(); j record; recipient jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,u||'@notifications.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Parcelas',u||'@notifications.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status) values(e,o,'Parcelas',e::text,now()+interval '10 days',now()+interval '11 days','published');
 insert into public.event_registrations(id,event_id,user_id,participant_name,participant_email,status,payment_status,is_installment_payment,total_amount)
 values(r,e,u,'Buyer',u||'@notifications.test','partial_payment','pending',true,150);
 insert into public.payment_installments(id,registration_id,installment_number,total_installments,amount,due_date)
 values(i,r,2,2,75,now()+interval '12 hours'),(gen_random_uuid(),r,1,2,75,now()+interval '6 hours');
 update public.payment_installments set status='paid' where id=i;
 assert exists(select 1 from public.notification_outbox where kind='installment_paid' and payload->>'installmentId'=i::text), 'an out of order final-numbered payment is still a partial payment';
 update public.profiles set email_preferences='{"payment_reminders":false}' where id=u;
 perform public.schedule_email_notifications();
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='payment_reminder'), 'only unpaid installments produce reminders';
 for j in select * from public.claim_email_notifications(10) loop
  if j.user_id=u and j.kind='payment_reminder' then
   recipient:=public.email_notification_recipient(j.id,j.lease_token);
   assert recipient->'userSettings'->>'payment_reminders'='false', 'recipient resolves current opt out';
   assert recipient->>'eligible'='true', 'unpaid due installment remains eligible before preferences';
   update public.payment_installments set status='paid' where registration_id=r;
   recipient:=public.email_notification_recipient(j.id,j.lease_token);
   assert recipient->>'eligible'='false', 'a reminder must be suppressed after payment';
  end if;
  perform public.finish_email_notification(j.id,j.lease_token,'sent',null);
 end loop;
 assert (select count(*)=1 from public.notification_outbox where user_id=u and kind='installment_paid'), 'completion uses the ticket confirmation, not another partial payment notice';
end $$;
select 'ok 2 - Pix notices follow outstanding payments and recheck consent and payment before sending';

do $$
declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); j record; recipient jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,u||'@notifications.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Eventos',u||'@notifications.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status) values(e,o,'Original',e::text,now()+interval '12 hours',now()+interval '14 hours','published');
 insert into public.event_registrations(id,event_id,user_id,participant_name,participant_email,status,payment_status,total_amount)
 values(r,e,u,'Buyer',u||'@notifications.test','confirmed','paid',100);
 perform public.schedule_email_notifications();
 update public.events set location_name='Novo local' where id=e;
 perform public.schedule_email_notifications();
 update public.events set location_name='Local definitivo',start_date=start_date+interval '1 hour' where id=e;
 update public.notification_outbox set next_attempt_at=now() where organizer_id=o and kind='organization_sale';
 for j in select * from public.claim_email_notifications(10) loop
  if j.user_id=u and j.kind='event_changed' then
   recipient:=public.email_notification_recipient(j.id,j.lease_token);
   assert recipient->'details'->>'locationName'='Local definitivo', 'event emails use current event data';
  elsif j.user_id=u and j.kind='organization_sale' then
   recipient:=public.email_notification_recipient(j.id,j.lease_token);
   assert (recipient->'details'->>'amount')::numeric=100, 'sale totals come from current confirmed orders';
  elsif j.user_id=u and j.kind='event_reminder' then
   recipient:=public.email_notification_recipient(j.id,j.lease_token);
   assert recipient->>'eligible'='false', 'rescheduling invalidates the previous reminder';
  end if;
  perform public.finish_email_notification(j.id,j.lease_token,'sent',null);
 end loop;
 update public.events set status='cancelled' where id=e;
 perform public.schedule_email_notifications();
 assert exists(select 1 from public.notification_outbox where user_id=u and kind='event_cancelled'), 'cancellation is queued for buyers';
 update public.organizers set status='archived' where id=o;
 assert exists(select 1 from public.notification_outbox where organizer_id=o and kind='organization_status'), 'organization decisions notify the owner';
end $$;
select 'ok 3 - event updates are current and cancelled or rescheduled reminders are suppressed';

do $$
declare u uuid:=gen_random_uuid(); j record; old_token uuid; reclaimed record;
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,u||'@notifications.test',now());
 -- Isolate this lease test from delayed work queued by previous scenarios.
 update public.notification_outbox set status='sent' where user_id<>u;
 select * into j from public.claim_email_notifications(10) where user_id=u;
 old_token:=j.lease_token;
 update public.notification_outbox set locked_until=now()-interval '1 second' where id=j.id;
 select * into reclaimed from public.claim_email_notifications(10) where id=j.id;
 assert reclaimed.attempts=2 and reclaimed.lease_token<>old_token, 'expired work can be recovered by a different worker';
 assert not public.finish_email_notification(j.id,old_token,'sent',null), 'an expired worker cannot acknowledge reclaimed work';
 assert public.finish_email_notification(j.id,reclaimed.lease_token,'failed',now()+interval '1 hour'), 'failures schedule a future retry';
 assert not exists(select 1 from public.claim_email_notifications(10) where id=j.id), 'backoff is respected';
 update public.notification_outbox set attempts=8,status='processing',locked_until=now()-interval '1 second' where id=j.id;
 perform public.claim_email_notifications(10);
 assert (select status='failed' and completed_at is not null from public.notification_outbox where id=j.id), 'exhausted jobs stop retrying';
end $$;
select 'ok 4 - bounded retries recover expired work without stale acknowledgement';

do $$
declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); r1 uuid:=gen_random_uuid(); r2 uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); payout_id uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,u||'@notifications.test',now());
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Vendas',u||'@notifications.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status) values(e,o,'Vendas',e::text,now()+interval '10 days',now()+interval '11 days','published');
 insert into public.event_registrations(event_id,user_id,participant_name,participant_email,status,payment_status,total_amount)
 values(e,u,'Guest',u||'@notifications.test','confirmed','free',0);
 assert not exists(select 1 from public.notification_outbox where organizer_id=o and kind='organization_sale'), 'free reservations do not announce a paid sale before other checkout rows exist';
 insert into public.event_registrations(id,event_id,user_id,participant_name,participant_email,status,payment_status,total_amount,additional_info)
 values(r1,e,u,'Buyer',u||'@notifications.test','pending','pending',100,jsonb_build_object('checkout_group_id',g)),(r2,e,u,'Buyer',u||'@notifications.test','pending','pending',50,jsonb_build_object('checkout_group_id',g));
 update public.event_registrations set payment_status='paid',status='confirmed' where id=r1;
 assert not exists(select 1 from public.notification_outbox where organizer_id=o and kind='organization_sale'), 'do not announce an entire checkout before its other orders are paid';
 update public.event_registrations set payment_status='paid',status='confirmed' where id=r2;
 assert (select count(*)=1 from public.notification_outbox where organizer_id=o and kind='organization_sale'), 'fully settled checkout announces one sale';
 update public.event_registrations set payment_status='refunded' where id=r1;
 assert exists(select 1 from public.notification_outbox where user_id=u and kind='purchase_refunded'), 'confirmed refunds notify the buyer';
 assert not exists(select 1 from public.notification_outbox where user_id=u and kind in ('purchase_refunded','organization_refund') and payload?'amount'), 'order total must not be presented as the amount refunded by individual Pix charges';
 insert into public.organizer_receiving_requests(id,organizer_id,version,account,status) values(request_id,o,1,'{"method":"pix"}','pending');
 update public.organizer_receiving_requests set status='approved' where id=request_id;
 assert exists(select 1 from public.notification_outbox where organizer_id=o and kind='organization_receiving'), 'receiving review notifies the owner';
 insert into public.organizer_payouts(id,organizer_id,amount,net_amount,pix_key,pix_key_type,status) values(payout_id,o,50,49,'private-value','RANDOM','pending');
 update public.organizer_payouts set status='completed' where id=payout_id;
 assert (select count(*)=2 from public.notification_outbox where organizer_id=o and kind='organization_payout'), 'payout requested and completed each produce a notice';
 assert not exists(select 1 from public.notification_outbox where organizer_id=o and payload::text like '%private-value%'), 'banking identifiers never enter email payloads';
end $$;
select 'ok 5 - grouped sales wait for full settlement and financial notices exclude private account data';

do $$
declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email) values(u,u||'@notifications.test');
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Location',u||'@notifications.test','active');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status,event_type)
 values(e,o,'Location',e::text,now()+interval '10 days',now()+interval '11 days','published','in_person');
 update public.events set location_city='Recife' where id=e;
 assert (select count(*)=1 from public.notification_event_batches where event_id=e), 'structured address changes must notify buyers even without the legacy address field';
 update public.events set location_city='Recife' where id=e;
 assert (select count(*)=1 from public.notification_event_batches where event_id=e), 'saving the same address does not send another notification';
 update public.events set event_type='hybrid' where id=e;
 assert (select count(*)=2 from public.notification_event_batches where event_id=e), 'event format changes affect participant access';
end $$;
select 'ok 6 - structured location and event format changes notify buyers without duplicate saves';
rollback;
