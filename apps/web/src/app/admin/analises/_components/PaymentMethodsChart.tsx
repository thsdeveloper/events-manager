'use client';

import { useState } from 'react';
import { MetricChart } from '@/components/charts/MetricChart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentMethodData } from '../actions';
import { CreditCard, QrCode, Receipt, Gift, type LucideIcon } from 'lucide-react';

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

const METHOD_ICONS: Record<string, LucideIcon> = {
	card: CreditCard,
	pix: QrCode,
	boleto: Receipt,
	free: Gift,
};

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
	const [metric, setMetric] = useState('revenue');
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
			minimumFractionDigits: 0,
		}).format(value);
	};

	// Calcular totais
	const totalTransactions = data.reduce((sum, item) => sum + item.count, 0);
	const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Métodos de Pagamento</CardTitle>
				<CardDescription>Volume de transações e receita por método de pagamento</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 grid grid-cols-2 gap-4">
					<Card className="p-3">
						<p className="text-sm text-muted-foreground">Total de Transações</p>
						<p className="text-2xl font-bold">{totalTransactions}</p>
					</Card>
					<Card className="p-3">
						<p className="text-sm text-muted-foreground">Receita Total</p>
						<p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
					</Card>
				</div>

				<Tabs value={metric} onValueChange={setMetric} className="mb-4">
					<TabsList aria-label="Métrica por método de pagamento">
						<TabsTrigger value="revenue">Receita (R$)</TabsTrigger>
						<TabsTrigger value="count">Transações</TabsTrigger>
					</TabsList>
				</Tabs>
				<MetricChart
					label="Métodos de pagamento"
					valueLabel={metric === 'revenue' ? 'Receita' : 'Transações'}
					format={metric === 'revenue' ? 'currency' : 'integer'}
					data={data.map((item) => ({
						id: item.method,
						label: METHOD_LABELS[item.method] || item.method,
						value: metric === 'revenue' ? item.revenue : item.count,
					}))}
				/>

				<div className="mt-4 grid grid-cols-2 gap-3">
					{data.map((item) => {
						const Icon = METHOD_ICONS[item.method] || CreditCard;
						const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

						return (
							<Card key={item.method} className="flex items-center gap-3 p-3">
								<div className="rounded-full bg-primary/10 p-2">
									<Icon className="size-4 text-primary" aria-hidden="true" />
								</div>
								<div className="flex-1">
									<p className="text-sm font-medium">{METHOD_LABELS[item.method] || item.method}</p>
									<p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% da receita</p>
								</div>
							</Card>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
