import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(import.meta.dirname, '../../../.github/workflows/ci-deploy.yml'), 'utf8');

function jobDefinition(name: string): string {
	return workflow.split(new RegExp(`^  ${name}:\\s*$`, 'm'))[1]?.split(/^  [a-z_]+:\s*$/m)[0] ?? '';
}

describe('database deployment boundaries', () => {
	it('never runs fixture-based SQL tests against the linked remote database', () => {
		expect(workflow).not.toMatch(/supabase test db[^\n]*(?:--linked|--db-url)/);
		expect(jobDefinition('migrate')).not.toContain('supabase test db');
	});

	it('validates migrations and SQL tests in a fresh local database without deployment credentials', () => {
		const database = jobDefinition('database');

		expect(database).toContain('supabase db start');
		expect(database).toContain('supabase db reset --local --no-seed');
		expect(database).toContain('supabase test db --local');
		expect(database).not.toMatch(/secrets\.|environment:\s*development|continue-on-error:\s*true/);
		expect(database).toMatch(/if:\s*always\(\)[\s\S]*supabase stop --no-backup/);
	});

	it('blocks remote migrations until both application and database validation succeed', () => {
		expect(jobDefinition('migrate')).toMatch(/needs:\s*\[validate,\s*database\]/);
		expect(jobDefinition('migrate')).not.toMatch(/if:\s*always\(\)/);
	});

	it('disables demonstration seed data before bootstrapping the disposable database', () => {
		const database = jobDefinition('database');
		const bootstrap = database.split('supabase db start')[0];

		expect(bootstrap).toContain('enabled = false');
		expect(bootstrap).toContain('supabase/config.toml');
	});

	it('keeps remote deployment incremental without resets or demonstration seed data', () => {
		const migrate = jobDefinition('migrate');

		expect(migrate).toContain('supabase db push --linked --yes');
		expect(migrate).not.toMatch(/supabase db reset|--include-seed/);
	});
});
