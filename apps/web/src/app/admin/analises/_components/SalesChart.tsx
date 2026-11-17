'use client';
import { MetricChartCard } from '@/components/charts/MetricChartCard';
import type { SalesDataPoint } from '../actions';

export function SalesChart({ data }: { data: SalesDataPoint[] }) {
	return (
		<MetricChartCard
			title="Vendas ao longo do tempo"
			description="Acompanhe a evolução de receita e quantidade de ingressos vendidos."
			kind="line"
			series={[
				{
					key: 'revenue',
					label: 'Receita (R$)',
					format: 'currency',
					data: data.map((item, index) => ({ id: String(index), label: item.date, value: item.revenue })),
				},
				{
					key: 'tickets',
					label: 'Ingressos',
					data: data.map((item, index) => ({ id: String(index), label: item.date, value: item.tickets })),
				},
			]}
		/>
	);
}
