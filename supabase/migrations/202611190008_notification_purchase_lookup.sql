-- Keep sale eligibility and totals proportional to the purchase size,
-- rather than scanning all registrations of a large event on each payment.
create index notification_registration_purchase_idx on public.event_registrations
 ((coalesce(additional_info->>'checkout_group_id',id::text)));
