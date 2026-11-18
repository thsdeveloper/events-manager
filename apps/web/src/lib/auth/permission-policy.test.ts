import { describe, expect, it } from 'vitest';
import type { IamAccess, IamRole } from '@events-manager/contracts';
import { canVisitAdminPath, canDelegateRole, preferredAdminPath } from './permission-policy';
const operator: IamAccess = {
	userId: 'u',
	organizationId: 'o',
	isOwner: false,
	active: true,
	permissions: [],
	events: [{ eventId: 'event-a', permissions: ['events.read', 'participants.read', 'checkin.execute'] }],
};
describe('admin permission navigation', () => {
	it('denies missing context, financial areas and unknown pages', () => {
		expect(canVisitAdminPath(null, '/admin')).toBe(false);
		expect(canVisitAdminPath(operator, '/admin/financeiro')).toBe(false);
		expect(canVisitAdminPath(operator, '/admin/novo-modulo')).toBe(false);
	});
	it('allows check-in pages and only the authorized event', () => {
		expect(canVisitAdminPath(operator, '/admin/participantes')).toBe(true);
		expect(canVisitAdminPath(operator, '/admin/eventos/event-a')).toBe(true);
		expect(canVisitAdminPath(operator, '/admin/eventos/event-b')).toBe(false);
		expect(canVisitAdminPath(operator, '/admin/eventos/event-a/editar')).toBe(false);
	});
	it('lands an operator on participants instead of a financial dashboard', () => {
		expect(preferredAdminPath(operator)).toBe('/admin/participantes');
	});
	it('does not offer delegation outside the actor scope or the owner role', () => {
		const role: IamRole = {
			id: 'r',
			key: null,
			name: 'Role',
			description: '',
			organization_id: 'o',
			permissions: ['checkin.execute'],
		};
		expect(canDelegateRole(operator, role, 'event-a')).toBe(true);
		expect(canDelegateRole(operator, role, 'event-b')).toBe(false);
		expect(canDelegateRole(operator, role, null)).toBe(false);
		expect(canDelegateRole(operator, { ...role, key: 'owner' }, 'event-a')).toBe(false);
	});
});
