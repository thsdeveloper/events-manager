begin;
select '1..1';
create function pg_temp.receiving_docs(org uuid,owner uuid,company boolean default false) returns uuid[] language plpgsql as $$
declare ids uuid[]:=array[]::uuid[]; kind text; doc_id uuid;
begin
 foreach kind in array (case when company then array['representative_identity','account_ownership','company_registration'] else array['representative_identity','account_ownership'] end) loop
  doc_id:=gen_random_uuid(); ids:=array_append(ids,doc_id);
  insert into public.organizer_receiving_documents(id,organizer_id,uploaded_by,kind,filename,mime_type,size,storage_path) values(doc_id,org,owner,kind,'document.pdf','application/pdf',100,org||'/'||doc_id);
 end loop; return ids;
end; $$;
do $$
declare owner_id uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); other_org uuid:=gen_random_uuid(); docs uuid[]; first_id uuid; second_id uuid; third_id uuid; production_at timestamptz; j jsonb;
 pix jsonb:='{"method":"pix","holder_name":"Titular","holder_document":"52998224725","pix_key_type":"EMAIL","pix_key":"titular@example.com"}';
 bank jsonb:='{"method":"bank_transfer","holder_name":"Titular","holder_document":"52998224725","bank_code":"001","bank_name":"Banco do Brasil","branch":"1234","branch_digit":"","account_number":"123456","account_digit":"7","account_type":"checking"}';
