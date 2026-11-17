import type { OrganizerDashboard } from '@events-manager/contracts';
import { MetricChartCard } from '@/components/charts/MetricChartCard';

export function OrganizerDashboardCharts({ dashboard: { metrics, recentEvents } }: { dashboard: OrganizerDashboard }) {
	return (
		<div className="grid gap-6 xl:grid-cols-2">
			<MetricChartCard
				title="Público dos eventos recentes"
				description="Compare participantes e ingressos vendidos nos últimos eventos."
				kind="horizontal-bar"
				series={[
					{
						key: 'participants',
						label: 'Participantes',
						data: recentEvents.map((event) => ({ id: event.id, label: event.title, value: event.participantCount })),
					},
					{
						key: 'tickets',
						label: 'Ingressos',
						data: recentEvents.map((event) => ({ id: event.id, label: event.title, value: event.ticketsSold })),
					},
				]}
			/>
			<MetricChartCard
				title="Publicação dos eventos"
				description="Distribuição de todos os seus eventos por situação de publicação."
				kind="donut"
				series={[
					{
						key: 'events',
						label: 'Eventos',
						data: [
							{ id: 'published', label: 'Publicados', value: metrics.publishedEvents, color: 'hsl(var(--chart-2))' },
							{
								id: 'other',
								label: 'Outros status',
								value: Math.max(0, metrics.totalEvents - metrics.publishedEvents),
								color: 'hsl(var(--chart-1))',
							},
						],
					},
				]}
			/>
		</div>
	);
}
