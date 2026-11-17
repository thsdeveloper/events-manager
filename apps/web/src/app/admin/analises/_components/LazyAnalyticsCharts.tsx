'use client';

import dynamic from 'next/dynamic';
import { DeferredContent } from '@/components/DeferredContent';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalesDataPoint, PaymentStatusData, PaymentMethodData, CheckinHourData } from '../actions';

function ChartPlaceholder() {
	return (
		<div role="status" aria-label="Carregando gráfico">
			<Skeleton className="h-[470px] w-full" />
		</div>
	);
}
const Sales = dynamic(() => import('./SalesChart').then((module) => module.SalesChart), { loading: ChartPlaceholder });
const Status = dynamic(() => import('./PaymentStatusDonut').then((module) => module.PaymentStatusDonut), {
	loading: ChartPlaceholder,
});
const Methods = dynamic(() => import('./PaymentMethodsChart').then((module) => module.PaymentMethodsChart), {
	loading: ChartPlaceholder,
});
const Checkins = dynamic(() => import('./CheckinHeatmap').then((module) => module.CheckinHeatmap), {
	loading: ChartPlaceholder,
});
export function SalesChart({ data }: { data: SalesDataPoint[] }) {
	return (
		<DeferredContent fallback={<ChartPlaceholder />}>
			<Sales data={data} />
		</DeferredContent>
	);
}
export function PaymentStatusDonut({ data }: { data: PaymentStatusData[] }) {
	return (
		<DeferredContent fallback={<ChartPlaceholder />}>
			<Status data={data} />
		</DeferredContent>
	);
}
export function PaymentMethodsChart({ data }: { data: PaymentMethodData[] }) {
	return (
		<DeferredContent fallback={<ChartPlaceholder />}>
			<Methods data={data} />
		</DeferredContent>
	);
}
export function CheckinHeatmap({ data }: { data: CheckinHourData[] }) {
	return (
		<DeferredContent fallback={<ChartPlaceholder />}>
			<Checkins data={data} />
		</DeferredContent>
	);
}
