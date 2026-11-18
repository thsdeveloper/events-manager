-- Durable idempotency and provider reconciliation. This table is API-only.
create table public.checkout_attempts (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 fingerprint text not null check (length(fingerprint)=64),
 method text not null check (method in ('PIX','CARD','BOLETO')),
 amount bigint not null check (amount between 0 and 100000000),
 status text not null default 'processing' check (status in ('processing','pending','confirmed','failed','cancelled','refunded','disputed')),
 registration_ids uuid[] not null default '{}',
 provider_id text unique,
 charge jsonb,
 confirmation_url text,
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.checkout_attempts enable row level security;
revoke all on public.checkout_attempts from anon, authenticated;
grant all on public.checkout_attempts to service_role;
create index checkout_attempts_owner on public.checkout_attempts(user_id,created_at desc);
create index checkout_attempts_pending on public.checkout_attempts(updated_at) where status in ('processing','pending','disputed');

-- Reserve inventory and associate the attempt before a charge can leave the API.
create function public.prepare_transparent_checkout(target_attempt uuid,target_registrations uuid[],target_amount bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare a public.checkout_attempts; actual bigint; units integer;
begin
 select * into strict a from public.checkout_attempts where id=target_attempt for update;
 if a.status<>'processing' or cardinality(a.registration_ids)>0 then raise exception 'ATTEMPT_ALREADY_PREPARED'; end if;
 select round(sum(r.total_amount)*100)::bigint,count(*) into actual,units from public.event_registrations r
 where r.id=any(target_registrations) and r.user_id=a.user_id and r.additional_info->>'checkout_group_id'=a.id::text;
 if units<>cardinality(target_registrations) or units=0 or actual<>target_amount or actual<>a.amount then raise exception 'CHECKOUT_AMOUNT_MISMATCH'; end if;
 perform public.reserve_registration_inventory(target_registrations);
 update public.checkout_attempts set registration_ids=target_registrations,updated_at=now() where id=a.id;
end;
$$;

-- One transaction serializes webhook retries, polling, refunds and delayed events.
create function public.settle_transparent_checkout(target_attempt uuid,target_charge jsonb,target_event text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare
 a public.checkout_attempts; r public.event_registrations; outcome text; provider_status text;
 fee_cents bigint; allocated bigint:=0; row_fee bigint; row_count integer; row_index integer:=0;
 ledger_status text; charge_id text; total bigint;
begin
 select * into strict a from public.checkout_attempts where id=target_attempt for update;
 charge_id:=target_charge->>'id'; provider_status:=target_charge->>'status';
 if charge_id is null or (a.provider_id is not null and a.provider_id<>charge_id) then raise exception 'PAYMENT_REFERENCE_MISMATCH'; end if;
 if (target_charge->>'amountInCents')::bigint<>a.amount then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
 select round(sum(total_amount)*100)::bigint,count(*) into total,row_count from public.event_registrations where id=any(a.registration_ids) and user_id=a.user_id;
 if total<>a.amount or row_count<>cardinality(a.registration_ids) or row_count=0 then raise exception 'PAYMENT_REGISTRATIONS_MISMATCH'; end if;
 fee_cents:=(target_charge->>'providerFeeInCents')::bigint;
 if fee_cents<0 or fee_cents>a.amount then raise exception 'PAYMENT_FEE_MISMATCH'; end if;
 outcome:=case
  when target_event='transparent.refunded' or provider_status='REFUNDED' then 'refunded'
  when target_event='transparent.lost' then 'cancelled'
  when provider_status in ('EXPIRED','CANCELLED','FAILED') or target_event in ('transparent.expired','transparent.cancelled') then 'cancelled'
  when provider_status='UNDER_DISPUTE' or (target_event='transparent.disputed' and provider_status not in ('APPROVED','PAID')) then 'disputed'
  when provider_status in ('PAID','APPROVED') then 'confirmed'
  else 'pending' end;
 -- Terminal reversal wins over a late completed/pending delivery.
 if a.status in ('refunded','cancelled','failed') and outcome not in ('refunded','cancelled') then return; end if;
 if a.status in ('confirmed','disputed') and outcome='pending' then return; end if;
 if outcome='confirmed' then perform public.reserve_registration_inventory(a.registration_ids); end if;
 if outcome in ('cancelled','refunded') then perform public.release_registration_inventory(a.registration_ids); end if;
 update public.checkout_attempts set provider_id=charge_id,status=outcome,charge=target_charge-'cardToken'-'token'-'metadata'-'providerFeeInCents'-'devMode'-'receiptUrl',updated_at=now() where id=a.id;
 if outcome='pending' then return; end if;
 for r in select * from public.event_registrations where id=any(a.registration_ids) order by id for update loop
  row_index:=row_index+1;
  row_fee:=case when fee_cents is null then 0 when row_index=row_count then fee_cents-allocated else floor(fee_cents*(r.total_amount*100)/a.amount)::bigint end;
  allocated:=allocated+row_fee;
  update public.event_registrations set
   status=case when outcome in ('confirmed','disputed') then case when status='checked_in' then status else 'confirmed' end else 'cancelled' end,
   payment_status=case when outcome='confirmed' then case when total_amount=0 then 'free' else 'paid' end when outcome='refunded' then 'refunded' when outcome='disputed' then 'pending' else null end,
   payment_method=lower(target_charge->>'method'),provider_transaction_id=charge_id,provider_fee=row_fee/100.0,
   receipt_url=coalesce(target_charge->>'receiptUrl',receipt_url),
   cancelled_at=case when outcome in ('refunded','cancelled') then now() else cancelled_at end,
   cancelled_reason=case when outcome in ('refunded','cancelled') then 'Pagamento encerrado pelo provedor.' else cancelled_reason end,
   date_updated=now() where id=r.id;
  ledger_status:=case when outcome='confirmed' and fee_cents is not null then 'succeeded' when outcome='refunded' then 'refunded' when outcome='cancelled' then 'failed' else 'pending' end;
  insert into public.payment_transactions(registration_id,provider,provider_event_id,provider_object_id,event_type,amount,provider_fee,platform_fee,organizer_net,status,metadata)
   values(r.id,'abacatepay','transparent.completed:'||charge_id||':'||r.id::text,charge_id,'transparent.completed',r.total_amount,row_fee/100.0,r.platform_fee,
    case when ledger_status='succeeded' then greatest(0,r.total_amount-r.platform_fee-row_fee/100.0) else 0 end,ledger_status,
    jsonb_build_object('attempt_id',a.id,'provider_status',provider_status,'event',target_event,'fee_confirmed',fee_cents is not null))
   on conflict(provider_event_id) where provider_event_id is not null do update set
    provider_fee=excluded.provider_fee,organizer_net=excluded.organizer_net,status=excluded.status,metadata=excluded.metadata;
 end loop;
end;
$$;
revoke execute on function public.prepare_transparent_checkout(uuid,uuid[],bigint) from public,anon,authenticated;
revoke execute on function public.settle_transparent_checkout(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.prepare_transparent_checkout(uuid,uuid[],bigint) to service_role;
grant execute on function public.settle_transparent_checkout(uuid,jsonb,text) to service_role;
