-- Local integration test. Fixtures and all changes are rolled back.
begin;
select '1..1';
do $$
declare
  owner_id uuid := gen_random_uuid();
  person_id uuid := gen_random_uuid();
  event_a uuid;
  event_b uuid;
  baseline bigint;
  result jsonb;
begin
  insert into auth.users (id, email) values (person_id, person_id || '@scope.test');
  insert into public.organizers (id, user_id, name, email, status)
    values (owner_id, person_id, 'Scope fixture', person_id || '@scope.test', 'active');
  baseline := (public.get_organizer_dashboard(owner_id)->'metrics'->>'totalEvents')::bigint;
  insert into public.events (organizer_id, title, slug, start_date, end_date)
    values (owner_id, 'Scope A', 'scope-a-' || gen_random_uuid(), now(), now() + interval '1 day') returning id into event_a;
  insert into public.events (organizer_id, title, slug, start_date, end_date)
    values (owner_id, 'Scope B', 'scope-b-' || gen_random_uuid(), now(), now() + interval '1 day') returning id into event_b;
  result := public.get_organizer_dashboard(owner_id, event_a);
  if (result->'metrics'->>'totalEvents')::int <> 1 or jsonb_array_length(result->'recentEvents') <> 1
    or result->'recentEvents'->0->>'id' <> event_a::text then
    raise exception 'The dashboard must include only the selected event: %', result;
  end if;
  if (result->'metrics'->>'grossRevenue')::numeric <> 0 or (result->'metrics'->>'participants')::int <> 0 then
    raise exception 'A new empty event must not inherit organization revenue or participants';
  end if;
  if (public.get_organizer_dashboard(owner_id)->'metrics'->>'totalEvents')::bigint <> baseline + 2 then
    raise exception 'All events must preserve the original aggregate';
  end if;
  if (public.get_organizer_dashboard(gen_random_uuid(), event_a)->'metrics'->>'totalEvents')::int <> 0 then
    raise exception 'A selected event cannot bypass organization isolation';
  end if;
  if has_function_privilege('anon', 'public.get_organizer_dashboard(uuid,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.get_organizer_dashboard(uuid,uuid)', 'execute') then
    raise exception 'The scoped dashboard must only be callable by the API';
  end if;
  if not has_function_privilege('service_role', 'public.get_organizer_dashboard(uuid,uuid)', 'execute') then
    raise exception 'The API must be able to read the scoped dashboard';
  end if;
end $$;
select 'ok 1 - dashboard totals respect the selected event and organization isolation';
rollback;
