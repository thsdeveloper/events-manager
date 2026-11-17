import { SalesChart, PaymentStatusDonut, PaymentMethodsChart, CheckinHeatmap } from './_components/LazyAnalyticsCharts';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { KPICards } from './_components/KPICards';

import { TicketPerformanceTable } from './_components/TicketPerformanceTable';
import { InstallmentAnalysis } from './_components/InstallmentAnalysis';

import { ActiveEventsTable } from './_components/ActiveEventsTable';
import { AnalyticsFiltersWrapper } from './_components/AnalyticsFiltersWrapper';
import { ExportButtons } from './_components/ExportButtons';
import {
	getKPIData,
	getSalesData,
	getPaymentStatusData,
	getPaymentMethodsData,
	getTicketPerformance,
	getInstallmentData,
	getCheckinHeatmap,
	getActiveEvents,
	type AnalyticsFilters,
} from './actions';

interface PageProps {
	searchParams: Promise<{
		startDate?: string;
		endDate?: string;
		eventId?: string;
		organizerId?: string;
	}>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
	const params = await searchParams;

	// Convert search params to filters
	const filters: AnalyticsFilters = {
		startDate: params.startDate ? new Date(params.startDate) : undefined,
		endDate: params.endDate ? new Date(params.endDate) : undefined,
		eventId: params.eventId,
		organizerId: params.organizerId,
	};

	// Fetch all analytics data in parallel
	const [kpi, sales, paymentStatus, paymentMethods, ticketPerformance, installments, checkinHeatmap, activeEvents] =
		await Promise.all([
			getKPIData(filters),
			getSalesData(filters),
			getPaymentStatusData(filters),
			getPaymentMethodsData(filters),
			getTicketPerformance(filters),
			getInstallmentData(filters),
			getCheckinHeatmap(filters),
			getActiveEvents(filters),
		]);

	return (
		<div className="w-full min-w-0 space-y-6">
			<PageHeader
				title="Análises"
				description="Dashboard analítico completo para gerenciamento de eventos"
				actions={
					<ExportButtons
						kpiData={kpi}
						salesData={sales}
						paymentStatusData={paymentStatus}
						paymentMethodsData={paymentMethods}
						ticketPerformance={ticketPerformance}
						installmentData={installments}
						activeEvents={activeEvents}
					/>
				}
			/>

			{/* Filtros */}
			<AnalyticsFiltersWrapper />

			{/* KPIs */}
			<KPICards data={kpi} />

			{/* Gráficos de Vendas e Pagamentos */}
			<div className="grid gap-6 md:grid-cols-2">
				<SalesChart data={sales} />
				<PaymentStatusDonut data={paymentStatus} />
			</div>

			{/* Métodos de Pagamento */}
			<PaymentMethodsChart data={paymentMethods} />

			{/* Performance de Ingressos */}
			<TicketPerformanceTable data={ticketPerformance} />

			{/* Análise de Parcelamentos */}
			<InstallmentAnalysis summary={installments.summary} alerts={installments.alerts} />

			{/* Mapa de Calor de Check-ins */}
			<CheckinHeatmap data={checkinHeatmap} />

			{/* Eventos Ativos */}
			<ActiveEventsTable data={activeEvents} />
		</div>
	);
}
