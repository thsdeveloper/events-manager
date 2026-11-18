import { describe, expect, it } from 'vitest';
import type { IamAccess } from '@events-manager/contracts';
import { presentIamResponse } from '../src/application/iam/presentation.js';
const access: IamAccess = {
	userId: 'u',
	organizationId: 'o',
	active: true,
	isOwner: false,
	permissions: [],
	events: [{ eventId: 'e', permissions: ['events.read', 'participants.read', 'checkin.execute'] }],
};
describe('IAM response privacy', () => {
	it('does not expose bank identity to operational members', () => {
		const result = presentIamResponse(
			'/api/organizer/profile',
			{ organizer: { id: 'o', name: 'Org', payout_pix_key: 'private', document: 'private' } },
			access,
		);
		expect(JSON.stringify(result)).not.toContain('private');
		expect(result).toMatchObject({ organizer: { name: 'Org' } });
	});
	it('keeps check-in status while removing financial amounts and full documents', () => {
		const result = presentIamResponse(
			'/api/admin/participantes',
			{
				data: [
					{
						id: 't',
						event: { id: 'e' },
						attendee_name: 'Ana',
						attendee_document: '12345678901',
						unit_price: 12345,
						registration: {
							payment_status: 'paid',
							total_amount: 12345,
							receipt_url: 'private',
							participant_document: 'private',
						},
					},
				],
			},
			access,
		);
		expect(JSON.stringify(result)).not.toContain('12345');
		expect(JSON.stringify(result)).not.toContain('private');
		expect(result).toMatchObject({ data: [{ attendee_name: 'Ana', registration: { payment_status: 'paid' } }] });
	});
	it('does not expose registration financial aggregates through event details', () => {
		const result = presentIamResponse(
			'/api/events/:id',
			{ id: 'e', registrations: [{ total_amount: 12345, quantity: 1 }], tickets: [{ id: 'ticket', price: 250 }] },
			access,
		);
		expect(JSON.stringify(result)).not.toContain('12345');
		expect(result).toMatchObject({ tickets: [] });
	});
});
