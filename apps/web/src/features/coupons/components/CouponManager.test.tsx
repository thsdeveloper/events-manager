/**
 * Tela do organizador para cadastrar cupons de um evento: percentual ou valor
 * fixo, com janela de validade, limite de usos e a contagem do que já foi usado.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Coupon } from '@events-manager/contracts';
import { userEvent } from '@/test';
import { CouponManager } from './CouponManager';

const coupon = {
	id: 'c-1',
	code: 'JOVENS10',
	description: 'Para membros',
	discount_type: 'percentage',
	discount_value: 10,
	status: 'active',
	starts_at: null,
	expires_at: '2026-12-31T00:00:00.000Z',
	max_uses: 50,
	uses: 3,
} as unknown as Coupon;

const noop = {
	create: vi.fn().mockResolvedValue(true),
	remove: vi.fn().mockResolvedValue(true),
	setStatus: vi.fn().mockResolvedValue(true),
};

describe('CouponManager', () => {
	it('shows each coupon with its discount and how much of it was used', () => {
		render(<CouponManager coupons={[coupon]} error={null} {...noop} />);

		expect(screen.getByText('JOVENS10')).toBeInTheDocument();
		expect(screen.getByText('10% de desconto')).toBeInTheDocument();
		expect(screen.getByText('3 de 50 usos')).toBeInTheDocument();
	});

	it('states a flat discount in reais', () => {
		render(
			<CouponManager
				coupons={[{ ...coupon, discount_type: 'fixed', discount_value: 25 } as Coupon]}
				error={null}
				{...noop}
			/>,
		);

		expect(screen.getByText('R$ 25,00 de desconto')).toBeInTheDocument();
	});

	it('says a coupon has no usage limit rather than showing a blank', () => {
		render(<CouponManager coupons={[{ ...coupon, max_uses: null } as Coupon]} error={null} {...noop} />);

		expect(screen.getByText('3 usos · sem limite')).toBeInTheDocument();
	});

	it('invites the organizer to create the first coupon when there is none', () => {
		render(<CouponManager coupons={[]} error={null} {...noop} />);

		expect(screen.getByText(/nenhum cupom cadastrado/i)).toBeInTheDocument();
	});

	it('creates a coupon from the form', async () => {
		const create = vi.fn().mockResolvedValue(true);
		render(<CouponManager coupons={[]} error={null} {...noop} create={create} />);

		await userEvent.click(screen.getByRole('button', { name: 'Novo cupom' }));
		await userEvent.type(screen.getByLabelText('Código'), 'meta20');
		await userEvent.clear(screen.getByLabelText('Valor do desconto'));
		await userEvent.type(screen.getByLabelText('Valor do desconto'), '20');
		await userEvent.click(screen.getByRole('button', { name: 'Salvar cupom' }));

		await waitFor(() =>
			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({ code: 'META20', discount_type: 'percentage', discount_value: 20 }),
			),
		);
	});

	it('shows the reason the API refused the coupon', () => {
		render(<CouponManager coupons={[]} error="Já existe um cupom com este código." {...noop} />);

		expect(screen.getByRole('alert')).toHaveTextContent('Já existe um cupom com este código.');
	});

	it('turns a coupon off without deleting its history', async () => {
		const setStatus = vi.fn().mockResolvedValue(true);
		render(<CouponManager coupons={[coupon]} error={null} {...noop} setStatus={setStatus} />);

		await userEvent.click(screen.getByRole('button', { name: 'Desativar JOVENS10' }));

		expect(setStatus).toHaveBeenCalledWith('c-1', 'inactive');
	});

	it('marks an inactive coupon so the organizer sees it is not being accepted', () => {
		render(<CouponManager coupons={[{ ...coupon, status: 'inactive' } as Coupon]} error={null} {...noop} />);

		const item = within(screen.getByRole('listitem'));
		expect(item.getByText('Inativo')).toBeInTheDocument();
		expect(item.getByRole('button', { name: 'Ativar JOVENS10' })).toBeInTheDocument();
	});

	it('deletes a coupon only after the organizer confirms', async () => {
		const remove = vi.fn().mockResolvedValue(true);
		render(<CouponManager coupons={[coupon]} error={null} {...noop} remove={remove} />);

		await userEvent.click(screen.getByRole('button', { name: 'Excluir JOVENS10' }));
		expect(remove).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole('button', { name: 'Excluir cupom' }));
		await waitFor(() => expect(remove).toHaveBeenCalledWith('c-1'));
	});
});
it('opens the coupon validity calendar and allows clearing an optional date', async () => {
	render(<CouponManager coupons={[]} error={null} {...noop} />);
	await userEvent.click(screen.getByRole('button', { name: 'Novo cupom' }));
	await userEvent.click(screen.getByRole('button', { name: 'Início' }));
	expect(screen.getByRole('grid')).toBeInTheDocument();
	expect(screen.getByLabelText('Horário')).toBeInTheDocument();
	await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));
	await userEvent.click(screen.getByRole('button', { name: 'Expiração' }));
	expect(screen.getByRole('grid')).toBeInTheDocument();
});
