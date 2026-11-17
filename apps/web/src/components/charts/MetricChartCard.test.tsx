import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { MetricChartCard } from './MetricChartCard';
describe('MetricChartCard', () => {
	it('switches between money and quantities without combining incompatible scales', async () => {
		const { user } = renderWithProviders(
			<MetricChartCard
				title="Vendas"
				description="Resumo dos eventos"
				series={[
					{ key: 'revenue', label: 'Receita', format: 'currency', data: [{ id: 'a', label: 'Festival', value: 500 }] },
					{ key: 'tickets', label: 'Ingressos', data: [{ id: 'a', label: 'Festival', value: 5 }] },
				]}
			/>,
		);
		expect(screen.getByText('Resumo dos eventos')).toBeInTheDocument();
		await user.click(await screen.findByRole('button', { name: 'Ver dados em tabela' }));
		expect(screen.getByRole('cell', { name: /R\$\s?500,00/ })).toBeInTheDocument();
		await user.click(screen.getByRole('tab', { name: 'Ingressos' }));
		expect(screen.getByRole('tab', { name: 'Ingressos' })).toHaveAttribute('aria-selected', 'true');
		await user.click(await screen.findByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(screen.getByRole('table')).getByRole('cell', { name: '5' })).toBeInTheDocument();
		expect(screen.queryByRole('cell', { name: /R\$\s?500,00/ })).not.toBeInTheDocument();
	});
});