begin
 insert into auth.users(id,email) values(owner_id,owner_id||'@receiving.test'),(reviewer,reviewer||'@receiving.test'),(other_owner,other_owner||'@receiving.test');
 insert into public.profiles(id,role,status) values(owner_id,'attendee','active'),(reviewer,'super_admin','active'),(other_owner,'organizer','active') on conflict(id) do update set role=excluded.role;
 insert into public.organizers(id,user_id,name,email,document,status) values(org,owner_id,'Recebimento A','a@receiving.test','52998224725','pending'),(other_org,other_owner,'Recebimento B','b@receiving.test','45723174000110','active');
 docs:=pg_temp.receiving_docs(org,owner_id);
 begin perform public.submit_receiving_account(org,other_owner,pix,docs,null); raise exception 'cross-owner submission'; exception when others then if sqlerrm<>'ORGANIZER_FORBIDDEN' then raise; end if; end;
 begin perform public.submit_receiving_account(other_org,other_owner,jsonb_set(pix,'{holder_document}','"45723174000110"'),docs,null); raise exception 'cross-owner documents'; exception when others then if sqlerrm<>'RECEIVING_DOCUMENTS_REQUIRED' then raise; end if; end;
 begin perform public.submit_receiving_account(org,owner_id,pix,docs[1:1],null); raise exception 'incomplete documents'; exception when others then if sqlerrm<>'RECEIVING_DOCUMENTS_REQUIRED' then raise; end if; end;
 j:=public.submit_receiving_account(org,owner_id,pix,docs,null);first_id:=(j->>'id')::uuid;
 assert j->>'status'='pending' and jsonb_array_length(j->'documents')=2,'owner submission retains documents';
 assert not (j->'documents'->0 ? 'storage_path'),'storage paths stay private';
 assert (select production_approved_at is null and payout_status='pending_review' from public.organizers where id=org),'first submission does not approve production';
 begin perform public.review_receiving_account(org,first_id,owner_id,'approved','Self approval'); raise exception 'self approval allowed'; exception when others then if sqlerrm<>'RECEIVING_REVIEW_FORBIDDEN' then raise; end if; end;
 perform public.review_receiving_account(org,first_id,reviewer,'approved','Documentação e titularidade conferidas');
 select production_approved_at into production_at from public.organizers where id=org;
 assert production_at is not null,'approval unlocks production';
 assert (select status='active' and payout_status='enabled' and payout_pix_key='titular@example.com' from public.organizers where id=org),'approval activates organization and reviewed destination';
 begin perform public.review_receiving_account(org,first_id,reviewer,'rejected','Duplicate decision');raise exception 'double review allowed';exception when others then if sqlerrm<>'RECEIVING_REQUEST_CHANGED' then raise;end if;end;
 begin perform public.update_organizer_support(org,reviewer,'{"payout_pix_key":"attacker@example.com","payout_pix_key_type":"EMAIL"}','Chave substituída',null,'{}');raise exception 'admin changed destination';exception when others then if sqlerrm<>'INVALID_PATCH' then raise;end if;end;
 begin perform public.submit_receiving_account(org,owner_id,bank,pg_temp.receiving_docs(org,owner_id),null);raise exception 'stale form accepted';exception when others then if sqlerrm<>'RECEIVING_REQUEST_CHANGED' then raise;end if;end;
 begin perform public.submit_receiving_account(org,owner_id,bank,docs,first_id);raise exception 'reused documents accepted';exception when others then if sqlerrm<>'RECEIVING_DOCUMENTS_REQUIRED' then raise;end if;end;
 j:=public.submit_receiving_account(org,owner_id,bank,pg_temp.receiving_docs(org,owner_id),first_id);second_id:=(j->>'id')::uuid;
 assert (select production_approved_at=production_at and payout_status='pending_review' and payout_pix_key is null from public.organizers where id=org),'new destination blocks payouts but keeps production approval';
 perform public.review_receiving_account(org,second_id,reviewer,'rejected','Comprovante de titularidade ilegível');
 assert (select payout_status='blocked' and production_approved_at=production_at from public.organizers where id=org),'rejection stays blocked without reverting to an old key';
 j:=public.submit_receiving_account(org,owner_id,bank,pg_temp.receiving_docs(org,owner_id),second_id);third_id:=(j->>'id')::uuid;
 perform public.review_receiving_account(org,third_id,reviewer,'approved','Conta bancária e documentos conferidos');
 assert (select payout_status='enabled' and receiving_method='bank_transfer' and payout_pix_key is null from public.organizers where id=org),'bank destination approved without a fake PIX key';
 j:=public.get_receiving_account_overview(org,1,2);
 assert j#>>'{pagination,total}'='3' and jsonb_array_length(j->'history')=2,'version history is paginated';
 assert j#>>'{current,id}'=third_id::text,'current version is separate from history pagination';
 assert (select count(*)=6 from public.audit_logs where resource_id=org::text and action like 'receiving.%'),'every submission and decision is audited';
 j:=public.get_receiving_account_overview(other_org,1,10);assert jsonb_array_length(j->'history')=0,'history isolation';

 begin update public.organizers set document='45723174000110' where id=org;raise exception 'identity changed after review';exception when others then if sqlerrm<>'VERIFIED_DOCUMENT_IMMUTABLE' then raise;end if;end;
 begin update public.organizer_receiving_requests set account='{"method":"pix"}' where id=third_id;raise exception 'submitted evidence edited';exception when others then if sqlerrm<>'RECEIVING_SUBMISSION_IMMUTABLE' then raise;end if;end;
 docs:=pg_temp.receiving_docs(other_org,other_owner);
 begin perform public.submit_receiving_account(other_org,other_owner,jsonb_set(pix,'{holder_document}','"45723174000110"'),docs,null);raise exception 'company missing corporate document';exception when others then if sqlerrm<>'RECEIVING_DOCUMENTS_REQUIRED' then raise;end if;end;
 j:=public.submit_receiving_account(other_org,other_owner,jsonb_set(pix,'{holder_document}','"45723174000110"'),pg_temp.receiving_docs(other_org,other_owner,true),null);first_id:=(j->>'id')::uuid;
 j:=public.submit_receiving_account(other_org,other_owner,jsonb_set(pix,'{holder_document}','"45723174000110"'),pg_temp.receiving_docs(other_org,other_owner,true),first_id);
 assert (select status='superseded' from public.organizer_receiving_requests where id=first_id),'replacing pending submission preserves superseded history';
 begin perform public.review_receiving_account(other_org,first_id,reviewer,'approved','Old version checked');raise exception 'stale version approved';exception when others then if sqlerrm<>'RECEIVING_REQUEST_CHANGED' then raise;end if;end;
 assert not has_table_privilege('authenticated','public.organizer_receiving_documents','select'),'no authenticated direct document reads';
 assert not has_function_privilege('authenticated','public.review_receiving_account(uuid,uuid,uuid,text,text)','execute'),'no direct client approvals';
 assert not (select public from storage.buckets where id='organizer-verification'),'documents are private';
end; $$;
select 'ok 1 - receiving verification requires documents, independent review and immutable history';
rollback;
