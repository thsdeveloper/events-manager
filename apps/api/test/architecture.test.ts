import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return ['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name)) ? [path] : [];
	});
}

function migrations() {
	const directory = join(repositoryRoot, 'supabase/migrations');
	return readdirSync(directory)
		.filter((file) => file.endsWith('.sql'))
		.sort()
		.map((file) => ({ file, sql: readFileSync(join(directory, file), 'utf8') }));
}

describe('architecture boundaries', () => {
	it('keeps Supabase clients and privileged keys out of the web application', () => {
		const webSource = sourceFiles(join(repositoryRoot, 'apps/web/src'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(webSource).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/i);
		expect(webSource).not.toContain('@supabase/supabase-js');
		expect(webSource).not.toMatch(/\bcreateClient\s*\(/);
	});

	it('keeps secret-bearing fields out of shared frontend contracts', () => {
		const contracts = sourceFiles(join(repositoryRoot, 'packages/contracts/src'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(contracts).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|openai_api_key/i);
	});

	it('keeps browser authentication on HTTP-only session cookies', () => {
		const authRoute = readFileSync(join(repositoryRoot, 'apps/api/src/routes/auth.ts'), 'utf8');
		const webSource = sourceFiles(join(repositoryRoot, 'apps/web/src'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(authRoute).not.toContain("'/api/auth/token'");
		expect(webSource).not.toMatch(/getAccessTokenFromCookie|Authorization:\s*`Bearer/);
	});

	it('uses explicit public event fields without provider or payout data', () => {
		const eventRepository = readFileSync(
			join(repositoryRoot, 'apps/api/src/infrastructure/supabase/event-repository.ts'),
			'utf8',
		);
		const publicSelection = eventRepository.match(/const publicEventSelection = `([\s\S]*?)`;/)?.[1] ?? '';

		expect(publicSelection).not.toContain('*');
		expect(publicSelection).not.toMatch(/provider_product_id|payout_pix_key|payout_status|online_url/);
	});

	it('uses an explicit allowlist for public site settings', () => {
		const repository = readFileSync(
			join(repositoryRoot, 'apps/api/src/infrastructure/supabase/content-repository.ts'),
			'utf8',
		);

		expect(repository).toContain(".from('site_settings')");
		expect(repository).not.toMatch(/from\(['"]site_settings['"]\)\s*\.select\(['"]\*['"]\)/s);
		// A tabela de taxas é pública, mas o gateway e os prefixos operacionais não.
		expect(repository).toContain(".from('event_configurations')");
		expect(repository).not.toMatch(/from\(['"]event_configurations['"]\)\s*\.select\(['"]\*['"]\)/s);
	});

	it('keeps inventory persistence behind an application port', () => {
		const paymentRoute = readFileSync(join(repositoryRoot, 'apps/api/src/routes/payments.ts'), 'utf8');

		expect(paymentRoute).not.toMatch(/\.rpc\(['"](?:increment|reserve|release)_/);
		expect(paymentRoute).toContain('ManageTicketInventory');
	});

	it('keeps every application use case independent from frameworks and infrastructure', () => {
		const applicationSource = sourceFiles(join(repositoryRoot, 'apps/api/src/application'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(applicationSource).not.toMatch(
			/@supabase\/supabase-js|infrastructure\/|from ['"]fastify['"]|from ['"]nodemailer['"]|from ['"]openai['"]/,
		);
	});

	it('keeps persistence details out of HTTP routes and the composition root', () => {
		const interfaceSource = [
			...sourceFiles(join(repositoryRoot, 'apps/api/src/routes')),
			join(repositoryRoot, 'apps/api/src/app.ts'),
		]
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(interfaceSource).not.toMatch(/\.(?:from|rpc)\s*\(|\.storage\.|\.auth\./);
	});

	it('keeps public database reads behind explicit service-role API repositories', () => {
		const infrastructureSource = sourceFiles(join(repositoryRoot, 'apps/api/src/infrastructure/supabase'))
			.map((file) => readFileSync(file, 'utf8'))
			.join('\n');

		expect(infrastructureSource).not.toMatch(/clients\.public\s*\.from\s*\(/);
	});
});

describe('database security invariants', () => {
	it('keeps cross-replica rate-limit counters private and service-only', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toContain('create table if not exists private.api_rate_limits');
		expect(hardening!.sql).toMatch(
			/create or replace function public\.consume_api_rate_limit\([\s\S]*?security invoker/i,
		);
		expect(hardening!.sql).toMatch(
			/grant execute on function public\.consume_api_rate_limit\(text, integer, integer\) to service_role/i,
		);
	});

	it('enables RLS for every application table in the exposed public schema', () => {
		const sql = migrations()
			.map((migration) => migration.sql)
			.join('\n');
		const tables = [...sql.matchAll(/create table(?: if not exists)? public\.([a-z0-9_]+)/gi)].map(
			([, table]) => table,
		);

		expect(tables.length).toBeGreaterThan(0);
		for (const table of tables) {
			expect(sql, `${table} must enable RLS`).toMatch(
				new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'),
			);
		}
	});

	it('limits the inventory RPC to service_role without SECURITY DEFINER', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toMatch(/alter function public\.increment_ticket_sales\(uuid, integer\) security invoker/i);
		expect(hardening!.sql).toMatch(
			/grant execute on function public\.increment_ticket_sales\(uuid, integer\) to service_role/i,
		);
		expect(hardening!.sql).toMatch(/revoke execute on all functions in schema public from public/i);
	});

	it('reserves and releases multi-ticket inventory atomically for service_role', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toContain('add column inventory_reserved boolean not null default false');
		for (const operation of ['reserve', 'release']) {
			expect(hardening!.sql).toMatch(
				new RegExp(
					`create or replace function public\\.${operation}_registration_inventory\\(target_registrations uuid\\[\\]\\)[\\s\\S]*?security invoker`,
					'i',
				),
			);
			expect(hardening!.sql).toMatch(
				new RegExp(
					`grant execute on function public\\.${operation}_registration_inventory\\(uuid\\[\\]\\) to service_role`,
					'i',
				),
			);
		}
	});

	it('coordinates checkout reconciliation across replicas with service-only RPCs', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toContain('pg_try_advisory_xact_lock');
		for (const operation of [
			'claim_pending_checkout_reconciliations',
			'settle_reconciled_checkout',
			'cancel_reconciled_checkout',
			'claim_pending_installment_reconciliations',
			'settle_reconciled_installment',
			'settle_installment_webhook',
			'cancel_reconciled_installment',
		]) {
			expect(hardening!.sql).toMatch(new RegExp(`create or replace function public\\.${operation}\\(`, 'i'));
			expect(hardening!.sql).toMatch(new RegExp(`grant execute on function public\\.${operation}\\(`, 'i'));
		}
	});

	it('removes finance controls and payout keys from public Data API grants', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toMatch(/drop policy if exists public_read_event_config/i);
		expect(hardening!.sql).toMatch(/revoke select on all tables in schema public from anon, authenticated/i);
		expect(hardening!.sql).not.toMatch(/grant select \([^)]*\) on table public\./is);
		expect(hardening!.sql).not.toMatch(/grant select \([^)]*payout_pix_key/is);
	});

	it('keeps the dashboard aggregation service-only and SECURITY INVOKER', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toMatch(
			/create or replace function public\.get_organizer_dashboard\(target_organizer uuid\)[\s\S]*?security invoker/i,
		);
		expect(hardening!.sql).toMatch(
			/revoke execute on function public\.get_organizer_dashboard\(uuid\) from public, anon, authenticated/i,
		);
		expect(hardening!.sql).toMatch(
			/grant execute on function public\.get_organizer_dashboard\(uuid\) to service_role/i,
		);
		expect(hardening!.sql).toMatch(
			/create or replace function public\.list_super_admin_transactions\([\s\S]*?security invoker/i,
		);
		expect(hardening!.sql).toMatch(
			/grant execute on function public\.list_super_admin_transactions\(integer, integer, text, text\) to service_role/i,
		);
	});

	it('routes anonymous form submissions and registrations through the API', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		expect(hardening!.sql).toContain('drop policy if exists anyone_submit_forms');
		expect(hardening!.sql).toContain('drop policy if exists anyone_submit_form_values');
		expect(hardening!.sql).toContain('drop policy if exists create_registrations');
		expect(hardening!.sql).toContain('revoke insert, update, delete on all tables in schema public from authenticated');
		expect(hardening!.sql).not.toMatch(/grant insert, update, delete on table public\./i);
		expect(hardening!.sql).toMatch(
			/create or replace function public\.create_validated_form_submission\([\s\S]*?security invoker/i,
		);
		expect(hardening!.sql).toMatch(
			/grant execute on function public\.create_validated_form_submission\(uuid, uuid, jsonb\) to service_role/i,
		);
	});

	it('handles cancellation, email claims and payout balance changes atomically', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		for (const operation of ['cancel_registration_by_organizer', 'claim_email_delivery', 'create_organizer_payout']) {
			expect(hardening!.sql).toMatch(new RegExp(`create or replace function public\\.${operation}\\(`, 'i'));
			expect(hardening!.sql).toMatch(new RegExp(`grant execute on function public\\.${operation}\\(`, 'i'));
		}
		expect(hardening!.sql).toContain('pg_advisory_xact_lock');
		expect(hardening!.sql).toContain("status in ('pending', 'sending', 'sent', 'failed')");
	});

	it('enforces checkout date, quantity and monetary invariants in Postgres', () => {
		const hardening = migrations().find(({ file }) => file.includes('harden_database_security_and_indexes'));

		expect(hardening).toBeDefined();
		for (const constraint of [
			'events_registration_dates_valid',
			'event_tickets_sale_dates_valid',
			'event_tickets_purchase_limits_valid',
			'event_tickets_installments_valid',
			'registrations_amounts_valid',
			'payment_installments_sequence_valid',
			'payment_transactions_amounts_valid',
		]) {
			expect(hardening!.sql).toContain(`constraint ${constraint}`);
		}
	});

	describe('event coupons migration', () => {
		const coupons = () => migrations().find(({ file }) => file.includes('event_coupons'));

		it('ships the coupon table with the event it belongs to', () => {
			expect(coupons()).toBeDefined();
			expect(coupons()!.sql).toMatch(/create table public\.event_coupons/i);
			expect(coupons()!.sql).toMatch(/event_id uuid not null references public\.events\(id\) on delete cascade/i);
		});

		it('keeps a code unique inside its event, so two organizers may reuse the same word', () => {
			expect(coupons()!.sql).toMatch(/unique\s*\(\s*event_id\s*,\s*code\s*\)/i);
		});

		it('refuses a nonsensical discount in the database, not only in the API', () => {
			expect(coupons()!.sql).toMatch(/discount_type[\s\S]*check \(discount_type in \('percentage', 'fixed'\)\)/i);
			expect(coupons()!.sql).toMatch(/check \(discount_value > 0\)/i);
			expect(coupons()!.sql).toMatch(/event_coupons_percentage_range/i);
			expect(coupons()!.sql).toMatch(/event_coupons_window/i);
			expect(coupons()!.sql).toMatch(/uses <= max_uses|event_coupons_uses_within_limit/i);
		});

		it('isolates coupons by organizer through row level security', () => {
			expect(coupons()!.sql).toMatch(/alter table public\.event_coupons enable row level security/i);
			expect(coupons()!.sql).toMatch(
				/create policy manage_coupons on public\.event_coupons[\s\S]*public\.owns_event\(event_id\)/i,
			);
		});

		it('indexes the lookup the checkout does on every attempt', () => {
			expect(coupons()!.sql).toMatch(/create index event_coupons_event_id_code_idx/i);
		});
	});

	describe('CMS migration', () => {
		const cms = () => migrations().find(({ file }) => file.includes('cms_admin_and_cleanup'));

		it('removes the unused ai_prompts table from the schema', () => {
			expect(cms()).toBeDefined();
			expect(cms()!.sql).toMatch(/drop table if exists public\.ai_prompts/i);
		});

		it('enforces URL invariants for pages, posts and redirects in Postgres', () => {
			expect(cms()!.sql).toMatch(/constraint pages_permalink_format check/i);
			expect(cms()!.sql).toMatch(/constraint posts_slug_format check/i);
			expect(cms()!.sql).toMatch(/constraint redirects_url_from_relative check/i);
		});

		it('links event blocks to categories and removes block items together with their page block', () => {
			expect(cms()!.sql).toMatch(
				/block_events_filter_by_category_fkey[\s\S]*references public\.event_categories\(id\) on delete set null/i,
			);
			expect(cms()!.sql).toMatch(
				/create or replace function public\.delete_page_block_item\(\)[\s\S]*security invoker/i,
			);
			expect(cms()!.sql).toMatch(/create trigger page_blocks_delete_item[\s\S]*after delete on public\.page_blocks/i);
			expect(cms()!.sql).toMatch(
				/revoke execute on function public\.delete_page_block_item\(\) from public, anon, authenticated/i,
			);
		});

		it('keeps the page freshness date in sync with its blocks for caching and sitemaps', () => {
			expect(cms()!.sql).toMatch(/create or replace function public\.touch_page_from_block\(\)/i);
			expect(cms()!.sql).toMatch(
				/create trigger page_blocks_touch_page[\s\S]*after insert or update or delete on public\.page_blocks/i,
			);
		});

		it('stores a default Open Graph image on the site settings', () => {
			expect(cms()!.sql).toMatch(
				/alter table public\.site_settings[\s\S]*add column if not exists default_og_image uuid references public\.media_files\(id\) on delete set null/i,
			);
		});
	});

	describe('registration receipt migration', () => {
		it('keeps the provider receipt url on the registration, so the buyer can open it later', () => {
			const migration = migrations().find(({ file }) => file.includes('registration_receipt_url'));

			expect(migration).toBeDefined();
			expect(migration!.sql).toMatch(
				/alter table public\.event_registrations[\s\S]*add column if not exists receipt_url text/i,
			);
		});
	});

	describe('event pages migration', () => {
		const pages = () => migrations().find(({ file }) => file.includes('event_pages'));

		it('stores one landing page per event, as a JSON layout with draft and published copies', () => {
			expect(pages()).toBeDefined();
			expect(pages()!.sql).toMatch(/create table public\.event_pages/i);
			expect(pages()!.sql).toMatch(/event_id uuid primary key references public\.events\(id\) on delete cascade/i);
			expect(pages()!.sql).toMatch(/draft jsonb not null/i);
			expect(pages()!.sql).toMatch(/published jsonb/i);
			expect(pages()!.sql).toMatch(/enabled boolean not null default false/i);
		});

		it('lets the organizer read it, the public read only the published copy through the API, and only the API write', () => {
			expect(pages()!.sql).toMatch(/alter table public\.event_pages enable row level security/i);
			expect(pages()!.sql).toMatch(/create policy read_event_pages on public\.event_pages for select[\s\S]*public\.owns_event\(event_id\)/i);
			expect(pages()!.sql).toMatch(/revoke insert, update, delete on public\.event_pages from anon, authenticated/i);
		});
	});

	describe('nominal tickets migration', () => {
		const nominal = () => migrations().find(({ file }) => file.includes('nominal_tickets'));

		it('issues one ticket row per purchased unit, tied to the order and the event', () => {
			expect(nominal()).toBeDefined();
			expect(nominal()!.sql).toMatch(/create table public\.registration_tickets/i);
			expect(nominal()!.sql).toMatch(
				/registration_id uuid not null references public\.event_registrations\(id\) on delete cascade/i,
			);
			expect(nominal()!.sql).toMatch(/event_id uuid not null references public\.events\(id\)/i);
			expect(nominal()!.sql).toMatch(/constraint registration_tickets_sequence_key unique \(registration_id, sequence\)/i);
		});

		it('gives every ticket its own code, so five people never share one at the door', () => {
			expect(nominal()!.sql).toMatch(/constraint registration_tickets_code_key unique \(ticket_code\)/i);
			expect(nominal()!.sql).toMatch(/check_in_date timestamptz/i);
		});

		it('keeps a ticket either fully named or pending, never half-filled', () => {
			expect(nominal()!.sql).toMatch(/constraint registration_tickets_attendee_complete check/i);
		});

		it('backfills existing orders: the buyer keeps the code already e-mailed on the first unit', () => {
			expect(nominal()!.sql).toMatch(/insert into public\.registration_tickets[\s\S]*generate_series\(1, greatest\(r\.quantity, 1\)\)/i);
			expect(nominal()!.sql).toMatch(/when s\.sequence = 1 and r\.ticket_code is not null then r\.ticket_code/i);
		});

		it('lets buyers, named attendees and organizers read tickets, and only the API write them', () => {
			expect(nominal()!.sql).toMatch(/alter table public\.registration_tickets enable row level security/i);
			expect(nominal()!.sql).toMatch(
				/create policy read_registration_tickets on public\.registration_tickets for select to authenticated[\s\S]*attendee_email[\s\S]*public\.owns_event\(event_id\)/i,
			);
			expect(nominal()!.sql).not.toMatch(/grant insert, update, delete on public\.registration_tickets/i);
		});

		it('indexes the lookups the account page and the door make', () => {
			expect(nominal()!.sql).toMatch(/create index registration_tickets_registration_id_idx/i);
			expect(nominal()!.sql).toMatch(/create index registration_tickets_attendee_email_idx[\s\S]*lower\(attendee_email\)/i);
		});
	});

	describe('payment transactions idempotency migration', () => {
		const migration = () =>
			migrations().find(({ file }) => file.includes('payment_transactions_provider_event_unique'));

		it('backs the API upsert on provider_event_id with a full unique constraint', () => {
			// O cliente Supabase gera `on conflict (provider_event_id)` sem predicado;
			// o Postgres não infere um índice parcial a partir disso (erro 42P10), e
			// o checkout em modo mock e os webhooks caíam em 500 ao gravar a transação.
			const repository = readFileSync(
				join(repositoryRoot, 'apps/api/src/infrastructure/supabase/payment-repository.ts'),
				'utf8',
			);

			expect(repository).toMatch(/\.upsert\([^)]*onConflict:\s*'provider_event_id'/);
			expect(migration()).toBeDefined();
			expect(migration()!.sql).toMatch(/drop index if exists public\.payment_transactions_provider_event_idx/i);
			expect(migration()!.sql).toMatch(
				/alter table public\.payment_transactions[\s\S]*add constraint payment_transactions_provider_event_id_key unique \(provider_event_id\)/i,
			);
		});
	});
});
