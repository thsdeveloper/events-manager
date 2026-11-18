begin;
select '1..1';
do $$
declare
 actor uuid := gen_random_uuid(); person uuid := gen_random_uuid();
 org uuid := gen_random_uuid(); other_org uuid := gen_random_uuid(); event_id uuid := gen_random_uuid();
 registration uuid := gen_random_uuid(); d jsonb; r jsonb; n integer;
begin
 insert into auth.users(id,email) values(actor,actor||'@support.test'),(person,person||'@support.test');
 insert into public.profiles(id,email,role,status) values(actor,actor||'@support.test','super_admin','active'),(person,person||'@support.test','attendee','active') on conflict(id) do update set role=excluded.role;
 insert into public.organizers(id,user_id,name,email,status,payout_pix_key,payout_pix_key_type,payout_status)
 values(org,person,'Support fixture A',person||'@support.test','pending','a@example.com','EMAIL','pending_review'),(other_org,actor,'Support fixture B',actor||'@support.test','active',null,null,'not_configured');
 insert into public.events(id,organizer_id,title,slug,start_date,end_date,status) values(event_id,org,'Event support fixture','support-'||event_id,now(),now()+interval '1 day','draft');
 insert into public.event_registrations(id,event_id,participant_name,participant_email,status,payment_status,total_amount,payment_amount,quantity) values(registration,event_id,'Participant','participant@support.test','confirmed','paid',100,100,2);
 insert into public.payment_transactions(registration_id,status,amount,organizer_net,provider,metadata) values(registration,'succeeded',100,90,'mock','{"private":"do not expose"}');
 d := public.get_organizer_support_detail(org);
 assert d#>>'{owner,id}' = person::text, 'responsible profile belongs to this account';
 assert (d#>>'{metrics,grossRevenue}')::numeric=100 and (d#>>'{metrics,ticketsSold}')::numeric=2, 'summary includes all paid registrations';
 assert (d#>>'{metrics,availableBalance}')::numeric=90, 'balance uses payment ledger';
 r:=public.list_organizer_support_records(other_org,'transactions',1,10);
 assert r->>'total'='0', 'financial data is isolated by organization';
 r:=public.list_organizer_support_records(org,'transactions',1,10);
 assert jsonb_array_length(r->'data')=1 and not ((r->'data'->0) ? 'metadata'), 'no raw gateway metadata is exposed';
 d:=public.update_organizer_support(org,actor,'{"status":"active"}','Documentação conferida',null,'{}');
 assert d->>'status'='active', 'status changes persist';
 assert (select role='organizer' from public.profiles where id=person), 'activation grants organizer access';
 assert (select count(*)=1 from public.audit_logs where resource_id=org::text and actor_id=actor and metadata->>'reason'='Documentação conferida'), 'update includes actor and reason in the same transaction';
 begin
  perform public.update_organizer_support(org,actor,'{"payout_pix_key":"b@example.com","payout_pix_key_type":"EMAIL"}','Troca pelo suporte',null,'{}');
  raise exception 'admin replaced receiving data';
 exception when others then if sqlerrm not like '%INVALID_PATCH%' then raise; end if; end;
 begin
  perform public.update_organizer_support(org,actor,'{"payout_status":"enabled"}','Aprovação pelo caminho anterior','a@example.com','{}');
  raise exception 'admin approved without document review';
 exception when others then if sqlerrm not like '%INVALID_PATCH%' then raise; end if; end;
 select count(*) into n from public.audit_logs where resource_id=org::text;
 begin
  perform public.update_organizer_support(org,gen_random_uuid(),'{"name":"Should roll back"}','Conferência cadastral',null,'{}');
  raise exception 'invalid actor accepted';
 exception when foreign_key_violation then null;
 end;
 assert (select name='Support fixture A' from public.organizers where id=org), 'audit failure rolls back the update';
 assert (select count(*)=n from public.audit_logs where resource_id=org::text), 'no partial audit on failure';
 perform public.add_organizer_support_note(org,actor,'Responsável orientado sobre a chave PIX.','{}');
 r:=public.list_organizer_support_records(org,'activity',1,2);
 assert jsonb_array_length(r->'data')=2 and (r->>'total')::int=n+1, 'history is paginated without dropping notes';
 r:=public.list_organizer_support(1,1,'Support fixture',null,'name','asc');
 assert r#>>'{pagination,total}'='2' and r#>>'{data,0,name}'='Support fixture A', 'search and sorting happen before pagination';
 assert not has_function_privilege('authenticated','public.get_organizer_support_detail(uuid)','execute'), 'detail stays server-only';
 assert not has_function_privilege('anon','public.update_organizer_support(uuid,uuid,jsonb,text,text,jsonb)','execute'), 'mutation stays server-only';
end;
$$;
select 'ok 1 - organizer support isolates records, audits changes and protects receiving data';
rollback;
