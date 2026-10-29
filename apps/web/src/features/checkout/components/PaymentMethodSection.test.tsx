/**
 * Última etapa da compra: a pessoa escolhe Pix ou cartão, e o restante da
 * seção muda conforme a escolha. Cartão só aparece habilitado quando a loja
 * aceita; Pix pode ser à vista ou em parcelas, quando o ingresso permite.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@/test';
import { PaymentMethodSection } from './PaymentMethodSection';

const installmentTicket = { allow_installments: true, max_installments: 3, min_amount_for_installments: 50 };

describe('PaymentMethodSection', () => {
	it('offers Pix and card, explaining when the store does not take cards yet', () => {
		render(
			<PaymentMethodSection
				availableMethods={['PIX']}
				method="PIX"
				onMethodChange={vi.fn()}
				totalAmount={300}
				ticket={installmentTicket}
				selectedInstallments={1}
				onInstallmentChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole('radio', { name: /^pix/i })).toBeEnabled();
		expect(screen.getByRole('radio', { name: /cartão de crédito/i })).toBeDisabled();
		expect(screen.getByText(/ainda não habilitado nesta loja/i)).toBeInTheDocument();
	});

	it('shows the Pix choices, cash or installments, while Pix is selected', () => {
		render(
			<PaymentMethodSection
				availableMethods={['PIX', 'CARD']}
				method="PIX"
				onMethodChange={vi.fn()}
				totalAmount={300}
				ticket={installmentTicket}
				selectedInstallments={1}
				onInstallmentChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole('radio', { name: /à vista - pix/i })).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: /3x de R\$ 100\.00/i })).toBeInTheDocument();
	});

	it('reports the switch to card and replaces the Pix choices with the card explanation', async () => {
		const onMethodChange = vi.fn();
		const { rerender } = render(
			<PaymentMethodSection
				availableMethods={['PIX', 'CARD']}
				method="PIX"
				onMethodChange={onMethodChange}
				totalAmount={300}
				ticket={installmentTicket}
				selectedInstallments={1}
				onInstallmentChange={vi.fn()}
			/>,
		);

		await userEvent.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
		expect(onMethodChange).toHaveBeenCalledWith('CARD');

		rerender(
			<PaymentMethodSection
				availableMethods={['PIX', 'CARD']}
				method="CARD"
				onMethodChange={onMethodChange}
				totalAmount={300}
				ticket={installmentTicket}
				selectedInstallments={1}
				onInstallmentChange={vi.fn()}
			/>,
		);

		expect(screen.queryByRole('radio', { name: /à vista - pix/i })).not.toBeInTheDocument();
		const explanation = within(screen.getByRole('alert'));
		expect(explanation.getByText(/ambiente seguro/i)).toBeInTheDocument();
		expect(explanation.getByText(/até 3x/i)).toBeInTheDocument();
	});
});
