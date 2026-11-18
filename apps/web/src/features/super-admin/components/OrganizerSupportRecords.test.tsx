import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { OrganizerSupportRecords } from './OrganizerSupportRecords';
const pagination = { page: 1, limit: 10, total: 1, pageCount: 1 };
describe('organizer support records', () => {
	it('shows event dates, status, registrations and a public link only for published events', async () => {
		mockFetch([
			[
				/\/records\?/,
				() =>
					jsonResponse({
						data: [
							{
								id: 'event-1',
								title: 'Festival',
								slug: 'festival',
								status: 'published',
								start_date: '2026-11-18T12:00:00Z',
								location_name: 'Teatro',
								registrations: 4,
							},
							{
								id: 'event-2',
								title: 'Ensaio',
								slug: 'ensaio',
								status: 'draft',
								start_date: null,
								location_name: null,
								registrations: 0,
							},
						],
						pagination,
					}),
			],
		]);
		renderWithProviders(<OrganizerSupportRecords id="org-a" kind="events" />);
		expect(await screen.findByText('Festival')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Ver página do evento' })).toHaveAttribute('href', '/eventos/festival');
		expect(screen.getAllByRole('link')).toHaveLength(1);
		expect(screen.getByText('Teatro')).toBeInTheDocument();
	});
	it('displays payment references, fees and the organizer net amount', async () => {
		mockFetch([
			[
				/\/records\?/,
				() =>
					jsonResponse({
						data: [
							{
								id: 'payment-1',
								registration_id: 'order-1',
								event_title: 'Festival',
								participant_name: 'Ana',
								provider: 'mock',
								provider_object_id: 'provider-123',
								status: 'failed',
								amount: 100,
								provider_fee: 1,
								platform_fee: 5,
								organizer_net: 94,
								date_created: '2026-11-18T12:00:00Z',
							},
						],
						pagination,
					}),
			],
		]);
		renderWithProviders(<OrganizerSupportRecords id="org-a" kind="transactions" />);
		expect(await screen.findByText('Festival')).toBeInTheDocument();
		expect(screen.getByText(/provider-123/)).toBeInTheDocument();
		expect(screen.getByText(/Pedido: order-1/)).toBeInTheDocument();
		expect(screen.getByText('Falhou')).toBeInTheDocument();
		expect(screen.getByText(/94,00/)).toBeInTheDocument();
	});
	it('shows payout failure reasons, historical keys and safe receipts', async () => {
		mockFetch([
			[
				/\/records\?/,
				() =>
					jsonResponse({
						data: [
							{
								id: 'payout-1',
								amount: 100,
								net_amount: 99,
								status: 'failed',
								pix_key: 'original@example.com',
								pix_key_type: 'EMAIL',
								failure_reason: 'Conta destinatária indisponível',
								requested_at: '2026-11-18T12:00:00Z',
								processed_at: null,
								receipt_url: 'https://provider.example/receipt',
							},
							{ id: 'payout-2', status: 'pending', receipt_url: 'javascript:alert(1)' },
						],
						pagination,
					}),
			],
		]);
		renderWithProviders(<OrganizerSupportRecords id="org-a" kind="payouts" />);
		expect(await screen.findByText('Conta destinatária indisponível')).toBeInTheDocument();
		expect(screen.getByText(/original@example.com/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Abrir comprovante' })).toHaveAttribute(
			'href',
			'https://provider.example/receipt',
		);
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});
	it('explains field changes and shows internal notes without exposing unrelated fields', async () => {
		mockFetch([
			[
				/\/records\?/,
				() =>
					jsonResponse({
						data: [
							{
								id: 'audit-1',
								action: 'organizer.updated',
								reason: 'Contato conferido',
								date_created: '2026-11-18T12:00:00Z',
								actor: { name: 'Equipe', email: 'support@example.com' },
								before_data: { email: 'old@example.com', metadata: 'secret' },
								after_data: { email: 'new@example.com' },
							},
							{
								id: 'audit-2',
								action: 'organizer.support_note_added',
								actor: null,
								after_data: { note: 'Contato confirmado por telefone' },
							},
						],
						pagination,
					}),
			],
		]);
		const { user } = renderWithProviders(<OrganizerSupportRecords id="org-a" kind="activity" />);
		expect(await screen.findByText('Contato confirmado por telefone')).toBeInTheDocument();
		await user.click(screen.getByText('Ver alterações'));
		expect(screen.getByText(/old@example.com → new@example.com/)).toBeInTheDocument();
		expect(screen.queryByText('secret')).not.toBeInTheDocument();
	});
	it('offers retry after a failed load and reports an empty history', async () => {
		let failed = true;
		const fetchMock = mockFetch([
			[
				/\/records\?/,
				() =>
					failed
						? problemResponse(500, 'ERROR', 'Histórico indisponível.')
						: jsonResponse({ data: [], pagination: { ...pagination, total: 0 } }),
			],
		]);
		const { user } = renderWithProviders(<OrganizerSupportRecords id="org-a" kind="activity" />);
		expect(await screen.findByRole('alert')).toHaveTextContent('Histórico indisponível.');
		failed = false;
		await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
		expect(await screen.findByText('Nenhum registro encontrado.')).toBeInTheDocument();
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
	});
});
