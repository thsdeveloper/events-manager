import { screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { PurchaseDetails } from './PurchaseDetails';
vi.mock('next/link', () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
const own = buildNominalTicket({ purchased_by_me: true, can_edit_attendee: false });
const guest = buildNominalTicket({
	id: 't2',
	is_buyer: false,
	purchased_by_me: true,
	attendee_name: null,
	attendee_email: null,
});
it('shows every ticket in a purchase and only lets the buyer name third parties', async () => {
	mockFetch([
		['/api/user/purchases/p1', () => jsonResponse({ id: 'p1', tickets: [own, guest], installments: [] })],
		[
			'/api/user/tickets/t2/attendee',
			() => jsonResponse({ ...guest, attendee_name: 'Bia Lima', attendee_email: 'bia@example.test' }),
		],
	]);
	const { user } = renderWithProviders(<PurchaseDetails purchaseId="p1" />);
	expect(await screen.findByRole('heading', { name: /Seus ingressos/ })).toBeInTheDocument();
	expect(screen.getByText('2 ingressos')).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Alterar participante' })).not.toBeInTheDocument();
	const ownTicket = within(screen.getByRole('article', { name: 'Ingresso 1' }));
	expect(ownTicket.queryByRole('button', { name: /participante/i })).not.toBeInTheDocument();
	const guestTicket = within(screen.getByRole('article', { name: 'Ingresso 2' }));
	const participant = within(guestTicket.getByRole('group', { name: 'Participante' }));
	await user.click(participant.getByRole('button', { name: 'Informar participante' }));
	await user.type(screen.getByLabelText('Nome completo'), 'Bia Lima');
	await user.type(screen.getByLabelText('E-mail'), 'bia@example.test');
	await user.click(screen.getByRole('button', { name: 'Salvar participante' }));
	expect(await participant.findByText('Bia Lima')).toBeInTheDocument();
	expect(participant.getByRole('button', { name: 'Alterar participante' })).toBeInTheDocument();
	expect(await screen.findByRole('img', { name: /QR Code de Ana Souza/ })).toBeInTheDocument();
});
it('shows paid and future Pix installments and withholds ticket QR codes until fully paid', async () => {
	const ticket = {
		...own,
		registration: {
			...own.registration,
			is_installment_payment: true,
			total_installments: 2,
			installment_plan_status: 'active',
			status: 'partial_payment',
			payment_status: 'pending',
		},
	};
	mockFetch([
		[
			'/api/user/purchases/p1',
			() =>
				jsonResponse({
					id: 'p1',
					tickets: [ticket],
					installments: [
						{
							id: 'i1',
							registration_id: 'reg-1',
							installment_number: 1,
							total_installments: 2,
							amount: 50,
							due_date: '2026-11-01',
							paid_at: '2026-11-01T10:00:00Z',
							status: 'paid',
						},
						{
							id: 'i2',
							registration_id: 'reg-1',
							installment_number: 2,
							total_installments: 2,
							amount: 50,
							due_date: '2099-12-01',
							paid_at: null,
							status: 'pending',
						},
					],
				}),
		],
		[
			'/api/installments/i2/generate-pix',
			() =>
				jsonResponse({
					payment: {
						provider_transaction_id: 'pix2',
						pix_copy_paste: 'SECOND-PIX',
						pix_qr_code: null,
						amount: 50,
						expires_at: null,
					},
				}),
		],
	]);
	renderWithProviders(<PurchaseDetails purchaseId="p1" />);
	expect(await screen.findByText('1 de 2 parcelas pagas')).toBeInTheDocument();
	expect(await screen.findByDisplayValue('SECOND-PIX')).toBeInTheDocument();
	expect(screen.getByText(/ingressos.*após.*todas as parcelas/i)).toBeInTheDocument();
	const history = screen.getByRole('list', { name: 'Parcelas do Pix' });
	expect(within(history).getByText('Paga')).toBeInTheDocument();
	expect(within(history).getByText('A vencer')).toBeInTheDocument();
	expect(screen.queryByRole('img', { name: /QR Code de/ })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: /Baixar ingresso/ })).not.toBeInTheDocument();
});
it('explains credit installments without pretending to track the bank invoice', async () => {
	mockFetch([
		[
			'/api/user/purchases/p1',
			() =>
				jsonResponse({
					id: 'p1',
					tickets: [{ ...own, registration: { ...own.registration, payment_method: 'card', card_installments: 3 } }],
					installments: [],
				}),
		],
	]);
	renderWithProviders(<PurchaseDetails purchaseId="p1" />);
	expect(await screen.findByText('Cartão de crédito · 3 parcelas')).toBeInTheDocument();
	expect(screen.getByText(/fatura.*banco/i)).toBeInTheDocument();
	expect(screen.queryByRole('list', { name: 'Parcelas do Pix' })).not.toBeInTheDocument();
});
it('offers a retry after a failed request', async () => {
	mockFetch([['/api/user/purchases/p1', () => jsonResponse({ detail: 'Compra indisponível.' }, { status: 503 })]]);
	renderWithProviders(<PurchaseDetails purchaseId="p1" />);
	expect(await screen.findByRole('alert')).toHaveTextContent('Compra indisponível.');
	expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
});
