/**
 * Campo de cupom no resumo da compra. A pessoa digita um código e vê o motivo
 * de uma recusa. O cupom aceito é mostrado pelo resumo, na linha do desconto.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@/test';
import { CouponField } from './CouponField';

describe('CouponField', () => {
	it('sends the typed code when the buyer applies it', async () => {
		const onApply = vi.fn().mockResolvedValue(null);
		render(<CouponField error={null} onApply={onApply} />);

		await userEvent.type(screen.getByLabelText('Cupom de desconto'), 'jovens10');
		await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

		await waitFor(() => expect(onApply).toHaveBeenCalledWith('jovens10'));
	});

	it('does not call the server for an empty code', async () => {
		const onApply = vi.fn();
		render(<CouponField error={null} onApply={onApply} />);

		await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

		expect(onApply).not.toHaveBeenCalled();
	});

	it('shows the reason the coupon was refused', () => {
		render(<CouponField error="Este cupom expirou." onApply={vi.fn()} />);

		expect(screen.getByRole('alert')).toHaveTextContent('Este cupom expirou.');
	});

	it('blocks a second submission while the first is still running', () => {
		render(<CouponField error={null} isApplying onApply={vi.fn()} />);

		expect(screen.getByRole('button', { name: /aplicando/i })).toBeDisabled();
	});
});
