-- Apply the event filter before aggregating every dashboard metric.
create or replace function public.get_organizer_dashboard(target_organizer uuid, target_event uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with organizer_events as materialized (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      coalesce(
        nullif(e.location_name, ''),
        nullif(e.location_address, ''),
        case when e.event_type = 'online' then 'Online' else 'Local a definir' end
      ) as location
    from public.events e
    where e.organizer_id = target_organizer
      and (target_event is null or e.id = target_event)
  ),
  event_metrics as (
    select
      count(*)::bigint as total_events,
      count(*) filter (where status = 'published')::bigint as published_events,
      count(*) filter (
        where status = 'published'
          and start_date >= pg_catalog.now()
      )::bigint as upcoming_events
    from organizer_events
  ),
  registrations_by_event as (
    select
      r.event_id,
      coalesce(sum(r.quantity) filter (where r.status <> 'cancelled'), 0)::bigint as participants,
      coalesce(sum(r.total_amount) filter (where r.payment_status = 'paid'), 0)::numeric as gross_revenue
    from public.event_registrations r
    join organizer_events e on e.id = r.event_id
    group by r.event_id
  ),
  registration_metrics as (
    select
      coalesce(sum(participants), 0)::bigint as participants,
      coalesce(sum(gross_revenue), 0)::numeric as gross_revenue
    from registrations_by_event
  ),
  tickets_by_event as (
    select
      t.event_id,
      coalesce(sum(t.quantity_sold), 0)::bigint as tickets_sold
    from public.event_tickets t
    join organizer_events e on e.id = t.event_id
    group by t.event_id
  ),
  ticket_metrics as (
    select coalesce(sum(tickets_sold), 0)::bigint as tickets_sold
    from tickets_by_event
  ),
  recent_events as (
    select
      e.id,
      e.title,
      e.slug,
      e.status,
      e.start_date,
      e.location,
      coalesce(r.participants, 0)::bigint as participant_count,
      coalesce(t.tickets_sold, 0)::bigint as tickets_sold
    from organizer_events e
    left join registrations_by_event r on r.event_id = e.id
    left join tickets_by_event t on t.event_id = e.id
    order by e.start_date desc
    limit 5
  )
  select pg_catalog.jsonb_build_object(
    'metrics', pg_catalog.jsonb_build_object(
      'totalEvents', event_metrics.total_events,
      'publishedEvents', event_metrics.published_events,
      'upcomingEvents', event_metrics.upcoming_events,
      'participants', registration_metrics.participants,
      'ticketsSold', ticket_metrics.tickets_sold,
      'grossRevenue', registration_metrics.gross_revenue
    ),
    'recentEvents', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', recent_events.id,
            'title', recent_events.title,
            'slug', recent_events.slug,
            'status', recent_events.status,
            'startDate', recent_events.start_date,
            'location', recent_events.location,
            'participantCount', recent_events.participant_count,
            'ticketsSold', recent_events.tickets_sold
          )
          order by recent_events.start_date desc
        )
        from recent_events
      ),
      '[]'::jsonb
    )
  )
  from event_metrics, registration_metrics, ticket_metrics;
$$;

revoke execute on function public.get_organizer_dashboard(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_organizer_dashboard(uuid, uuid) to service_role;

-- Keep the existing API signature and permissions for the all-events view.
create or replace function public.get_organizer_dashboard(target_organizer uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select public.get_organizer_dashboard(target_organizer, null::uuid);
$$;

revoke execute on function public.get_organizer_dashboard(uuid) from public, anon, authenticated;
grant execute on function public.get_organizer_dashboard(uuid) to service_role;
