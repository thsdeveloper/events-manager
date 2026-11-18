import { hasPermission, hasAnyEventPermission, iamTokenSchema, iamMemberInputSchema, type IamAccess } from './iam.js';
import { describe, expect, it } from 'vitest';
import {
	iamAssignmentSchema,
	iamInvitationSchema,
	iamRoleInputSchema,
	permissionDefinitions,
	builtinRoles,
} from './iam.js';

const id = '11111111-1111-4111-8111-111111111111';
describe('IAM contracts', () => {
	it('normalizes invitation email and requires explicit role assignments', () => {
		expect(
			iamInvitationSchema.parse({ email: '  Person@Example.com ', assignments: [{ roleId: id, eventId: null }] }).email,
		).toBe('person@example.com');
		expect(iamInvitationSchema.safeParse({ email: 'person@example.com', assignments: [] }).success).toBe(false);
	});
	it('rejects unknown permissions and global privilege fields', () => {
		expect(iamRoleInputSchema.safeParse({ name: 'Role', permissions: ['platform.admin'] }).success).toBe(false);
		expect(iamRoleInputSchema.safeParse({ name: 'Role', permissions: ['events.read'], is_system: true }).success).toBe(
			false,
		);
	});
	it('requires a valid event scope and rejects client-supplied organization identities', () => {
		expect(iamAssignmentSchema.safeParse({ roleId: id, eventId: 'other' }).success).toBe(false);
		expect(iamAssignmentSchema.safeParse({ roleId: id, eventId: null, organizationId: id }).success).toBe(false);
	});
	it('limits assignment counts and prevents duplicate grants', () => {
		expect(
			iamInvitationSchema.safeParse({
				email: 'a@example.com',
				assignments: [
					{ roleId: id, eventId: null },
					{ roleId: id, eventId: null },
				],
			}).success,
		).toBe(false);
	});
	it('keeps operational roles separate from financial and platform authority', () => {
		const checkin = builtinRoles.find((role) => role.key === 'checkin')!;
		expect(checkin.permissions).toContain('checkin.execute');
		expect(checkin.permissions).not.toContain('finance.read');
		expect(checkin.permissions).not.toContain('users.invite');
		expect(builtinRoles.find((role) => role.key === 'finance')!.permissions).not.toContain('refunds.create');
		expect(new Set(permissionDefinitions.map((p) => p.key)).size).toBe(permissionDefinitions.length);
	});
});

describe('effective authorization helpers', () => {
	const access: IamAccess = {
		userId: 'user',
		organizationId: 'org',
		active: true,
		isOwner: false,
		permissions: ['events.read'],
		events: [{ eventId: 'a', permissions: ['checkin.execute'] }],
	};
	it('requires active, server-derived grants even when a caller claims ownership', () => {
		expect(hasPermission(null, 'events.read')).toBe(false);
		expect(hasPermission({ ...access, active: false }, 'events.read')).toBe(false);
		expect(hasPermission({ ...access, isOwner: true, permissions: [] }, 'roles.create')).toBe(false);
	});
	it('honors organizational grants and exact event grants', () => {
		expect(hasPermission(access, 'events.read', 'b')).toBe(true);
		expect(hasPermission(access, 'checkin.execute', 'a')).toBe(true);
		expect(hasPermission(access, 'checkin.execute', 'b')).toBe(false);
		expect(hasPermission(access, 'checkin.execute')).toBe(false);
		expect(hasAnyEventPermission(access, 'checkin.execute')).toBe(true);
		expect(hasAnyEventPermission(access, 'events.read')).toBe(true);
		expect(hasAnyEventPermission(access, 'finance.read')).toBe(false);
		expect(hasAnyEventPermission(null, 'finance.read')).toBe(false);
		expect(hasAnyEventPermission({ ...access, active: false }, 'checkin.execute')).toBe(false);
	});
	it('rejects organization permissions masquerading as event grants', () => {
		const malformed = {
			...access,
			permissions: [],
			events: [{ eventId: 'a', permissions: ['roles.create' as const] }],
		};
		expect(hasPermission(malformed, 'roles.create', 'a')).toBe(false);
		expect(hasAnyEventPermission(malformed, 'roles.create')).toBe(false);
	});
	it('deduplicates custom permissions and rejects malformed or oversized assignments', () => {
		expect(
			iamRoleInputSchema.parse({ name: 'Recepção', permissions: ['checkin.execute', 'checkin.execute'] }).permissions,
		).toEqual(['checkin.execute']);
		expect(
			iamInvitationSchema.safeParse({
				email: 'valid@example.com',
				assignments: Array.from({ length: 101 }, (_, i) => ({
					roleId: id,
					eventId: `11111111-1111-4111-8111-${String(i).padStart(12, '0')}`,
				})),
			}).success,
		).toBe(false);
		expect(
			iamMemberInputSchema.safeParse({ status: 'removed', assignments: [{ roleId: id, eventId: null }] }).success,
		).toBe(false);
		expect(iamTokenSchema.safeParse({ token: 'a'.repeat(43) }).success).toBe(true);
		expect(iamTokenSchema.safeParse({ token: 'secret' }).success).toBe(false);
	});
});
