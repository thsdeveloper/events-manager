-- Local sandbox confirmation must issue tickets without releasing payout funds.
-- All fixtures roll back; no external payment is made.
begin;
select '1..1';
do $$
declare
 u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
 t uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); c jsonb;
begin
 insert into auth.users(id,email) values(u,'simulation-'||u||'@example.test');
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Test','simulation-'||u||'@example.test','active');
 insert into public.events(id,organizer_id,title,slug,status,start_date,end_date)
 values(e,o,'Test','simulation-'||e,'published',now()+interval '2 days',now()+interval '3 days');
 insert into public.event_tickets(id,event_id,title,quantity,price,service_fee_type) values(t,e,'Test',5,100,'absorbed');
 insert into public.event_registrations(id,event_id,ticket_type_id,user_id,participant_name,participant_email,total_amount,payment_amount,platform_fee,payment_provider,payment_status,additional_info)
 values(r,e,t,u,'Test','buyer@example.test',100,100,10,'abacatepay','pending',jsonb_build_object('checkout_group_id',a,'payment_flow','transparent'));
 insert into public.checkout_attempts(id,user_id,fingerprint,method,amount) values(a,u,repeat('d',64),'BOLETO',10000);
 perform public.prepare_transparent_checkout(a,array[r],10000);
 c:=jsonb_build_object('id','bole_test_'||a,'status','PAID','method','BOLETO','amountInCents',10000,
   'providerFeeInCents',null,'devMode',true,'developmentSimulation',true);
 perform public.settle_transparent_checkout(a,c,'development.simulated');
 perform public.settle_transparent_checkout(a,c,'development.simulated');
 if (select payment_status from public.event_registrations where id=r)<>'paid' then raise exception 'Simulation did not confirm tickets'; end if;
 if (select status from public.checkout_attempts where id=a)<>'confirmed' then raise exception 'Simulation did not confirm attempt'; end if;
 if (select charge->>'developmentSimulation' from public.checkout_attempts where id=a) is distinct from 'true' then raise exception 'Simulation marker was lost'; end if;
 if (select fee_confirmed from public.checkout_attempts where id=a) then raise exception 'Simulation claimed a verified fee'; end if;
 if (select organizer_net from public.payment_transactions where registration_id=r)<>0 then raise exception 'Simulation released payout funds'; end if;
 if (select status from public.payment_transactions where registration_id=r)<>'pending' then raise exception 'Simulation claimed financial settlement'; end if;
 if (select metadata->>'event' from public.payment_transactions where registration_id=r) is distinct from 'development.simulated' then raise exception 'Simulation not recorded in ledger'; end if;
 if (select count(*) from public.payment_transactions where registration_id=r)<>1 then raise exception 'Duplicated simulation ledger'; end if;
 if (select quantity_sold from public.event_tickets where id=t)<>1 then raise exception 'Duplicated simulation stock'; end if;
end $$;
select 'ok 1 - sandbox confirmation persists provenance and issues tickets once without payout funds';
rollback;
