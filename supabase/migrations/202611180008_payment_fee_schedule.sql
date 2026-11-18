-- Official AbacatePay schedule, checked 2026-11-18. Existing settled transactions are unchanged.
create function public.valid_card_fee_rates(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare period text; rate jsonb;
begin
 if jsonb_typeof(value) <> 'object' or (select count(*) from jsonb_object_keys(value)) <> 4 then return false; end if;
 foreach period in array array['D+1','D+7','D+15','D+30'] loop
  if not (value ? period) or jsonb_typeof(value->period) <> 'array' or jsonb_array_length(value->period) <> 12 then return false; end if;
  for rate in select * from jsonb_array_elements(value->period) loop
   if jsonb_typeof(rate) <> 'number' or rate::numeric < 0 or rate::numeric > 100 then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;
$$;

alter table public.event_configurations
 add column card_rates jsonb not null default '{"D+1":[5.42,6.92,7.91,8.91,9.9,10.9,12.39,13.39,14.38,15.38,16.37,17.37],"D+7":[5.03,6.52,7.52,8.51,9.51,10.5,12,12.99,13.99,14.98,15.98,16.97],"D+15":[4.5,5.99,6.99,7.98,8.98,9.97,11.47,12.46,13.46,14.45,15.45,16.44],"D+30":[3.5,5,5.99,6.99,7.98,8.98,10.47,11.47,12.46,13.46,14.45,15.45]}'::jsonb check (public.valid_card_fee_rates(card_rates)),
 add column debit_fee_percentage numeric(8,2) not null default 2.5 check (debit_fee_percentage between 0 and 100),
 add column debit_fee_fixed numeric(12,2) not null default 0.6 check (debit_fee_fixed >= 0),
 add column payout_pix_monthly_limit integer not null default 20 check (payout_pix_monthly_limit >= 0),
 add column payout_pix_excess_fee numeric(12,2) not null default 2.5 check (payout_pix_excess_fee >= 0),
 add column ted_fee_fixed numeric(12,2) not null default 5 check (ted_fee_fixed >= 0),
 add column monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
 add column pix_qr_fee numeric(12,2) not null default 0 check (pix_qr_fee >= 0),
 add column boleto_issue_fee numeric(12,2) not null default 0 check (boleto_issue_fee >= 0),
 add column gateway_card_settlement_period text not null default 'D+1' check (gateway_card_settlement_period in ('D+1','D+7','D+15','D+30'));

alter table public.organizers
 add column accepted_payment_methods text[] not null default array['PIX']::text[],
 add column credit_card_settlement_period text default null,
 add constraint organizers_payment_methods_valid check (
  cardinality(accepted_payment_methods) between 1 and 4
  and accepted_payment_methods <@ array['PIX','CARD','BOLETO','DEBIT']::text[]
  and array_position(accepted_payment_methods, null) is null
 ),
 add constraint organizers_credit_period_valid check (
  (credit_card_settlement_period is null or credit_card_settlement_period in ('D+1','D+7','D+15','D+30'))
  and (not ('CARD' = any(accepted_payment_methods)) or credit_card_settlement_period is not null)
 );

comment on column public.event_configurations.gateway_card_settlement_period is 'Operational period manually confirmed in the shared gateway account; does not reconfigure AbacatePay.';
comment on column public.organizers.credit_card_settlement_period is 'Requested credit period. Card checkout is pending until it matches the operational gateway period and CARD is enabled.';
comment on column public.event_configurations.payout_pix_monthly_limit is 'Provider account withdrawal tier; not a separate allowance for each organizer. Actual gateway fee is reconciled from the provider.';
