alter table public.organizer_payouts alter column pix_key drop not null,alter column pix_key_type drop not null;
alter table public.organizer_payouts drop constraint organizer_payouts_provider_check;
alter table public.organizer_payouts add constraint organizer_payouts_provider_check check(provider in ('mock','abacatepay','manual'));
alter table public.organizer_payouts add column method text not null default 'pix' check(method in ('pix','bank_transfer')),
 add column receiving_request_id uuid references public.organizer_receiving_requests(id),add column bank_account jsonb,add column bank_reference text;
create index payouts_receiving_request_idx on public.organizer_payouts(receiving_request_id);
create table public.organizer_payout_receipts (
 id uuid primary key default gen_random_uuid(), payout_id uuid not null references public.organizer_payouts(id) on delete restrict,
 uploaded_by uuid references public.profiles(id) on delete set null, filename text not null,mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 size integer not null check(size>0 and size<=10485760),storage_path text unique not null,uploaded_at timestamptz not null default now()
);
alter table public.organizer_payouts add column receipt_document_id uuid references public.organizer_payout_receipts(id);
create index payout_receipts_payout_idx on public.organizer_payout_receipts(payout_id);
create index payout_receipts_uploader_idx on public.organizer_payout_receipts(uploaded_by);
alter table public.organizer_payout_receipts enable row level security;
revoke all on public.organizer_payout_receipts from anon,authenticated;
grant all on public.organizer_payout_receipts to service_role;
create or replace function public.create_organizer_payout(target_id uuid,target_organizer uuid,target_actor uuid,target_amount numeric,target_provider_fee numeric,target_provider text)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.organizers%rowtype;r public.organizer_receiving_requests%rowtype;c public.event_configurations%rowtype;p public.organizer_payouts%rowtype;fee numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(target_organizer::text,152400771));
 select * into o from public.organizers where id=target_organizer for update;
 if not found then raise exception 'ORGANIZER_NOT_FOUND'; end if;
 select * into r from public.organizer_receiving_requests where id=o.current_receiving_request_id and organizer_id=o.id;
 if o.status<>'active' or o.payout_status<>'enabled' or r.id is null or r.status<>'approved' then raise exception 'PAYOUT_ACCOUNT_DISABLED'; end if;
 select * into c from public.event_configurations where id=1;
 if target_provider<>'mock' and not c.payouts_enabled then raise exception 'PAYOUTS_DISABLED'; end if;
 if target_amount<c.minimum_payout then raise exception 'PAYOUT_BELOW_MINIMUM'; end if;
 if target_amount>public.get_organizer_available_balance(target_organizer) then raise exception 'INSUFFICIENT_BALANCE'; end if;
 if target_provider='manual' and r.account->>'method'<>'bank_transfer' or target_provider<>'manual' and r.account->>'method'='bank_transfer' then raise exception 'PAYOUT_ACCOUNT_DISABLED'; end if;
 fee:=case when target_provider='manual' then 0 else target_provider_fee end;
 insert into public.organizer_payouts(id,organizer_id,requested_by,processed_by,amount,provider_fee,net_amount,pix_key,pix_key_type,status,provider,method,receiving_request_id,bank_account)
 values(target_id,target_organizer,target_actor,target_actor,target_amount,fee,greatest(0,target_amount-fee),r.account->>'pix_key',r.account->>'pix_key_type',case when target_provider='manual' then 'pending' else 'processing' end,target_provider,r.account->>'method',r.id,case when target_provider='manual' then r.account else null end) returning * into p;
 if target_provider='manual' then insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data) values(target_actor,'payout.manual_reserved','organizer_payout',p.id::text,jsonb_build_object('amount',p.amount,'request_id',r.id)); end if;
 return to_jsonb(p);
end; $$;
create function public.finish_manual_payout(target_payout uuid,target_actor uuid,target_receipt uuid,target_reference text,target_cancel_reason text default null)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.organizer_payouts%rowtype;org uuid;
begin
 select organizer_id into org from public.organizer_payouts where id=target_payout;
 perform pg_advisory_xact_lock(hashtextextended(org::text,152400771));
 select * into p from public.organizer_payouts where id=target_payout for update;
 if not found or p.provider<>'manual' or p.status<>'pending' then raise exception 'MANUAL_PAYOUT_CHANGED'; end if;
 if not exists(select 1 from public.profiles where id=target_actor and role='super_admin' and status='active') then raise exception 'RECEIVING_REVIEW_FORBIDDEN'; end if;
 if target_cancel_reason is not null then
  if length(trim(target_cancel_reason))<5 then raise exception 'INVALID_REASON'; end if;
  update public.organizer_payouts set status='cancelled',failure_reason=trim(target_cancel_reason),processed_at=now(),processed_by=target_actor where id=p.id returning * into p;
 else
  if length(trim(coalesce(target_reference,'')))<3 or not exists(select 1 from public.organizer_payout_receipts where id=target_receipt and payout_id=p.id and uploaded_by=target_actor) then raise exception 'RECEIPT_REQUIRED'; end if;
  update public.organizer_payouts set status='completed',receipt_document_id=target_receipt,bank_reference=trim(target_reference),processed_at=now(),processed_by=target_actor where id=p.id returning * into p;
 end if;
 insert into public.audit_logs(actor_id,action,resource_type,resource_id,after_data,metadata) values(target_actor,'payout.manual_'||p.status,'organizer_payout',p.id::text,jsonb_build_object('status',p.status,'receipt_document_id',p.receipt_document_id),jsonb_build_object('reason',coalesce(target_cancel_reason,'Transferência bancária confirmada com comprovante')));
 return to_jsonb(p);
end; $$;
revoke all on function public.finish_manual_payout(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_manual_payout(uuid,uuid,uuid,text,text) to service_role;
