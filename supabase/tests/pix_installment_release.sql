-- Every assertion rolls back, including the inventory reservation.
begin;
select '1..1';
do $$
declare
 u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
 t uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); i1 uuid:=gen_random_uuid(); i2 uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email) values(u,'pix-plan-'||u||'@example.test');
 insert into public.organizers(id,user_id,name,email,status) values(o,u,'Test','pix-plan-'||u||'@example.test','active');
 insert into public.events(id,organizer_id,title,slug,status,start_date,end_date)
 values(e,o,'Test','pix-plan-'||e,'published',now()+interval '60 days',now()+interval '61 days');
 insert into public.event_tickets(id,event_id,title,quantity,price,service_fee_type) values(t,e,'Test',5,100,'absorbed');
 insert into public.event_registrations(id,event_id,ticket_type_id,user_id,participant_name,participant_email,total_amount,payment_amount,platform_fee,payment_provider,payment_status,is_installment_payment,total_installments,installment_plan_status)
 values(r,e,t,u,'Test','buyer@example.test',100,0,0,'abacatepay','pending',true,2,'active');
 insert into public.payment_installments(id,registration_id,installment_number,total_installments,amount,due_date,status,provider_transaction_id)
 values(i1,r,1,2,50,now(),'pending','charge-'||i1),(i2,r,2,2,50,now()+interval '30 days','pending','charge-'||i2);
 -- A generic checkout update cannot release a partially paid Pix plan.
 update public.event_registrations set payment_status='paid',status='confirmed' where id=r;
 if (select payment_status from public.event_registrations where id=r)='paid' then raise exception 'Released unpaid Pix plan'; end if;
 perform public.settle_installment_webhook('charge-'||i1,i1,r,0,'{}');
 if (select payment_status from public.event_registrations where id=r)<>'pending' then raise exception 'Released after first installment'; end if;
 if (select installment_plan_status from public.event_registrations where id=r)<>'active' then raise exception 'Plan no longer active'; end if;
 update public.payment_installments set status='overdue' where id=i2;
 perform public.settle_reconciled_installment('charge-'||i2,i2,r);
 if (select payment_status from public.event_registrations where id=r)<>'paid' then raise exception 'Did not release fully paid plan'; end if;
 if (select installment_plan_status from public.event_registrations where id=r)<>'completed' then raise exception 'Did not complete plan'; end if;
 perform public.settle_installment_webhook('charge-'||i2,i2,r,0,'{}');
 if (select payment_amount from public.event_registrations where id=r)<>100 then raise exception 'Duplicate installment counted twice'; end if;
 if (select quantity_sold from public.event_tickets where id=t)<>1 then raise exception 'Duplicate ticket inventory'; end if;
end $$;
select 'ok 1 - Pix tickets release only after every installment is paid, once';
rollback;
