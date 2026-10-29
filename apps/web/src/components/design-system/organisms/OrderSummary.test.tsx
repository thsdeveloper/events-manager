/**
 * O resumo da compra é o número em que a pessoa confia antes de pagar. Ele
 * mostra o que foi escolhido, o desconto aplicado e o total — e o total precisa
 * bater com a soma exibida, senão a fatura vira surpresa.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from '@/test';
import { OrderSummary } from './OrderSummary';

const items = [
	{ id: 'a', title: 'Inteira', quantity: 2, unitPrice: 100 },
	{ id: 'b', title: 'Meia', quantity: 1, unitPrice: 50 },
];

describe('OrderSummary', () => {
	it('lists each chosen ticket with its quantity and line total', () => {
		render(<OrderSummary items={items} />);

		expect(screen.getByText('Inteira')).toBeInTheDocument();
		expect(screen.getByText('2 × R$ 100,00')).toBeInTheDocument();
		expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
	});

	it('totals the cart when there is no coupon', () => {
		render(<OrderSummary items={items} />);

		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 250,00');
		expect(screen.queryByText('Desconto')).not.toBeInTheDocument();
	});

	it('shows the discount and the total the server calculated', () => {
		render(<OrderSummary items={items} coupon={{ code: 'JOVENS10', discount: 25, subtotal: 250, total: 225 }} />);

		expect(screen.getByText('JOVENS10')).toBeInTheDocument();
		expect(screen.getByText('− R$ 25,00')).toBeInTheDocument();
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 225,00');
	});

	it('invites the buyer to pick a ticket when the cart is empty', () => {
		render(<OrderSummary items={[]} />);

		expect(screen.getByText(/selecione ao menos um ingresso/i)).toBeInTheDocument();
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 0,00');
	});

	it('keeps the call to action out of reach until something is chosen', () => {
		render(<OrderSummary items={[]} actionLabel="Continuar" onAction={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
	});

	it('enables the call to action once there is something to pay for', () => {
		render(<OrderSummary items={items} actionLabel="Continuar" onAction={vi.fn()} />);

		expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
	});

	it('shows the coupon once, on the discount line, with a way to remove it', async () => {
		const onRemoveCoupon = vi.fn();
		render(
			<OrderSummary
				items={items}
				coupon={{ code: 'JOVENS10', discount: 25, subtotal: 250, total: 225 }}
				onRemoveCoupon={onRemoveCoupon}
			/>,
		);

		expect(screen.getAllByText('JOVENS10')).toHaveLength(1);
		await userEvent.click(screen.getByRole('button', { name: 'Remover cupom' }));

		expect(onRemoveCoupon).toHaveBeenCalled();
	});

	it('tells the buyer how much they save next to the total', () => {
		render(<OrderSummary items={items} coupon={{ code: 'JOVENS10', discount: 25, subtotal: 250, total: 225 }} />);

		expect(screen.getByText('Você economiza R$ 25,00')).toBeInTheDocument();
	});

	it('says how much of the subtotal is service fee', () => {
		const withFees = [
			{ id: 'a', title: 'Inteira', quantity: 2, unitPrice: 100, unitFee: 5 },
			{ id: 'b', title: 'Meia', quantity: 1, unitPrice: 50, unitFee: 2.5 },
		];
		render(<OrderSummary items={withFees} />);

		expect(screen.getByText('Inclui R$ 12,50 de taxa de serviço')).toBeInTheDocument();
	});

	it('stays quiet about fees when there are none', () => {
		render(<OrderSummary items={items} />);

		expect(screen.queryByText(/taxa de serviço/)).not.toBeInTheDocument();
	});
});
