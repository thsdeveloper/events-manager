/**
 * Exemplo de referência do ciclo TDD para componentes (projeto `dom`).
 * As asserções descrevem o que a pessoa organizadora lê na tela, não a
 * estrutura interna do componente.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import type { FeeConfig } from '@/lib/fees';
import { TicketFeeSummary } from './TicketFeeSummary';

const feeConfig: FeeConfig = { platformFeePercentage: 5, providerPercentageFee: 3.5, providerFixedFee: 0.6 };

describe('TicketFeeSummary', () => {
	it('asks for a price before showing any estimate', () => {
		renderWithProviders(
			<TicketFeeSummary price={0} serviceFeeType="passed_to_buyer" feeConfig={feeConfig} isFallback={false} />,
		);

		expect(screen.getByText(/informe um valor/i)).toBeInTheDocument();
		expect(screen.queryByText('Comprador paga')).not.toBeInTheDocument();
	});

	it('shows what the buyer pays and what the organizer receives', () => {
		renderWithProviders(
			<TicketFeeSummary price={100} serviceFeeType="passed_to_buyer" feeConfig={feeConfig} isFallback={false} />,
		);

		expect(screen.getByText(/comprador paga/i).nextElementSibling).toHaveTextContent(/R\$\s?105,00/);
		expect(screen.getByText(/você recebe/i).nextElementSibling).toHaveTextContent(/R\$\s?95,73/);
		expect(screen.getByText(/taxa de conveniência/i).nextElementSibling).toHaveTextContent(/R\$\s?5,00/);
	});

	it('warns that default rates are in use when the live configuration failed to load', () => {
		renderWithProviders(
			<TicketFeeSummary price={100} serviceFeeType="absorbed" feeConfig={feeConfig} isFallback={true} />,
		);

		expect(screen.getByText(/valores padrão/i)).toBeInTheDocument();
	});
});
