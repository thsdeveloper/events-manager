/**
 * Última etapa da compra: a pessoa escolhe Pix ou cartão, e o restante da
 * seção muda conforme a escolha. Cartão só aparece habilitado quando a loja
 * aceita; Pix pode ser à vista ou em parcelas, quando o ingresso permite.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@/test';
import { PaymentMethodSection } from './PaymentMethodSection';

const installmentTicket = {
	allow_installments: true,
	max_installments: 3,
	allow_pix_installments: true,
	max_pix_installments: 3,
	min_amount_for_pix_installments: 50,
};

describe('PaymentMethodSection', () => {
	it('offers only the methods enabled by the organization', () => {
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
		expect(screen.queryByRole('radio', { name: /cartão de crédito/i })).not.toBeInTheDocument();
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
		expect(explanation.getByText(/formulário seguro/i)).toBeInTheDocument();
		expect(explanation.getByText(/até 3x/i)).toBeInTheDocument();
	});
});

it('offers only boleto when Pix and credit are disabled by the organizer', () => {
	render(
		<PaymentMethodSection
			availableMethods={['BOLETO']}
			method="BOLETO"
			onMethodChange={vi.fn()}
			totalAmount={100}
			selectedInstallments={1}
			onInstallmentChange={vi.fn()}
		/>,
	);
	expect(screen.getByRole('radio', { name: /boleto/i })).toBeEnabled();
	expect(screen.queryByRole('radio', { name: /^pix/i })).not.toBeInTheDocument();
	expect(screen.queryByRole('radio', { name: /cartão de crédito/i })).not.toBeInTheDocument();
});

it('does not offer Pix installments just because credit installments are enabled', () => {
	render(
		<PaymentMethodSection
			availableMethods={['PIX', 'BOLETO']}
			method="PIX"
			onMethodChange={vi.fn()}
			totalAmount={300}
			ticket={{ allow_installments: true, max_installments: 6 }}
			selectedInstallments={1}
			onInstallmentChange={vi.fn()}
		/>,
	);
	expect(screen.queryByRole('radio', { name: /2x de/i })).not.toBeInTheDocument();
});
it('offers Pix installments independently and explains when tickets are released', () => {
	render(
		<PaymentMethodSection
			availableMethods={['PIX']}
			method="PIX"
			onMethodChange={vi.fn()}
			totalAmount={300}
			ticket={{ allow_installments: false, allow_pix_installments: true, max_pix_installments: 3 }}
			selectedInstallments={3}
			onInstallmentChange={vi.fn()}
		/>,
	);
	expect(screen.getByRole('radio', { name: /3x de/i })).toBeInTheDocument();
	expect(screen.getByText(/ingressos.*após.*todas as parcelas/i)).toBeInTheDocument();
});
