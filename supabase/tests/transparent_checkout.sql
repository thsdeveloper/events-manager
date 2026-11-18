-- Reversible integration checks: all fixtures roll back, no external payment is made.
begin;
select '1..2';
do $$
declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); t uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); charge jsonb;
begin
 if has_table_privilege('anon','public.checkout_attempts','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.checkout_attempts','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Checkout attempts bypass the API'; end if;
 if has_function_privilege('authenticated','public.settle_transparent_checkout(uuid,jsonb,text)','EXECUTE') then raise exception 'Buyer can mark payments paid'; end if;
 insert into auth.users(id,email) values(u,'checkout-test-'||u||'@example.test');
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Test','checkout-'||u||'@example.test','active');
 insert into public.events(id,organizer_id,title,slug,status,start_date,end_date) values(e,o,'Test','test-'||e,'published',now()+interval '2 days',now()+interval '3 days');
 insert into public.event_tickets(id,event_id,title,quantity,price,service_fee_type) values(t,e,'Test',5,100,'passed_to_buyer');
 insert into public.event_registrations(id,event_id,ticket_type_id,user_id,participant_name,participant_email,total_amount,payment_amount,platform_fee,payment_provider,payment_status,additional_info) values(r,e,t,u,'Test','buyer@example.test',110,100,10,'abacatepay','pending',jsonb_build_object('checkout_group_id',a,'payment_flow','transparent'));
 insert into public.checkout_attempts(id,user_id,fingerprint,method,amount) values(a,u,repeat('a',64),'PIX',11000);
 perform public.prepare_transparent_checkout(a,array[r],11000);
 if (select quantity_sold from public.event_tickets where id=t)<>1 then raise exception 'Stock not reserved'; end if;
 charge:=jsonb_build_object('id','pix_test_'||a,'status','PAID','method','PIX','amountInCents',11000,'providerFeeInCents',80,'devMode',true);
 perform public.settle_transparent_checkout(a,charge-'providerFeeInCents','transparent.completed');
 if (select fee_confirmed from public.checkout_attempts where id=a) then raise exception 'Unverified fee marked confirmed'; end if;
 if (select organizer_net from public.payment_transactions where registration_id=r)<>0 then raise exception 'Unknown fee released funds'; end if;
 perform public.settle_transparent_checkout(a,charge,'transparent.completed');
 if not (select fee_confirmed from public.checkout_attempts where id=a) then raise exception 'Verified fee not marked confirmed'; end if;
 perform public.settle_transparent_checkout(a,charge,'transparent.completed');
 if (select count(*) from public.payment_transactions where registration_id=r)<>1 then raise exception 'Duplicated ledger'; end if;
 if (select organizer_net from public.payment_transactions where registration_id=r)<>99.2 then raise exception 'Incorrect net'; end if;
 if (select quantity_sold from public.event_tickets where id=t)<>1 then raise exception 'Duplicated stock'; end if;
 -- A delayed create response without platformFee must not erase a verified fee.
 perform public.settle_transparent_checkout(a,charge-'providerFeeInCents',null);
 if (select organizer_net from public.payment_transactions where registration_id=r)<>99.2 then raise exception 'Verified fee was lost'; end if;
 perform public.settle_transparent_checkout(a,charge||jsonb_build_object('status','UNDER_DISPUTE','providerUpdatedAt','2026-11-18T11:00:00Z'),'transparent.disputed');
 perform public.settle_transparent_checkout(a,charge||jsonb_build_object('providerUpdatedAt','2026-11-18T10:00:00Z'),'transparent.completed');
 if (select status from public.checkout_attempts where id=a)<>'disputed' then raise exception 'Stale confirmation resolved an open dispute'; end if;
 perform public.settle_transparent_checkout(a,jsonb_set(charge,'{status}','"REFUNDED"'),'transparent.refunded');
 perform public.settle_transparent_checkout(a,charge,'transparent.completed');
 if (select payment_status from public.event_registrations where id=r)<>'refunded' then raise exception 'Late paid delivery revived a refund'; end if;
 if (select quantity_sold from public.event_tickets where id=t)<>0 then raise exception 'Refund did not release stock once'; end if;
end $$;
select 'ok 1 - transparent payments preserve ownership, exact net, stock, idempotency and terminal states';
rollback;
-- Card approval permits ticket delivery, but only settlement permits payouts.
begin;
do $$
declare u uuid:=gen_random_uuid();o uuid:=gen_random_uuid();e uuid:=gen_random_uuid();t uuid:=gen_random_uuid();r uuid:=gen_random_uuid();a uuid:=gen_random_uuid();c jsonb;
begin
 insert into auth.users(id,email) values(u,'card-test-'||u||'@example.test');
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Test','card-'||u||'@example.test','active');
 insert into public.events(id,organizer_id,title,slug,status,start_date,end_date) values(e,o,'Test','test-'||e,'published',now()+interval '2 days',now()+interval '3 days');
 insert into public.event_tickets(id,event_id,title,quantity,price,service_fee_type) values(t,e,'Test',5,100,'absorbed');
 insert into public.event_registrations(id,event_id,ticket_type_id,user_id,participant_name,participant_email,total_amount,payment_amount,platform_fee,payment_provider,payment_status,additional_info) values(r,e,t,u,'Test','buyer@example.test',100,100,10,'abacatepay','pending',jsonb_build_object('checkout_group_id',a,'payment_flow','transparent'));
 insert into public.checkout_attempts(id,user_id,fingerprint,method,amount) values(a,u,repeat('b',64),'CARD',10000);
 perform public.prepare_transparent_checkout(a,array[r],10000);
 c:=jsonb_build_object('id','card_test_'||a,'status','APPROVED','method','CARD','amountInCents',10000,'providerFeeInCents',602,'devMode',true);
 perform public.settle_transparent_checkout(a,c,'transparent.completed');
 if (select payment_status from public.event_registrations where id=r)<>'paid' then raise exception 'Approval did not issue tickets';end if;
 if (select organizer_net from public.payment_transactions where registration_id=r)<>0 then raise exception 'Unsettled card approval released payout funds';end if;
 perform public.settle_transparent_checkout(a,jsonb_set(c,'{status}','"PAID"'),null);
 if (select organizer_net from public.payment_transactions where registration_id=r)<>83.98 then raise exception 'Settled card funds not released';end if;
end $$;
select 'ok 2 - card approval issues tickets but only settlement releases payout funds';
rollback;
