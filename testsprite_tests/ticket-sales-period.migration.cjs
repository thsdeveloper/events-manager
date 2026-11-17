// Acceptance check against a disposable local database; never touches project data.
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { resolve } = require('node:path');
const container = 'supabase_db_events-manager';
const database = 'wizard_sales_test_' + randomUUID().replaceAll('-', '');
const run = (args, input) =>
	execFileSync('docker', ['exec', '-i', container, ...args], {
		input,
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'pipe'],
	});
const fixture = `
create table public.events (id int primary key, registration_start timestamptz, registration_end timestamptz);
create table public.event_tickets (id int primary key, event_id int references public.events, sale_start_date timestamptz, sale_end_date timestamptz, status text not null default 'active', check (sale_end_date > sale_start_date));
insert into events values (1, '2026-11-01', '2026-12-01'), (2, null, null), (3, '2026-12-01', '2026-12-30'), (4, null, '2026-12-01');
insert into event_tickets values
 (1,1,'2026-10-01','2026-11-20','active'),
 (2,1,null,null,'active'),
 (3,2,null,null,'active'),
 (4,3,'2026-10-01','2026-11-01','active'),
 (5,4,null,null,'active');
`;
const assertions = `
do $$ begin
 if not exists (select 1 from event_tickets where id=1 and sale_start_date='2026-11-01' and sale_end_date='2026-11-20') then raise exception 'Intersection not preserved'; end if;
 if not exists (select 1 from event_tickets where id=2 and sale_start_date='2026-11-01' and sale_end_date='2026-12-01') then raise exception 'Inherited period missing'; end if;
 if not exists (select 1 from event_tickets where id=3 and sale_start_date is null and sale_end_date is null and status='active') then raise exception 'Unbounded ticket changed'; end if;
 if not exists (select 1 from event_tickets where id=4 and status='inactive' and sale_start_date='2026-10-01' and sale_end_date='2026-11-01') then raise exception 'Disjoint period reopened'; end if;
 if not exists (select 1 from event_tickets where id=5 and sale_start_date is null and sale_end_date='2026-12-01') then raise exception 'Open-ended period lost'; end if;
 if exists (select 1 from events where registration_start is not null or registration_end is not null) then raise exception 'Duplicate period remains'; end if;
 begin
  update events set registration_start='2026-11-01' where id=1;
  raise exception 'Retired setting unexpectedly accepted';
 exception when check_violation then null;
 end;
end $$;
`;
try {
	run(['createdb', '-U', 'postgres', database]);
	const migration = readFileSync(
		resolve(__dirname, '../supabase/migrations/202611170001_ticket_sales_period_only.sql'),
		'utf8',
	);
	run(['psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1'], fixture + migration + assertions);
	console.log('PASS: 7 sales-period migration checks on an isolated local database.');
} finally {
	run(['dropdb', '-U', 'postgres', '--if-exists', database]);
}
