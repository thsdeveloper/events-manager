-- Private, versioned receiving details. Only the owner submits; super-admin reviews.
create table public.organizer_receiving_requests (
 id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.organizers(id) on delete restrict,
 version integer not null check(version>0), account jsonb not null,
 status text not null check(status in ('pending','approved','rejected','superseded','legacy')),
 submitted_by uuid references public.profiles(id) on delete set null, submitted_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, review_reason text,
 unique(organizer_id,version), check(account->>'method' in ('pix','bank_transfer'))
);
create table public.organizer_receiving_documents (
 id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.organizers(id) on delete restrict,
 request_id uuid references public.organizer_receiving_requests(id) on delete restrict,
 uploaded_by uuid references public.profiles(id) on delete set null,
 kind text not null check(kind in ('representative_identity','company_registration','account_ownership')),
 filename text not null, mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 size integer not null check(size>0 and size<=10485760), storage_path text unique not null, uploaded_at timestamptz not null default now(),
 unique(request_id,kind)
);
create index receiving_requests_organizer_date_idx on public.organizer_receiving_requests(organizer_id,version desc);
create index receiving_documents_organizer_idx on public.organizer_receiving_documents(organizer_id,request_id);
create index receiving_requests_reviewer_idx on public.organizer_receiving_requests(reviewed_by);
create index receiving_requests_submitter_idx on public.organizer_receiving_requests(submitted_by);
create index receiving_documents_uploader_idx on public.organizer_receiving_documents(uploaded_by);
alter table public.organizer_receiving_requests enable row level security;
alter table public.organizer_receiving_documents enable row level security;
revoke all on public.organizer_receiving_requests,public.organizer_receiving_documents from anon,authenticated;
grant all on public.organizer_receiving_requests,public.organizer_receiving_documents to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('organizer-verification','organizer-verification',false,10485760,array['application/pdf','image/png','image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- There are intentionally no client policies on this private bucket.
alter table public.organizers add column current_receiving_request_id uuid references public.organizer_receiving_requests(id),
 add column production_approved_at timestamptz, add column receiving_method text check(receiving_method in ('pix','bank_transfer'));
create index organizers_receiving_request_idx on public.organizers(current_receiving_request_id);
-- Keep previous details as history, without pretending documents were reviewed.
insert into public.organizer_receiving_requests(organizer_id,version,account,status,submitted_by,submitted_at,review_reason)
 select id,1,jsonb_build_object('method','pix','holder_name',name,'holder_document',document,'pix_key',payout_pix_key,'pix_key_type',payout_pix_key_type),'legacy',user_id,date_updated,'Cadastro anterior à validação documental. Envie uma solicitação com documentos.'
 from public.organizers where payout_pix_key is not null;
update public.organizers set payout_status=case when payout_pix_key is null then 'not_configured' else 'pending_review' end;
-- Sensitive organizer mutations go through the API and the transaction functions.
revoke update on public.organizers from anon,authenticated;

create function public.receiving_request_json(target_request uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',r.id,'organizer_id',r.organizer_id,'version',r.version,'account',r.account,'status',r.status,'submitted_at',r.submitted_at,'reviewed_at',r.reviewed_at,'review_reason',r.review_reason,'reviewer_name',nullif(trim(concat(p.first_name,' ',p.last_name)),''),
 'documents',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'filename',d.filename,'mime_type',d.mime_type,'size',d.size,'uploaded_at',d.uploaded_at) order by d.kind) from public.organizer_receiving_documents d where d.request_id=r.id),'[]'::jsonb))
 from public.organizer_receiving_requests r left join public.profiles p on p.id=r.reviewed_by where r.id=target_request;
$$;
create function public.get_receiving_account_overview(target_organizer uuid,target_page integer default 1,target_limit integer default 10) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare o public.organizers%rowtype; total integer; records jsonb;
begin
 if target_page<1 or target_limit<1 or target_limit>50 then raise exception 'INVALID_QUERY'; end if;
 select * into o from public.organizers where id=target_organizer;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 select count(*) into total from public.organizer_receiving_requests where organizer_id=target_organizer;
 select coalesce(jsonb_agg(public.receiving_request_json(r.id) order by r.version desc),'[]'::jsonb) into records from
 (select id,version from public.organizer_receiving_requests where organizer_id=target_organizer order by version desc limit target_limit offset ((target_page-1)::bigint*target_limit)) r;
 return jsonb_build_object('organizer',jsonb_build_object('id',o.id,'name',o.name,'document',o.document,'status',o.status,'payout_status',o.payout_status,'production_approved_at',o.production_approved_at,'current_receiving_request_id',o.current_receiving_request_id),
 'current',public.receiving_request_json(o.current_receiving_request_id),'history',records,'pagination',jsonb_build_object('page',target_page,'limit',target_limit,'total',total,'pageCount',ceil(total::numeric/target_limit)));
