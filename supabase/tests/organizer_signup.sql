-- Run against local Supabase. Every fixture is rolled back.
begin;
select '1..1';
do $$
declare
  person uuid := gen_random_uuid();
  another uuid := gen_random_uuid();
  first_account jsonb;
  second_account jsonb;
  pending_account jsonb;
begin
  insert into auth.users (id, email) values (person, person || '@signup.test'), (another, another || '@signup.test');
  insert into public.profiles (id, email, role) values (person, person || '@signup.test', 'super_admin'), (another, another || '@signup.test', 'attendee')
    on conflict (id) do update set role = excluded.role;
  first_account := public.create_organizer_profile(person, 'Individual', 'a@signup.test', null, null, null, '99999999991', null, 'active');
  second_account := public.create_organizer_profile(person, 'Company', 'b@signup.test', null, null, null, '99999999999991', null, 'active');
  assert first_account is not null and second_account is not null, 'one user can own multiple accounts';
  assert (select active_organizer_id = (second_account->>'id')::uuid from public.profiles where id = person), 'new active account must become the remembered workspace';
  assert (select role = 'super_admin' from public.profiles where id = person), 'preserve superadmin role';
  assert public.create_organizer_profile(person, 'Duplicate CPF', 'a@signup.test', null, null, null, '999.999.999-91', null, 'active') is null, 'same CPF cannot create another account';
  assert public.create_organizer_profile(another, 'Duplicate CNPJ', 'a@signup.test', null, null, null, '99.999.999/9999-91', null, 'pending') is null, 'CNPJ cannot be reused across owners';
  pending_account := public.create_organizer_profile(person, 'Pending', 'c@signup.test', null, null, null, '99999999999992', null, 'pending');
  assert pending_account->>'status' = 'pending', 'approval still applies';
  assert (select active_organizer_id = (second_account->>'id')::uuid from public.profiles where id = person), 'pending account must preserve current workspace';
  assert not has_function_privilege('authenticated', 'public.create_organizer_profile(uuid,text,text,text,text,text,text,uuid,text)', 'execute'), 'signup RPC stays server only';
  assert not has_function_privilege('anon', 'public.create_organizer_profile(uuid,text,text,text,text,text,text,uuid,text)', 'execute'), 'no anonymous signup RPC';
end;
$$;
select 'ok 1 - organizer signup preserves identity uniqueness, roles and workspace selection';
rollback;
