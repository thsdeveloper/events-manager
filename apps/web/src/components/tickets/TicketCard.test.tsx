import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { TicketCard } from './TicketCard';

const paid = buildNominalTicket();
const unpaid = {
	...paid,
	registration: { ...paid.registration, status: 'pending', payment_status: 'pending' },
};

describe('TicketCard payment confirmation', () => {
	it.each(['grid', 'list'] as const)(
		'shows a named but unpaid ticket as awaiting payment in %s view',
		async (variant) => {
			renderWithProviders(<TicketCard ticket={unpaid} variant={variant} onViewDetails={vi.fn()} />);
			expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument();
			expect(screen.queryByText('Confirmado')).not.toBeInTheDocument();
			await act(async () => {});
			expect(screen.queryByRole('img', { name: 'QR Code do ingresso' })).not.toBeInTheDocument();
			expect(screen.queryByText(unpaid.ticket_code)).not.toBeInTheDocument();
		},
	);
	it.each([
		{ status: 'confirmed', payment_status: 'pending' },
		{ status: 'partial_payment', payment_status: 'pending' },
		{ status: 'confirmed', payment_status: null },
	])('never treats registration status or a partial payment as proof of payment: %j', (registration) => {
		renderWithProviders(
			<TicketCard
				ticket={{ ...paid, registration: { ...paid.registration, ...registration } }}
				onViewDetails={vi.fn()}
			/>,
		);
		expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument();
	});
	it.each(['paid', 'free'])('keeps a named %s ticket confirmed with its entry QR', async (payment_status) => {
		renderWithProviders(
			<TicketCard
				ticket={{ ...paid, registration: { ...paid.registration, payment_status } }}
				onViewDetails={vi.fn()}
			/>,
		);
		expect(screen.getByText('Confirmado')).toBeInTheDocument();
		expect(await screen.findByRole('img', { name: 'QR Code do ingresso' })).toBeInTheDocument();
	});
	it('withdraws the QR if payment is no longer confirmed without remounting the card', async () => {
		const { rerender } = renderWithProviders(<TicketCard ticket={paid} onViewDetails={vi.fn()} />);
		await screen.findByRole('img', { name: 'QR Code do ingresso' });
		rerender(<TicketCard ticket={unpaid} onViewDetails={vi.fn()} />);
		expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument();
		expect(screen.queryByRole('img', { name: 'QR Code do ingresso' })).not.toBeInTheDocument();
	});
});
