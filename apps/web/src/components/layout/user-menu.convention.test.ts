import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every header of the product (public site, organizer area, platform
 * administration) shows the account through the same avatar and menu, so the
 * person always finds their profile, tickets and sign-out in the same place.
 */
const headers = [
	'src/components/layout/NavigationBar.tsx',
	'src/components/admin/AdminHeader.tsx',
	'src/features/super-admin/components/SuperAdminShell.tsx',
];

describe('account menu in headers', () => {
	it.each(headers)('%s renders the account through UserMenu', (file) => {
		const source = readFileSync(join(process.cwd(), file), 'utf8');

		expect(source).toContain('<UserMenu');
		// No hand-rolled initials badge next to the shared avatar.
		expect(source).not.toMatch(/const initials = /);
	});
});
