'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { Cell, Pie, PieChart } from 'recharts';
import type { PaymentStatusData } from '../actions';

interface PaymentStatusDonutProps {
	data: PaymentStatusData[];
}

const STATUS_COLORS: Record<string, string> = {
	confirmed: 'hsl(var(--success))', // green
	paid: 'hsl(var(--success))', // green
	pending: 'hsl(var(--warning))', // yellow
	partial_payment: 'hsl(var(--chart-4))', // orange
	payment_overdue: 'hsl(var(--destructive))', // red
	cancelled: 'hsl(var(--muted-foreground))', // gray
	checked_in: 'hsl(var(--info))', // blue
};

const STATUS_LABELS: Record<string, string> = {
	confirmed: 'Confirmado',
	paid: 'Pago',
	pending: 'Pendente',
	partial_payment: 'Pagamento Parcial',
	payment_overdue: 'Atrasado',
	cancelled: 'Cancelado',
	checked_in: 'Check-in Feito',
};

export function PaymentStatusDonut({ data }: PaymentStatusDonutProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(value);
	};

	const chartData = data.map((item) => ({
		name: STATUS_LABELS[item.status] || item.status,
		value: item.count,
		amount: item.value,
		percentage: item.percentage,
		fill: STATUS_COLORS[item.status] || 'hsl(var(--muted-foreground))',
	}));

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle>Status dos Pagamentos</CardTitle>
				<CardDescription>Distribuição dos status das inscrições</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={Object.fromEntries(
						chartData.map((item) => [item.name, { label: `${item.name} (${item.value})`, color: item.fill }]),
					)}
					className="h-[300px] w-full min-w-0 aspect-auto"
					aria-label="Distribuição dos status dos pagamentos"
				>
					<PieChart>
						<Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
							{chartData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={entry.fill} />
							))}
						</Pie>
						<ChartTooltip
							content={
								<ChartTooltipContent
									nameKey="name"
									formatter={(_value, _name, item) => (
										<div className="grid gap-1">
											<span className="font-medium">{item.payload.name}</span>
											<span>Quantidade: {item.payload.value}</span>
											<span>Valor: {formatCurrency(item.payload.amount)}</span>
											<span>Percentual: {item.payload.percentage.toFixed(1)}%</span>
										</div>
									)}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent nameKey="name" className="flex-wrap" />} />
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
