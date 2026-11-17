'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { CreditCard, Gift, QrCode, Receipt } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { PaymentMethodData } from '../actions';

interface PaymentMethodsChartProps {
	data: PaymentMethodData[];
}

const METHOD_LABELS: Record<string, string> = {
	card: 'Cartão',
	pix: 'Pix',
	boleto: 'Boleto',
	free: 'Gratuito',
	unknown: 'Não identificado',
};

const METHOD_ICONS: Record<string, any> = {
	card: CreditCard,
	pix: QrCode,
	boleto: Receipt,
	free: Gift,
};

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
			minimumFractionDigits: 0,
		}).format(value);
	};

	const chartData = data.map((item) => ({
		method: METHOD_LABELS[item.method] || item.method,
		count: item.count,
		revenue: item.revenue,
	}));

	const totalTransactions = data.reduce((sum, item) => sum + item.count, 0);
	const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>Métodos de Pagamento</CardTitle>
				<CardDescription>Volume de transações e receita por método de pagamento</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 grid grid-cols-2 gap-4">
					<div className="rounded-lg border p-3">
						<p className="text-sm text-muted-foreground">Total de Transações</p>
						<p className="text-2xl font-bold">{totalTransactions}</p>
					</div>
					<div className="rounded-lg border p-3">
						<p className="text-sm text-muted-foreground">Receita Total</p>
						<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
					</div>
				</div>

				<ChartContainer
					config={{
						count: { label: 'Transações', color: 'hsl(var(--chart-2))' },
						revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-3))' },
					}}
					className="h-[300px] w-full min-w-0 aspect-auto"
					aria-label="Transações e receita por método de pagamento"
				>
					<BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis dataKey="method" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
						<YAxis yAxisId="left" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
						<YAxis
							yAxisId="right"
							orientation="right"
							className="text-xs"
							tick={{ fill: 'hsl(var(--muted-foreground))' }}
							tickFormatter={(value) => formatCurrency(value)}
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
						<Bar yAxisId="left" dataKey="count" name="Transações" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
						<Bar
							yAxisId="right"
							dataKey="revenue"
							name="Receita (R$)"
							fill="var(--color-revenue)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>

				<div className="mt-4 grid grid-cols-2 gap-3">
					{data.map((item) => {
						const Icon = METHOD_ICONS[item.method] || CreditCard;
						const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

						return (
							<div key={item.method} className="flex items-center gap-3 rounded-lg border p-3">
								<div className="rounded-full bg-primary/10 p-2">
									<Icon className="size-4 text-primary" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium">{METHOD_LABELS[item.method] || item.method}</p>
									<p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% da receita</p>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
