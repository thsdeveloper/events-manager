/**
 * Lista de inscrições na confirmação da compra. Quando o provedor já emitiu o
 * comprovante, a pessoa precisa conseguir abri-lo dali mesmo.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutRegistrationList } from './CheckoutRegistrationList';

const registration = {
	id: '00000000-0000-4000-8000-000000000020',
	status: 'confirmed',
	paymentStatus: 'paid',
	totalAmount: 362.25,
	ticketCode: 'EVT-7D5F942FFF94',
	receiptUrl: 'https://app.abacatepay.com/receipt/tran_RPhEkpapRnDBuQnGZH2ReFSd',
	event: { id: '00000000-0000-4000-8000-000000000030', title: 'Congresso de Jovens', slug: 'congresso' },
	tickets: [
		{
			id: '00000000-0000-4000-8000-000000000071',
			sequence: 1,
			ticketCode: 'EVT-7D5F942FFF94',
			attendeeName: 'Ana Souza',
			attendeeEmail: 'ana@events.local',
			isBuyer: true,
			ticketType: 'Meia Entrada',
		},
		{
			id: '00000000-0000-4000-8000-000000000072',
			sequence: 2,
			ticketCode: 'EVT-2222222222',
			attendeeName: null,
			attendeeEmail: null,
			isBuyer: false,
			ticketType: 'Meia Entrada',
		},
	],
};

describe('CheckoutRegistrationList', () => {
	it('links to the provider receipt once the payment is confirmed', () => {
		render(<CheckoutRegistrationList registrations={[registration]} />);

		expect(screen.getByRole('link', { name: /ver comprovante/i })).toHaveAttribute('href', registration.receiptUrl);
	});

	it('shows no receipt link while the provider has not issued one', () => {
		render(
			<CheckoutRegistrationList registrations={[{ ...registration, paymentStatus: 'pending', receiptUrl: null }]} />,
		);

		expect(screen.queryByRole('link', { name: /ver comprovante/i })).not.toBeInTheDocument();
		expect(screen.getByText('EVT-7D5F942FFF94')).toBeInTheDocument();
	});

	it('lists every ticket with who will use it, and points pending ones to the tickets area', () => {
		render(<CheckoutRegistrationList registrations={[registration]} />);

		expect(screen.getByText('EVT-7D5F942FFF94')).toBeInTheDocument();
		expect(screen.getByText(/Ana Souza/)).toBeInTheDocument();
		expect(screen.getByText('EVT-2222222222')).toBeInTheDocument();
		expect(screen.getByText(/participante a informar/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /informar participante/i })).toHaveAttribute(
			'href',
			'/perfil?section=ingressos',
		);
	});
});
