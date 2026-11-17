import type { PlatformOverview } from '../api/server';
import { MetricChartCard } from '@/components/charts/MetricChartCard';

export function PlatformOverviewCharts({ data }: { data: Pick<PlatformOverview, 'topOrganizers' | 'metrics'> }) {
	return (
		<section aria-label="Gráficos da plataforma" className="grid gap-6 xl:grid-cols-2">
			<MetricChartCard
				title="Organizadores por volume"
				description="Receita bruta dos organizadores com maior volume de vendas."
				kind="horizontal-bar"
				series={[
					{
						key: 'gross',
						label: 'Receita bruta',
						format: 'currency',
						data: data.topOrganizers.map((item) => ({ id: item.id, label: item.name, value: item.gross })),
					},
				]}
			/>
			<MetricChartCard
				title="Publicação na plataforma"
				description={`${data.metrics.events} eventos cadastrados em toda a plataforma.`}
				kind="donut"
				series={[
					{
						key: 'events',
						label: 'Eventos',
						data: [
							{
								id: 'published',
								label: 'Publicados',
								value: data.metrics.publishedEvents,
								color: 'hsl(var(--chart-2))',
							},
							{
								id: 'other',
								label: 'Outros status',
								value: Math.max(0, data.metrics.events - data.metrics.publishedEvents),
								color: 'hsl(var(--chart-1))',
							},
						],
					},
				]}
			/>
		</section>
	);
}
