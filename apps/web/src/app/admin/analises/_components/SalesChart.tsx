'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts';
import type { SalesDataPoint } from '../actions';

interface SalesChartProps {
	data: SalesDataPoint[];
}

export function SalesChart({ data }: SalesChartProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
			minimumFractionDigits: 0,
		}).format(value);
	};

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>Vendas ao Longo do Tempo</CardTitle>
				<CardDescription>Acompanhe a evolução de receita e quantidade de ingressos vendidos</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={{
						revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-3))' },
						tickets: { label: 'Ingressos', color: 'hsl(var(--chart-2))' },
					}}
					className="h-[350px] w-full min-w-0 aspect-auto"
					aria-label="Receita e ingressos ao longo do tempo"
				>
					<AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
						<defs>
							<linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
								<stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
							</linearGradient>
							<linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="var(--color-tickets)" stopOpacity={0.3} />
								<stop offset="95%" stopColor="var(--color-tickets)" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
						<YAxis
							yAxisId="left"
							className="text-xs"
							tick={{ fill: 'hsl(var(--muted-foreground))' }}
							tickFormatter={(value) => formatCurrency(value)}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							className="text-xs"
							tick={{ fill: 'hsl(var(--muted-foreground))' }}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value, name, item) => (
										<div className="flex w-full items-center justify-between gap-4">
											<span className="text-muted-foreground">{name}</span>
											<span className="font-mono font-medium tabular-nums">
												{item.dataKey === 'revenue'
													? formatCurrency(Number(value))
													: Number(value).toLocaleString('pt-BR')}
											</span>
										</div>
									)}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Area
							yAxisId="left"
							type="monotone"
							dataKey="revenue"
							name="Receita (R$)"
							stroke="var(--color-revenue)"
							strokeWidth={2}
							fill="url(#colorRevenue)"
						/>
						<Line
							yAxisId="right"
							type="monotone"
							dataKey="tickets"
							name="Ingressos"
							stroke="var(--color-tickets)"
							strokeWidth={2}
							dot={{ fill: 'var(--color-tickets)', r: 4 }}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
