import { BarChart3 } from 'lucide-react'
import { KPICards } from './_components/KPICards'
import { SalesChart } from './_components/SalesChart'
import { PaymentStatusDonut } from './_components/PaymentStatusDonut'
import { PaymentMethodsChart } from './_components/PaymentMethodsChart'
import { TicketPerformanceTable } from './_components/TicketPerformanceTable'
import { InstallmentAnalysis } from './_components/InstallmentAnalysis'
import { CheckinHeatmap } from './_components/CheckinHeatmap'
import { ActiveEventsTable } from './_components/ActiveEventsTable'
import { AnalyticsFiltersWrapper } from './_components/AnalyticsFiltersWrapper'
import { ExportButtons } from './_components/ExportButtons'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getKPIData,
  getSalesData,
  getPaymentStatusData,
  getPaymentMethodsData,
  getTicketPerformance,
  getInstallmentData,
  getCheckinHeatmap,
  getActiveEvents,
  type AnalyticsFilters
} from './actions'

interface PageProps {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    eventId?: string
    organizerId?: string
  }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams

  // Convert search params to filters
  const filters: AnalyticsFilters = {
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    eventId: params.eventId,
    organizerId: params.organizerId
  }

  // Fetch all analytics data in parallel
  const [
    kpi,
    sales,
    paymentStatus,
    paymentMethods,
    ticketPerformance,
    installments,
    checkinHeatmap,
    activeEvents
  ] = await Promise.all([
    getKPIData(filters),
    getSalesData(filters),
    getPaymentStatusData(filters),
    getPaymentMethodsData(filters),
    getTicketPerformance(filters),
    getInstallmentData(filters),
    getCheckinHeatmap(filters),
    getActiveEvents(filters)
  ])

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análises</h1>
            <p className="text-muted-foreground">
              Dashboard analítico completo para gerenciamento de eventos
            </p>
          </div>
        </div>
        <ExportButtons
          kpiData={kpi}
          salesData={sales}
          paymentStatusData={paymentStatus}
          paymentMethodsData={paymentMethods}
          ticketPerformance={ticketPerformance}
          installmentData={installments}
          activeEvents={activeEvents}
        />
      </div>

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
      <InstallmentAnalysis
        summary={installments.summary}
        alerts={installments.alerts}
      />

      {/* Mapa de Calor de Check-ins */}
      <CheckinHeatmap data={checkinHeatmap} />

      {/* Eventos Ativos */}
      <ActiveEventsTable data={activeEvents} />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* KPIs Loading */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Charts Loading */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>

      {/* More Content Loading */}
      <Skeleton className="h-96" />
      <Skeleton className="h-96" />
    </div>
  )
}
