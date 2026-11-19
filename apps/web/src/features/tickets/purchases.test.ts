import { expect, it } from 'vitest';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { groupTicketPurchases } from './purchases';
it('groups units and different ticket types by purchase, preserving separate purchases of the same event', () => {
	const first = buildNominalTicket();
	const second = buildNominalTicket({
		id: 't2',
		registration: { ...first.registration, id: 'r2', checkout_group_id: 'purchase1' },
	});
	const rows = [
		{ ...first, registration: { ...first.registration, checkout_group_id: 'purchase1' } },
		second,
		buildNominalTicket({ id: 't3', registration: { ...first.registration, id: 'r3' } }),
	];
	const grouped = groupTicketPurchases(rows);
	expect(grouped.map((purchase) => purchase.id)).toEqual(['purchase1', 'r3']);
	expect(grouped[0].tickets).toHaveLength(2);
});
it('groups legacy units by registration without merging different purchases', () => {
	const first = buildNominalTicket();
	expect(groupTicketPurchases([first, { ...first, id: 'second' }])).toHaveLength(1);
});
