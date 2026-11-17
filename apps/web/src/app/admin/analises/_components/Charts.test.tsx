import { renderWithProviders } from '@/test';
import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { PaymentMethodsChart } from './PaymentMethodsChart';
import { PaymentStatusDonut } from './PaymentStatusDonut';
import { SalesChart } from './SalesChart';

it('keeps sales and payment summaries readable with empty data', () => {
	renderWithProviders(
		<>
			<SalesChart data={[]} />
			<PaymentStatusDonut data={[]} />
			<PaymentMethodsChart data={[]} />
		</>,
	);
	expect(screen.getByText('Vendas ao Longo do Tempo')).toBeInTheDocument();
	expect(screen.getByText('Status dos Pagamentos')).toBeInTheDocument();
	expect(screen.getByText('Métodos de Pagamento')).toBeInTheDocument();
});
