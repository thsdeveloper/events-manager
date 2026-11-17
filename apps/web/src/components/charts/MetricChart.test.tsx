import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { MetricChart } from './MetricChart';

const data = [
	{ id: 'a', label: 'Festival', value: 1250 },
	{ id: 'b', label: 'Encontro', value: 30 },
];
describe('MetricChart', () => {
	it.each(['bar', 'line', 'horizontal-bar', 'donut'] as const)(
		'offers keyboard inspection and the exact values as a table for %s',
		async (kind) => {
			const { user } = renderWithProviders(
				<MetricChart data={data} kind={kind} label="Receita por evento" valueLabel="Receita" format="currency" />,
			);
			const chart = screen.getByRole('region', { name: 'Receita por evento' });
			expect(within(chart).getByRole('img', { name: 'Receita por evento' })).toHaveAttribute('tabindex', '0');
			await user.tab();
			const announced: string[] = [];
			for (const key of ['{Home}', '{End}']) {
				await user.keyboard(key);
				announced.push((await screen.findByRole('status')).textContent ?? '');
			}
			expect(announced).toEqual(
				expect.arrayContaining([
					expect.stringMatching(/Festival.*R\$\s?1.250,00/s),
					expect.stringMatching(/Encontro.*R\$\s?30,00/s),
				]),
			);
			const toggle = within(chart).getByRole('button', { name: 'Ver dados em tabela' });
			await user.click(toggle);
			const table = within(chart).getByRole('table', { name: 'Receita por evento' });
			expect(within(table).getByRole('columnheader', { name: 'Receita' })).toBeInTheDocument();
			expect(within(table).getByRole('row', { name: /Festival R\$\s?1.250,00/ })).toBeInTheDocument();
			expect(within(table).getByRole('row', { name: /Encontro R\$\s?30,00/ })).toBeInTheDocument();
			await user.click(toggle);
			expect(screen.queryByRole('table')).not.toBeInTheDocument();
		},
	);
	it.each([
		{ rows: [] },
		{ rows: [{ id: 'a', label: 'Sem vendas', value: 0 }] },
		{ rows: [{ id: 'a', label: 'Inválido', value: NaN }] },
	])('announces an empty state without inventing values', ({ rows }) => {
		renderWithProviders(
			<MetricChart data={rows} label="Vendas" valueLabel="Ingressos" emptyMessage="Nenhuma venda no período" />,
		);
		expect(screen.getByRole('status')).toHaveTextContent('Nenhuma venda no período');
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});
	it('preserves distinct records with the same title and negative monetary adjustments', async () => {
		const { user } = renderWithProviders(
			<MetricChart
				data={[
					{ id: 'a', label: 'Evento', value: 1200 },
					{ id: 'b', label: 'Evento', value: -25 },
				]}
				label="Ajustes"
				valueLabel="Valor"
				format="currency"
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
		expect(screen.getByRole('cell', { name: /-R\$\s?25,00/ })).toBeInTheDocument();
	});
	it('formats counts as integers and does not plot invalid donut slices', async () => {
		const { user } = renderWithProviders(
			<MetricChart
				kind="donut"
				data={[
					{ id: 'a', label: 'Publicado', value: 1200 },
					{ id: 'b', label: 'Inválido', value: -1 },
				]}
				label="Eventos"
				valueLabel="Quantidade"
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Ver dados em tabela' }));
		expect(screen.getByRole('cell', { name: '1.200' })).toBeInTheDocument();
		expect(screen.queryByRole('cell', { name: 'Inválido' })).not.toBeInTheDocument();
	});
});
