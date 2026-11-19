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
		expect(screen.getByText(/Pendente de nomeação/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
		expect(screen.queryByText('Apresente este código na entrada do evento')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Informar participante' }));

		expect(onChangeAttendee).toHaveBeenCalledWith(pending);
	});
});

it.each([
	{ status: 'pending', payment_status: 'pending', label: 'Aguardando pagamento' },
	{ status: 'confirmed', payment_status: 'pending', label: 'Aguardando pagamento' },
	{ status: 'partial_payment', payment_status: 'pending', label: 'Aguardando pagamento' },
	{ status: 'cancelled', payment_status: 'paid', label: 'Cancelado' },
	{ status: 'confirmed', payment_status: 'refunded', label: 'Reembolsado' },
])('does not issue an entry pass before payment or after cancellation: %j', async ({ label, ...registration }) => {
	const ticket = buildNominalTicket();
	const { user } = renderWithProviders(
		<TicketDetailsModal
			ticket={{
				...ticket,
				registration: { ...ticket.registration, ...registration },
				event: { ...ticket.event, online_url: 'https://example.test/transmissao' },
			}}
			onClose={vi.fn()}
		/>,
	);
	expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'PDF' }));
	expect(screen.queryByRole('img', { name: 'QR Code do Ingresso' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Copiar código do ingresso' })).not.toBeInTheDocument();
	expect(screen.queryByRole('link', { name: /Abrir transmissão/ })).not.toBeInTheDocument();
	expect(screen.queryByText('Apresente este código na entrada do evento')).not.toBeInTheDocument();
	expect(screen.queryByRole('link', { name: 'Comprovante' })).not.toBeInTheDocument();
});
