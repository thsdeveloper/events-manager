-- Optional public presentation video. Existing events remain unchanged.
alter table public.events
  add column video_url text
  constraint events_video_url_length check (video_url is null or char_length(video_url) <= 2048);

comment on column public.events.video_url is
  'Public YouTube presentation video, validated by the API; independent of private online_url access.';
