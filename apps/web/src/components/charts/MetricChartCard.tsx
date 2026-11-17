'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MetricChartProps } from './MetricChart';

export const LazyMetricChart = dynamic(() => import('./MetricChart').then((module) => module.MetricChart), {
	loading: () => <Skeleton className="h-[320px] w-full" aria-label="Carregando gráfico" />,
});
export interface MetricSeries {
	key: string;
	label: string;
	data: MetricChartProps['data'];
	format?: MetricChartProps['format'];
}
export interface MetricChartCardProps {
	title: string;
	description: string;
	series: MetricSeries[];
	kind?: MetricChartProps['kind'];
}

export function MetricChartCard({ title, description, series, kind }: MetricChartCardProps) {
	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{series.length > 1 ? (
					<Tabs defaultValue={series[0].key}>
						<TabsList aria-label={`Métrica de ${title}`} className="mb-4 max-w-full">
							{series.map((item) => (
								<TabsTrigger key={item.key} value={item.key}>
									{item.label}
								</TabsTrigger>
							))}
						</TabsList>
						{series.map((item) => (
							<TabsContent key={item.key} value={item.key}>
								<LazyMetricChart
									label={title}
									valueLabel={item.label}
									data={item.data}
									format={item.format}
									kind={kind}
								/>
							</TabsContent>
						))}
					</Tabs>
				) : (
					<LazyMetricChart
						label={title}
						valueLabel={series[0]?.label ?? 'Quantidade'}
						data={series[0]?.data ?? []}
						format={series[0]?.format}
						kind={kind}
					/>
				)}
			</CardContent>
		</Card>
	);
}
