'use client';

import { MetricChart } from '@/components/charts/MetricChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentStatusData } from '../actions';

interface PaymentStatusDonutProps {
	data: PaymentStatusData[];
}

const STATUS_COLORS: Record<string, string> = {
	confirmed: 'hsl(var(--chart-2))',
	paid: 'hsl(var(--chart-2))',
	pending: 'hsl(var(--chart-4))',
	partial_payment: 'hsl(var(--chart-5))',
	payment_overdue: 'hsl(var(--destructive))',
	cancelled: 'hsl(var(--muted-foreground))',
	checked_in: 'hsl(var(--chart-1))',
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

	return (
		<Card>
			<CardHeader>
				<CardTitle>Status dos Pagamentos</CardTitle>
				<CardDescription>Distribuição dos status das inscrições</CardDescription>
			</CardHeader>
			<CardContent>
				<MetricChart
					kind="donut"
					label="Status dos pagamentos"
					valueLabel="Inscrições"
					data={data.map((item) => ({
						id: item.status,
						label: STATUS_LABELS[item.status] || item.status,
						value: item.count,
						color: STATUS_COLORS[item.status],
						detail: `${formatCurrency(item.value)} · ${item.percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
					}))}
				/>
			</CardContent>
		</Card>
	);
}
