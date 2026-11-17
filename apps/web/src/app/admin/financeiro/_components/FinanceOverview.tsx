'use client';

import { Spinner } from '@/components/ui/spinner';
import { memo } from 'react';
import { TrendingUp, Ticket, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinanceOverviewProps {
	metrics: {
		gross: number;
		serviceFees: number;
		net: number;
		ticketsSold: number;
		totalTransactions: number;
		averageTicket: number;
		pendingCount: number;
		refundedCount: number;
		allRegistrations: number;
		allGross: number;
	} | null;
	isLoading: boolean;
	currencyFormatter: Intl.NumberFormat;
}

function FinanceOverview({ metrics, isLoading, currencyFormatter }: FinanceOverviewProps) {
	const cards = [
		{
			title: 'Vendas Totais',
			value: metrics ? currencyFormatter.format(metrics.gross) : '—',
			icon: DollarSign,
		},
		{
			title: 'Taxas de Serviço',
			value: metrics ? currencyFormatter.format(metrics.serviceFees) : '—',
			icon: TrendingUp,
		},
		{
			title: 'Receita Líquida',
			value: metrics ? currencyFormatter.format(metrics.net) : '—',
			icon: DollarSign,
		},
		{
			title: 'Ingressos Vendidos',
			value: metrics ? metrics.ticketsSold.toLocaleString('pt-BR') : '—',
			icon: Ticket,
		},
		{
			title: 'Ticket Médio',
			value: metrics ? currencyFormatter.format(metrics.averageTicket) : '—',
			icon: DollarSign,
		},
		{
			title: 'Pendências / Reembolsos',
			value: metrics
				? `${metrics.pendingCount.toLocaleString('pt-BR')} pendentes · ${metrics.refundedCount.toLocaleString('pt-BR')} reembolsos`
				: '—',
			icon: Clock,
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{cards.map((card, index) => (
				<Card key={card.title} className="overflow-hidden transition-all duration-200">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-muted-foreground">{card.title}</CardTitle>
						<card.icon className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{isLoading ? (
								<div className="flex items-center text-sm text-muted-foreground">
									<Spinner className="mr-2 size-4 animate-spin text-muted-foreground" />
									Atualizando...
								</div>
							) : (
								card.value
							)}
						</div>
						{index === 0 && metrics && (
							<p className="mt-2 text-xs text-muted-foreground">
								{metrics.totalTransactions.toLocaleString('pt-BR')} transações pagas no período
							</p>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}

export default memo(FinanceOverview);
