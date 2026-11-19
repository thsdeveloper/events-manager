import { describe, expect, it } from 'vitest';
import {
	hasPlatformPermission,
	platformRoleSchema,
	platformInvitationSchema,
	platformPermissionDefinitions,
} from './platform-iam';
describe('platform IAM contracts', () => {
	it('grants only explicit active platform permissions', () => {
		expect(
			hasPlatformPermission({ active: true, permissions: ['platform_finance.read'] }, 'platform_finance.read'),
		).toBe(true);
		expect(
			hasPlatformPermission({ active: false, permissions: ['platform_finance.read'] }, 'platform_finance.read'),
		).toBe(false);
		expect(hasPlatformPermission({ active: true, isRoot: true, permissions: [] }, 'platform_finance.read')).toBe(false);
		expect(hasPlatformPermission({ active: true, permissions: ['finance.read'] }, 'platform_finance.read')).toBe(false);
		expect(hasPlatformPermission(null, 'platform_finance.read')).toBe(false);
	});
	it('does not accept tenant permissions in platform roles', () => {
		expect(platformRoleSchema.safeParse({ name: 'Suporte', permissions: ['events.read'] }).success).toBe(false);
		expect(platformRoleSchema.safeParse({ name: 'Suporte', permissions: ['platform_organizers.read'] }).success).toBe(
			true,
		);
	});
	it('requires global assignments and normalizes invitation email', () => {
		const assignment = { roleId: '10000000-0000-4000-8000-000000000001', eventId: null };
		expect(platformInvitationSchema.parse({ email: '  ANA@EXAMPLE.COM ', assignments: [assignment] }).email).toBe(
			'ana@example.com',
		);
		expect(
			platformInvitationSchema.safeParse({
				email: 'ana@example.com',
				assignments: [{ ...assignment, eventId: assignment.roleId }],
			}).success,
		).toBe(false);
		expect(
			platformInvitationSchema.safeParse({ email: 'ana@example.com', assignments: [assignment, assignment] }).success,
		).toBe(false);
	});
	it('has independent permissions for reading and sensitive changes', () => {
		const keys = platformPermissionDefinitions.map((p) => p.key);
		expect(keys).toContain('platform_receiving.review');
		expect(keys).toContain('platform_payouts.execute');
		expect(keys).toContain('platform_users.invite');
		expect(new Set(keys).size).toBe(keys.length);
	});
});
