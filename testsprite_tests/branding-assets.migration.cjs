// Checks the migration against a disposable database, preserving local application data.
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');
const database = 'branding_test_' + randomUUID().replaceAll('-', '');
const run = (args, input) =>
	execFileSync('docker', ['exec', '-i', 'supabase_db_events-manager', ...args], {
		input,
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});
const fixture = `
create table public.media_files(id uuid primary key);
create table public.site_settings(id int primary key,logo uuid references public.media_files);
create schema storage;
create table storage.buckets(id text primary key,allowed_mime_types text[]);
insert into media_files values ('00000000-0000-4000-8000-000000000001');
insert into site_settings values (1,'00000000-0000-4000-8000-000000000001');
insert into storage.buckets values ('media',array['image/png','image/svg+xml']),('other',null);
`;
const assertions = `
do $$ begin
 if not exists(select 1 from site_settings where logo='00000000-0000-4000-8000-000000000001' and app_icon is null and favicon_dark_mode is null) then raise exception 'Existing settings changed'; end if;
 if not exists(select 1 from storage.buckets where id='media' and allowed_mime_types=array['image/png','image/svg+xml','image/x-icon']) then raise exception 'MIME allowlist not preserved'; end if;
 if not exists(select 1 from storage.buckets where id='other' and allowed_mime_types is null) then raise exception 'Unrelated bucket changed'; end if;
 begin
 update site_settings set app_icon='00000000-0000-4000-8000-000000000002';
 raise exception 'Invalid media reference accepted';
 exception when foreign_key_violation then null; end;
end $$;
insert into media_files values ('00000000-0000-4000-8000-000000000002');
update site_settings set app_icon='00000000-0000-4000-8000-000000000002',app_icon_dark_mode='00000000-0000-4000-8000-000000000002',app_icon_tinted='00000000-0000-4000-8000-000000000002',favicon_dark_mode='00000000-0000-4000-8000-000000000002';
delete from media_files where id='00000000-0000-4000-8000-000000000002';
do $$ begin
 if exists(select 1 from site_settings where app_icon is not null or app_icon_dark_mode is not null or app_icon_tinted is not null or favicon_dark_mode is not null) then raise exception 'Deleted media remains referenced'; end if;
end $$;
`;
try {
	run(['createdb', '-U', 'postgres', database]);
	run(
		['psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'],
		fixture +
			readFileSync(resolve(__dirname, '../supabase/migrations/202611170002_branding_assets.sql'), 'utf8') +
			assertions,
	);
	console.log('PASS: branding migration preserves settings, MIME allowlists and media referential integrity.');
} finally {
	run(['dropdb', '-U', 'postgres', '--if-exists', database]);
}
