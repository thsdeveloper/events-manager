/**
 * A lista de ingressos precisa avisar a cada mudança de quantidade, porque o
 * resumo da compra fica ao lado e acompanha a escolha em tempo real — não só
 * quando a pessoa conclui a etapa.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EventTicket } from '@events-manager/contracts';
import { userEvent } from '@/test';
import TicketSelection from './TicketSelection';

const tickets = [
	{
		id: 'ticket-a',
		title: 'Inteira',
		description: 'Ingresso comum',
		status: 'active',
		quantity: 100,
		quantity_sold: 0,
		price: 90,
		buyer_price: 100,
		sale_start_date: null,
		sale_end_date: null,
		min_quantity_per_purchase: 1,
		max_quantity_per_purchase: 5,
	},
] as unknown as EventTicket[];

describe('TicketSelection', () => {
	it('reports the selection every time the quantity changes', async () => {
		const onSelectionChange = vi.fn();
		render(
			<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} onSelectionChange={onSelectionChange} />,
		);

		await userEvent.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));

		await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith([{ ticketId: 'ticket-a', quantity: 1 }]));
	});

	it('reports an empty cart once the buyer removes everything', async () => {
		const onSelectionChange = vi.fn();
		render(
			<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} onSelectionChange={onSelectionChange} />,
		);

		await userEvent.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));
		await userEvent.click(screen.getByRole('button', { name: 'Remover um ingresso Inteira' }));

		await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith([]));
	});

	it('names the quantity controls so they can be used without sight', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Remover um ingresso Inteira' })).toBeInTheDocument();
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toBeInTheDocument();
	});

	it('shows the price the buyer pays in Brazilian format and explains the fee', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
		expect(screen.getByText('R$ 90,00 + R$ 10,00 de taxa de serviço')).toBeInTheDocument();
	});

	it('tells the buyer there is no extra fee when the organizer absorbs it', () => {
		const absorbed = [{ ...tickets[0], service_fee_type: 'absorbed' }] as unknown as EventTicket[];
		render(<TicketSelection eventId="e-1" tickets={absorbed} onCheckout={vi.fn()} />);

		expect(screen.getByText('R$ 90,00')).toBeInTheDocument();
		expect(screen.getByText('Sem taxa adicional')).toBeInTheDocument();
	});

	it('states the purchase limit in plain words', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.getByText('Até 5 por compra')).toBeInTheDocument();
		expect(screen.queryByText(/Mín:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/Máx:/)).not.toBeInTheDocument();
	});

	it('starts the quantity at zero instead of an empty field', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toHaveValue(0);
	});

	it('warns when only a few tickets remain', () => {
		const scarce = [{ ...tickets[0], quantity: 100, quantity_sold: 92 }] as unknown as EventTicket[];
		render(<TicketSelection eventId="e-1" tickets={scarce} onCheckout={vi.fn()} />);

		expect(screen.getByText('Restam apenas 8 ingressos')).toBeInTheDocument();
	});

	it('shows plain availability when stock is comfortable', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.getByText('100 disponíveis')).toBeInTheDocument();
	});

	it('shows the line subtotal as the quantity grows', async () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} />);

		expect(screen.queryByText(/Subtotal/)).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));
		await userEvent.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));

		expect(screen.getByText('Subtotal R$ 200,00')).toBeInTheDocument();
	});

	it('explains why adding stops at the purchase limit', async () => {
		const limited = [{ ...tickets[0], max_quantity_per_purchase: 2 }] as unknown as EventTicket[];
		render(<TicketSelection eventId="e-1" tickets={limited} onCheckout={vi.fn()} />);

		const add = screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' });
		await userEvent.click(add);
		await userEvent.click(add);

		expect(add).toBeDisabled();
		expect(screen.getByText('Você chegou ao limite de 2 por compra')).toBeInTheDocument();
	});

	it('jumps straight to the minimum per purchase and back to zero', async () => {
		const onSelectionChange = vi.fn();
		const withMinimum = [{ ...tickets[0], min_quantity_per_purchase: 2 }] as unknown as EventTicket[];
		render(
			<TicketSelection
				eventId="e-1"
				tickets={withMinimum}
				onCheckout={vi.fn()}
				onSelectionChange={onSelectionChange}
			/>,
		);

		expect(screen.getByText('Mínimo de 2 por compra')).toBeInTheDocument();

		await userEvent.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));
		expect(onSelectionChange).toHaveBeenLastCalledWith([{ ticketId: 'ticket-a', quantity: 2 }]);

		await userEvent.click(screen.getByRole('button', { name: 'Remover um ingresso Inteira' }));
		expect(onSelectionChange).toHaveBeenLastCalledWith([]);
	});

	it('hides its own call to action when the summary owns it', () => {
		render(<TicketSelection eventId="e-1" tickets={tickets} onCheckout={vi.fn()} hideAction />);

		expect(screen.queryByRole('button', { name: /continuar/i })).not.toBeInTheDocument();
	});
});