end; $$;
create function public.submit_receiving_account(target_organizer uuid,target_actor uuid,target_account jsonb,target_document_ids uuid[],target_expected_request uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.organizers%rowtype; next_id uuid:=gen_random_uuid(); next_version integer; required_kinds text[]; valid_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_organizer::text,152400771));
 select * into o from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 if o.user_id is distinct from target_actor or o.status='archived' then raise exception 'ORGANIZER_FORBIDDEN'; end if;
 if o.current_receiving_request_id is distinct from target_expected_request then raise exception 'RECEIVING_REQUEST_CHANGED'; end if;
 if (target_account->>'holder_document') is distinct from regexp_replace(o.document,'\D','','g') then raise exception 'ACCOUNT_HOLDER_MISMATCH'; end if;
 required_kinds:=array['representative_identity','account_ownership'];
 if length(regexp_replace(o.document,'\D','','g'))=14 then required_kinds:=array_append(required_kinds,'company_registration'); end if;
 perform 1 from public.organizer_receiving_documents where id=any(target_document_ids) for update;
 select count(distinct kind) into valid_count from public.organizer_receiving_documents
 where id=any(target_document_ids) and organizer_id=target_organizer and uploaded_by=target_actor and request_id is null and kind=any(required_kinds);
 if valid_count<>cardinality(required_kinds) or cardinality(target_document_ids)<>cardinality(required_kinds) then raise exception 'RECEIVING_DOCUMENTS_REQUIRED'; end if;
 select coalesce(max(version),0)+1 into next_version from public.organizer_receiving_requests where organizer_id=target_organizer;
 update public.organizer_receiving_requests set status='superseded' where id=o.current_receiving_request_id and status='pending';
 insert into public.organizer_receiving_requests(id,organizer_id,version,account,status,submitted_by) values(next_id,target_organizer,next_version,target_account,'pending',target_actor);
 update public.organizer_receiving_documents set request_id=next_id where id=any(target_document_ids);
 update public.organizers set current_receiving_request_id=next_id,receiving_method=target_account->>'method',payout_status='pending_review',payout_pix_key=null,payout_pix_key_type=null where id=target_organizer;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata) values(target_actor,'receiving.submitted','organizer',target_organizer::text,jsonb_build_object('request_id',next_id,'version',next_version,'method',target_account->>'method'),jsonb_build_object('reason','Dados e documentos enviados pelo organizador'));
 return public.receiving_request_json(next_id);
end; $$;
create function public.review_receiving_account(target_organizer uuid,target_request uuid,target_actor uuid,target_decision text,target_reason text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.organizers%rowtype; r public.organizer_receiving_requests%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_organizer::text,152400771));
 select * into o from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 if o.user_id=target_actor or not exists(select 1 from public.profiles where id=target_actor and role='super_admin' and status='active') then raise exception 'RECEIVING_REVIEW_FORBIDDEN'; end if;
 if o.status='archived' then raise exception 'ORGANIZER_ARCHIVED'; end if;
 select * into r from public.organizer_receiving_requests where id=target_request and organizer_id=target_organizer for update;
 if not found or o.current_receiving_request_id is distinct from target_request or r.status<>'pending' then raise exception 'RECEIVING_REQUEST_CHANGED'; end if;
 if target_decision not in ('approved','rejected') or length(trim(target_reason))<5 then raise exception 'INVALID_REVIEW'; end if;
 update public.organizer_receiving_requests set status=target_decision,reviewed_by=target_actor,reviewed_at=now(),review_reason=trim(target_reason) where id=target_request;
 update public.organizers set payout_status=case when target_decision='approved' then 'enabled' else 'blocked' end,
  production_approved_at=case when target_decision='approved' then coalesce(production_approved_at,now()) else production_approved_at end,
  status=case when target_decision='approved' and status='pending' then 'active' else status end,
  payout_pix_key=case when target_decision='approved' and r.account->>'method'='pix' then r.account->>'pix_key' else null end,
  payout_pix_key_type=case when target_decision='approved' and r.account->>'method'='pix' then r.account->>'pix_key_type' else null end
 where id=target_organizer;
 if target_decision='approved' then update public.profiles set role='organizer' where id=o.user_id and role<>'super_admin'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata) values(target_actor,'receiving.'||target_decision,'organizer',target_organizer::text,jsonb_build_object('request_id',target_request,'version',r.version,'status',target_decision),jsonb_build_object('reason',trim(target_reason)));
 return public.receiving_request_json(target_request);
end; $$;
-- The generic support endpoint can no longer change any financial destination or approve it.
create or replace function public.update_organizer_support(target_organizer uuid,target_actor uuid,target_patch jsonb,target_reason text,target_reviewed_pix_key text default null,target_context jsonb default '{}'::jsonb)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous public.organizers%rowtype; updated public.organizers%rowtype;
begin
 if exists(select 1 from jsonb_object_keys(target_patch) k where k not in ('name','email','phone','description','website','status')) then raise exception 'INVALID_PATCH'; end if;
 if length(trim(target_reason))<5 then raise exception 'INVALID_REASON'; end if;
 select * into previous from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 updated:=jsonb_populate_record(previous,target_patch);
 if updated.status<>'active' and updated.payout_status='enabled' then updated.payout_status:='blocked'; end if;
 update public.organizers set name=updated.name,email=updated.email,phone=updated.phone,description=updated.description,website=updated.website,status=updated.status,payout_status=updated.payout_status where id=target_organizer returning * into updated;
 if updated.status='active' then update public.profiles set role='organizer' where id=updated.user_id and role<>'super_admin'; end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,before_data,after_data,metadata) values(target_actor,'organizer.updated','organizer',target_organizer::text,to_jsonb(previous)-'payout_pix_key',to_jsonb(updated)-'payout_pix_key',target_context||jsonb_build_object('reason',target_reason));
 return to_jsonb(updated);
end; $$;
revoke all on function public.receiving_request_json(uuid),public.get_receiving_account_overview(uuid,integer,integer),public.submit_receiving_account(uuid,uuid,jsonb,uuid[],uuid),public.review_receiving_account(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.receiving_request_json(uuid),public.get_receiving_account_overview(uuid,integer,integer),public.submit_receiving_account(uuid,uuid,jsonb,uuid[],uuid),public.review_receiving_account(uuid,uuid,uuid,text,text) to service_role;
