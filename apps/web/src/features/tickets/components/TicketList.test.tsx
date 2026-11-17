import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { TicketList } from './TicketList';
import type { TicketDraft } from '../types';
const a: TicketDraft = {
	id: 'a',
	title: 'Pista',
	price: 20,
	quantity: 100,
	service_fee_type: 'absorbed',
	visibility: 'public',
	min_quantity_per_purchase: 1,
	max_quantity_per_purchase: 5,
	allow_installments: false,
};
describe('organizer ticket ordering', () => {
	it('moves a type without changing its independent price or stock', async () => {
		const reordered = vi.fn();
		const { user } = renderWithProviders(
			<TicketList
				tickets={[a, { ...a, id: 'b', title: 'Camarote', price: 50, quantity: 10 }]}
				isFree={false}
				onAdd={vi.fn()}
				onEdit={vi.fn()}
				onRemove={vi.fn()}
				onReorder={reordered}
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Mover Camarote para cima' }));
		expect(reordered).toHaveBeenCalledWith([expect.objectContaining({ id: 'b', price: 50, quantity: 10 }), a]);
	});
});
