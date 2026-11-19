import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const workflow = readFileSync(
	resolve(import.meta.dirname, '../../../.github/workflows/email-notifications.yml'),
	'utf8',
);
describe('notification scheduler deployment', () => {
	it('requires explicit activation and uses an authenticated endpoint when the API is idle', () => {
		expect(workflow).toContain('schedule:');
		expect(workflow).toContain("vars.EMAIL_NOTIFICATIONS_ENABLED == 'true'");
		expect(workflow).toContain('/internal/notifications/process');
	});
	it('passes the dedicated secret through the environment without checkout or deploy credentials', () => {
		expect(workflow).toContain('secrets.NOTIFICATIONS_WORKER_TOKEN');
		expect(workflow).toContain('permissions: {}');
		expect(workflow).not.toMatch(/secrets\.(?:SUPABASE|FLY|VERCEL)|actions\/checkout/);
		expect(workflow).toContain('os.environ');
	});
	it('prevents overlapping schedules and sets finite execution time', () => {
		expect(workflow).toContain('cancel-in-progress: false');
		expect(workflow).toContain('timeout-minutes:');
		expect(workflow).toContain('timeout=240');
	});
});
