/**
 * Detalhes de um ingresso nominal em "Meus ingressos": quem vai nele, o valor
 * daquele ingresso, o comprovante do pedido e a chance de nomear o participante.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { TicketDetailsModal } from './TicketDetailsModal';

describe('TicketDetailsModal', () => {
	it('offers the provider receipt among the ticket actions', () => {
		renderWithProviders(<TicketDetailsModal ticket={buildNominalTicket()} onClose={vi.fn()} />);

		expect(screen.getByRole('link', { name: /comprovante/i })).toHaveAttribute(
			'href',
			'https://app.abacatepay.com/receipt/tran_RPhEkpapRnDBuQnGZH2ReFSd',
		);
	});

	it('hides the receipt action when the payment produced none', () => {
		const ticket = buildNominalTicket();
		renderWithProviders(
			<TicketDetailsModal
				ticket={{ ...ticket, registration: { ...ticket.registration, receipt_url: null, payment_status: 'free' } }}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('link', { name: /comprovante/i })).not.toBeInTheDocument();
	});

	it('shows the attendee of this ticket and the price of this unit, not of the whole order', () => {
		renderWithProviders(<TicketDetailsModal ticket={buildNominalTicket()} onClose={vi.fn()} />);

		expect(screen.getByText('Ana Souza')).toBeInTheDocument();
		expect(screen.getByText('ana@events.local')).toBeInTheDocument();
		expect(screen.getByText('R$ 362,25')).toBeInTheDocument();
		expect(screen.queryByText('R$ 724,50')).not.toBeInTheDocument();
	});

	it('lets the buyer change the attendee, and says when it is still to be named', async () => {
		const onChangeAttendee = vi.fn();
		const pending = buildNominalTicket({ attendee_name: null, attendee_email: null, is_buyer: false });
		const { user } = renderWithProviders(
			<TicketDetailsModal ticket={pending} onClose={vi.fn()} onChangeAttendee={onChangeAttendee} />,
		);

		expect(screen.getByText('Participante a informar')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Informar participante' }));

		expect(onChangeAttendee).toHaveBeenCalledWith(pending);
	});
});
