'use client';

import { MetricChart } from '@/components/charts/MetricChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckinHourData } from '../actions';

interface CheckinHeatmapProps {
	data: CheckinHourData[];
}

export function CheckinHeatmap({ data }: CheckinHeatmapProps) {
	const getBarColor = (percentage: number) => {
		if (percentage >= 30) return 'hsl(var(--chart-2))'; // green
		if (percentage >= 15) return 'hsl(var(--chart-4))'; // yellow

		return 'hsl(var(--chart-1))'; // blue
	};

	// Encontrar pico de check-ins
	const peakHour = data.length > 0 ? data.reduce((prev, curr) => (curr.count > prev.count ? curr : prev)) : null;

	const totalCheckins = data.reduce((sum, item) => sum + item.count, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Check-ins por horário</CardTitle>
				<CardDescription>Distribuição de check-ins ao longo do dia</CardDescription>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="flex items-center justify-center h-64 text-muted-foreground">
						Nenhum check-in registrado ainda
					</div>
				) : (
					<>
						<div className="mb-4 grid grid-cols-2 gap-4">
							<Card className="p-3">
								<p className="text-sm text-muted-foreground">Total de Check-ins</p>
								<p className="text-2xl font-bold">{totalCheckins}</p>
							</Card>
							{peakHour && (
								<Card className="p-3">
									<p className="text-sm text-muted-foreground">Horário de Pico</p>
									<p className="text-2xl font-bold text-green-600">{peakHour.hour}</p>
									<p className="text-xs text-muted-foreground mt-1">
										{peakHour.count} check-ins ({peakHour.percentage.toFixed(1)}%)
									</p>
								</Card>
							)}
						</div>

						<MetricChart
							label="Check-ins por horário"
							valueLabel="Check-ins"
							data={data.map((item) => ({
								id: item.hour,
								label: item.hour,
								value: item.count,
								color: getBarColor(item.percentage),
							}))}
						/>

						{/* Legenda de cores */}
						<div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
							<div className="flex items-center gap-2">
								<div className="size-3 rounded bg-chart-2" />
								<span className="text-muted-foreground">Alta demanda (≥30%)</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-3 rounded bg-chart-4" />
								<span className="text-muted-foreground">Média demanda (15 a &lt;30%)</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-3 rounded bg-chart-1" />
								<span className="text-muted-foreground">Baixa demanda (&lt;15%)</span>
							</div>
						</div>

						{/* Insights */}
						{peakHour && (
							<Card className="mt-4 p-4">
								<p className="text-sm font-medium mb-2">💡 Insights</p>
								<ul className="text-sm text-muted-foreground space-y-1">
									<li>• Prepare staff adicional próximo ao horário de pico ({peakHour.hour})</li>
									<li>• Considere abrir portões com antecedência para evitar filas</li>
									<li>
										•{' '}
										{peakHour.percentage > 40
											? 'Alta concentração de chegadas - reforce a equipe'
											: 'Distribuição relativamente uniforme'}
									</li>
								</ul>
							</Card>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
