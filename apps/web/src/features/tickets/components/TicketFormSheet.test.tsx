import { describe, it, expect, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import { mockFetch, jsonResponse, renderWithProviders } from '@/test';
import { TicketFormSheet } from './TicketFormSheet';
import type { TicketDraft } from '../types';
function setup(ticket?: TicketDraft) {
	mockFetch([
		[
			'/api/content/fees',
			() =>
				jsonResponse({
					platform_fee_percentage: 5,
					platform_fee_minimum: 3,
					card_fee_percentage: 0,
					card_fee_fixed: 0,
				}),
		],
	]);
	const saved = vi.fn();

	return {
		saved,
		...renderWithProviders(
			<TicketFormSheet
				open
				onOpenChange={vi.fn()}
				pricing="paid"
				eventId={null}
				ticket={ticket}
				onSaved={saved}
				groups={[{ id: 'g', title: 'Pista' }]}
			/>,
		),
	};
}
describe('ticket creation rules', () => {
	it('edits the ticket sales period through its calendars and rejects an end before its start', async () => {
		const { user, saved } = setup({
			clientId: 'draft-ticket',
			title: 'Lote inicial',
			price: 50,
			quantity: 20,
			service_fee_type: 'passed_to_buyer',
			visibility: 'public',
			min_quantity_per_purchase: 1,
			max_quantity_per_purchase: 5,
			allow_installments: false,
			sale_start_date: '2026-12-01T09:00:00-03:00',
			sale_end_date: '2026-12-02T18:00:00-03:00',
		});
		await user.click(screen.getByRole('button', { name: 'Início' }));
		await user.click(screen.getByRole('button', { name: /\b3 de dezembro de 2026/i }));
		await user.click(screen.getByRole('button', { name: 'Concluir' }));
		await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
		expect(await screen.findByText('O fim das vendas deve ser depois do início')).toBeInTheDocument();
		expect(saved).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Fim' }));
		await user.click(screen.getByRole('button', { name: /\b4 de dezembro de 2026/i }));
		await user.click(screen.getByRole('button', { name: 'Concluir' }));
		await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
		await waitFor(() =>
			expect(saved).toHaveBeenCalledWith(
				expect.objectContaining({
					sale_start_date: '2026-12-03T12:00:00.000Z',
					sale_end_date: '2026-12-04T21:00:00.000Z',
				}),
			),
		);
		expect(saved).toHaveBeenCalledTimes(1);
	});

	it.each([
		{ start: '2026-12-01T09:00:00-03:00', end: '2026-12-02T18:00:00-03:00' },
		{ start: '2026-12-01T12:00:00Z', end: '2026-12-01T10:00:00-03:00' },
	])('preserves sales instants and inactive status across time zones ($start / $end)', async ({ start, end }) => {
		const { user, saved } = setup({
			clientId: 'draft-ticket',
			title: 'Lote migrado',
			price: 50,
			quantity: 20,
			service_fee_type: 'passed_to_buyer',
			visibility: 'public',
			status: 'inactive',
			min_quantity_per_purchase: 1,
			max_quantity_per_purchase: 5,
			allow_installments: false,
			sale_start_date: start,
			sale_end_date: end,
		});
		await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
		await waitFor(() =>
			expect(saved).toHaveBeenCalledWith(
				expect.objectContaining({
					sale_start_date: new Date(start).toISOString(),
					sale_end_date: new Date(end).toISOString(),
					status: 'inactive',
				}),
			),
		);
	});

	it('keeps half-price admission as a separately priced and stocked draft', async () => {
		const { user, saved } = setup();
		const dialog = screen.getByRole('dialog');
		await user.type(within(dialog).getByRole('textbox', { name: /Nome do ingresso/ }), 'Estudante');
		await user.click(within(dialog).getByRole('combobox', { name: 'Categoria do ingresso' }));
		await user.click(screen.getByRole('option', { name: 'Meia-entrada' }));
		await user.click(within(dialog).getByRole('combobox', { name: 'Grupo ou subgrupo' }));
		await user.click(screen.getByRole('option', { name: /Pista/ }));
		const price = within(dialog).getByRole('spinbutton', { name: /Valor do ingresso/ });
		await user.clear(price);
		await user.type(price, '10');
		const quantity = within(dialog).getByRole('spinbutton', { name: /Quantidade disponível/ });
		await user.clear(quantity);
		await user.type(quantity, '20');
		await user.click(within(dialog).getByRole('button', { name: 'Adicionar ingresso' }));
		await waitFor(() =>
			expect(saved).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Estudante',
					admission_type: 'half_price',
					group_id: 'g',
					price: 10,
					quantity: 20,
				}),
			),
		);
	});
	it('does not accept a paid ticket that is too cheap to absorb the minimum fee', async () => {
		const { user, saved } = setup();
		const dialog = screen.getByRole('dialog');
		await user.type(within(dialog).getByRole('textbox', { name: /Nome do ingresso/ }), 'Econômico');
		const price = within(dialog).getByRole('spinbutton', { name: /Valor do ingresso/ });
		await user.clear(price);
		await user.type(price, '2');
		await user.click(within(dialog).getByRole('radio', { name: /Você absorve a taxa/ }));
		await user.click(within(dialog).getByRole('button', { name: 'Adicionar ingresso' }));
		await waitFor(() => expect(screen.getAllByText(/O preço não cobre a taxa mínima/).length).toBeGreaterThan(0));
		expect(saved).not.toHaveBeenCalled();
	});
});
