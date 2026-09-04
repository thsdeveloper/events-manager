-- Geographic coordinates for the event venue. They are filled by the location
-- picker in the event wizard and consumed by the public event page map.
-- Nullable because online events have no venue, and existing rows predate this.
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.events
  drop constraint if exists events_latitude_range_check,
  add constraint events_latitude_range_check
    check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.events
  drop constraint if exists events_longitude_range_check,
  add constraint events_longitude_range_check
    check (longitude is null or (longitude >= -180 and longitude <= 180));

-- A venue is only pinnable when both halves of the pair are present.
alter table public.events
  drop constraint if exists events_coordinates_pair_check,
  add constraint events_coordinates_pair_check
    check ((latitude is null) = (longitude is null));

comment on column public.events.latitude is 'Venue latitude in WGS84, set by the map picker.';
comment on column public.events.longitude is 'Venue longitude in WGS84, set by the map picker.';
