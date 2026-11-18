import { renderAsOwner } from '@/test/permissions';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { EventTicket } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse } from '@/test';
import { EventTicketManager } from './EventTicketManager';
const a = {
	id: 'a',
	event_id: 'e',
	title: 'Pista',
	price: 20,
	quantity: 100,
	quantity_sold: 0,
	sort: 0,
	service_fee_type: 'absorbed',
	visibility: 'public',
	status: 'active',
} as EventTicket;
const b = { ...a, id: 'b', title: 'Camarote', price: 50, quantity: 10, sort: 1 };
const fee: [string, () => Response] = [
	'/api/content/fees',
	() =>
		jsonResponse({
			platform_fee_percentage: 5,
			platform_fee_minimum: 0,
			card_fee_percentage: 3.5,
			card_fee_fixed: 0.6,
		}),
];
describe('event ticket manager', () => {
	it('shows confirmed sales separately from held stock and only actual payments as revenue', async () => {
		mockFetch([['/api/admin/eventos/e/grupos', () => jsonResponse({ data: [] })], fee]);
		renderAsOwner(
			<EventTicketManager
				eventId="e"
				tickets={[a]}
				isFree={false}
				registrations={[
					{ quantity: 2, payment_status: 'paid', payment_amount: 40 },
					{ quantity: 3, payment_status: 'pending', inventory_reserved: true, payment_amount: 0 },
				]}
			/>,
		);
		await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
		expect(screen.getByText('Vendidos confirmados').parentElement).toHaveTextContent('2');
		expect(screen.getByText('Reservas pendentes').parentElement).toHaveTextContent('3');
		expect(screen.getByText('Recebido').parentElement).toHaveTextContent('40,00');
	});
	it('persists the complete order and refreshes after success', async () => {
		const changed = vi.fn();
		const fetcher = mockFetch([
			['/api/admin/eventos/e/grupos', () => jsonResponse({ data: [] })],
			['/api/admin/eventos/e/ingressos/ordem', () => jsonResponse({ success: true })],
			fee,
		]);
		const { user } = renderAsOwner(
			<EventTicketManager eventId="e" tickets={[a, b]} isFree={false} onChanged={changed} />,
		);
		await user.click(screen.getByRole('button', { name: 'Mover Camarote para cima' }));
		await waitFor(() => expect(changed).toHaveBeenCalled());
		const call = fetcher.mock.calls.find(([url]) => url === '/api/admin/eventos/e/ingressos/ordem');
		expect(JSON.parse(String(call?.[1]?.body))).toEqual({ ticket_ids: ['b', 'a'] });
	});
	it('restores the previous order and explains a refused save', async () => {
		mockFetch([
			['/api/admin/eventos/e/grupos', () => jsonResponse({ data: [] })],
			[
				'/api/admin/eventos/e/ingressos/ordem',
				() => problemResponse(422, 'INVALID_TICKET_ORDER', 'Atualize a lista e tente novamente.'),
			],
			fee,
		]);
		const { user } = renderAsOwner(<EventTicketManager eventId="e" tickets={[a, b]} isFree={false} />);
		await user.click(screen.getByRole('button', { name: 'Mover Camarote para cima' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Atualize a lista');
		expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Pista');
	});
	it('saves a new group before it becomes available to ticket forms', async () => {
		let saved = false;
		const changed = vi.fn();
		const fetcher = mockFetch([
			[
				'/api/admin/eventos/e/grupos',
				(_url, init) => {
					if (init?.method === 'POST') {
						saved = true;

						return jsonResponse({ id: 'g', title: 'Setor A' });
					}

					return jsonResponse({ data: saved ? [{ id: 'g', title: 'Setor A', parent_id: null, sort: 0 }] : [] });
				},
			],
			fee,
		]);
		const { user } = renderAsOwner(<EventTicketManager eventId="e" tickets={[a]} isFree={false} onChanged={changed} />);
		await user.type(await screen.findByRole('textbox', { name: 'Novo grupo' }), 'Setor A');
		await user.click(screen.getByRole('button', { name: 'Adicionar grupo' }));
		await user.click(screen.getByRole('button', { name: 'Salvar grupos' }));
		await waitFor(() => expect(changed).toHaveBeenCalled());
		const call = fetcher.mock.calls.find(
			([url, init]) => url === '/api/admin/eventos/e/grupos' && init?.method === 'POST',
		);
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ event_id: 'e', title: 'Setor A', parent_id: null });
	});
	it('duplicates and confirms removal of an unused type', async () => {
		const changed = vi.fn();
		const fetcher = mockFetch([
			['/api/admin/eventos/e/grupos', () => jsonResponse({ data: [] })],
			['/api/admin/ingressos/a/duplicate', () => jsonResponse({ id: 'copy' })],
			['/api/admin/ingressos/a', () => jsonResponse({ success: true })],
			fee,
		]);
		const { user } = renderAsOwner(<EventTicketManager eventId="e" tickets={[a]} isFree={false} onChanged={changed} />);
		await user.click(screen.getByRole('button', { name: 'Duplicar Pista' }));
		await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
		await user.click(screen.getByRole('button', { name: 'Remover Pista' }));
		const dialog = await screen.findByRole('alertdialog');
		await user.click(within(dialog).getByRole('button', { name: 'Excluir ingresso' }));
		await waitFor(() =>
			expect(fetcher).toHaveBeenCalledWith('/api/admin/ingressos/a', expect.objectContaining({ method: 'DELETE' })),
		);
	});
	it('keeps a type with occupied stock instead of deleting buyer records', async () => {
		const fetcher = mockFetch([['/api/admin/eventos/e/grupos', () => jsonResponse({ data: [] })], fee]);
		const { user } = renderAsOwner(
			<EventTicketManager eventId="e" tickets={[{ ...a, quantity_sold: 1 }]} isFree={false} />,
		);
		await user.click(screen.getByRole('button', { name: 'Remover Pista' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('vendas ou reservas');
		expect(fetcher.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
	});
});
