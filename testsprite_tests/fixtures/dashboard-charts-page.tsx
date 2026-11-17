'use client';
import { MetricChartCard } from '@/components/charts/MetricChartCard';
import { SalesChart } from '@/app/admin/analises/_components/SalesChart';
import { PaymentMethodsChart } from '@/app/admin/analises/_components/PaymentMethodsChart';
import { PaymentStatusDonut } from '@/app/admin/analises/_components/PaymentStatusDonut';
import { CheckinHeatmap } from '@/app/admin/analises/_components/CheckinHeatmap';
export default function ChartFixture() {
	return (
		<main data-admin-theme="neutral" className="min-h-screen bg-background p-4 text-foreground sm:p-8">
			<h1 className="mb-6 text-2xl font-semibold">Gráficos de validação</h1>
			<div className="grid gap-6 lg:grid-cols-2">
				<MetricChartCard
					title="Volume por organizador"
					description="Receita em reais"
					kind="horizontal-bar"
					series={[
						{
							key: 'revenue',
							label: 'Receita',
							format: 'currency',
							data: [
								{ id: 'a', label: 'Coletivo Flouvi', value: 15000 },
								{ id: 'b', label: 'Organização com nome muito comprido para validar os rótulos', value: 9500 },
								{ id: 'c', label: 'Cultura Viva', value: 5000 },
							],
						},
					]}
				/>
				<SalesChart
					data={[
						{ date: '01/11', revenue: 1250, tickets: 30 },
						{ date: '02/11', revenue: 2500, tickets: 50 },
						{ date: '03/11', revenue: 0, tickets: 0 },
						{ date: '04/11', revenue: 4500, tickets: 70 },
					]}
				/>
				<PaymentMethodsChart
					data={[
						{ method: 'pix', count: 80, revenue: 4000 },
						{ method: 'card', count: 50, revenue: 3500 },
						{ method: 'free', count: 15, revenue: 0 },
					]}
				/>
				<PaymentStatusDonut
					data={[
						{ status: 'paid', count: 120, value: 7500, percentage: 80 },
						{ status: 'pending', count: 20, value: 1000, percentage: 13.3 },
						{ status: 'cancelled', count: 10, value: 500, percentage: 6.7 },
					]}
				/>
				<CheckinHeatmap
					data={[
						{ hour: '08h', count: 10, percentage: 10 },
						{ hour: '09h', count: 25, percentage: 25 },
						{ hour: '10h', count: 65, percentage: 65 },
					]}
				/>
			</div>
		</main>
	);
}
