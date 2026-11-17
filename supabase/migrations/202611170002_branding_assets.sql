-- Brand assets are managed through the existing superadmin API and site-settings RLS.
alter table public.site_settings
  add column favicon_dark_mode uuid references public.media_files(id) on delete set null,
  add column app_icon uuid references public.media_files(id) on delete set null,
  add column app_icon_dark_mode uuid references public.media_files(id) on delete set null,
  add column app_icon_tinted uuid references public.media_files(id) on delete set null;

create index site_settings_favicon_dark_mode_idx on public.site_settings(favicon_dark_mode);
create index site_settings_app_icon_idx on public.site_settings(app_icon);
create index site_settings_app_icon_dark_mode_idx on public.site_settings(app_icon_dark_mode);
create index site_settings_app_icon_tinted_idx on public.site_settings(app_icon_tinted);

comment on column public.site_settings.app_icon is 'Ícone PNG de 1024x1024 usado no manifesto web e Apple Touch Icon.';
comment on column public.site_settings.app_icon_dark_mode is 'Variante escura do ícone de aplicativo.';
comment on column public.site_settings.app_icon_tinted is 'Variante tonal do ícone para aplicativos que a suportam.';

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/x-icon')
where id = 'media' and allowed_mime_types is not null
  and not ('image/x-icon' = any(allowed_mime_types));
