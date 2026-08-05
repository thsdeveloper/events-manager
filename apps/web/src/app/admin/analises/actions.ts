'use server';

import { cache } from 'react';
import { authenticatedBackendFetch } from '@/lib/backend-auth';

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  eventId?: string;
  organizerId?: string;
}

export interface KPIData {
  totalRevenue: number;
  revenueChange: number;
  ticketsSold: number;
  ticketsTotal: number;
  uniqueParticipants: number;
  checkinRate: number;
  checkinChange: number;
}

export interface SalesDataPoint { date: string; revenue: number; tickets: number }
export interface PaymentStatusData { status: string; count: number; value: number; percentage: number }
export interface PaymentMethodData { method: string; count: number; revenue: number }
export interface TicketPerformance { id: string; title: string; sold: number; total: number; revenue: number; conversionRate: number; status: string }
export interface InstallmentData { status: string; count: number; totalAmount: number; receivedAmount: number; pendingAmount: number }
export interface InstallmentAlert { type: 'overdue' | 'upcoming' | 'defaulted'; count: number; amount: number }
export interface CheckinHourData { hour: string; count: number; percentage: number }
export interface ActiveEvent { id: string; title: string; startDate: string; ticketsSold: number; ticketsTotal: number; revenue: number; status: 'active' | 'slow' | 'critical' }

interface AnalyticsPayload {
  kpi: KPIData;
  sales: SalesDataPoint[];
  paymentStatus: PaymentStatusData[];
  paymentMethods: PaymentMethodData[];
  ticketPerformance: TicketPerformance[];
  installments: { data: InstallmentData[]; alerts: InstallmentAlert[] };
  checkinHeatmap: CheckinHourData[];
  activeEvents: ActiveEvent[];
}

const loadAnalytics = cache(async (startDate?: string, endDate?: string, eventId?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (eventId) params.set('event_id', eventId);
  
return authenticatedBackendFetch<AnalyticsPayload>(`/api/organizer/analytics?${params}`);
});

function getPayload(filters: AnalyticsFilters = {}) {
  return loadAnalytics(filters.startDate?.toISOString(), filters.endDate?.toISOString(), filters.eventId);
}

export async function getKPIData(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).kpi }
export async function getSalesData(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).sales }
export async function getPaymentStatusData(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).paymentStatus }
export async function getPaymentMethodsData(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).paymentMethods }
export async function getTicketPerformance(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).ticketPerformance }
export async function getInstallmentData(filters: AnalyticsFilters = {}) {
  const installments = (await getPayload(filters)).installments;
  
return { summary: installments.data, alerts: installments.alerts };
}
export async function getCheckinHeatmap(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).checkinHeatmap }
export async function getActiveEvents(filters: AnalyticsFilters = {}) { return (await getPayload(filters)).activeEvents }
