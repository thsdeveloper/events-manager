'use client';

import { memo } from 'react';
import { TrendingUp, Ticket, DollarSign, Loader2, Clock } from 'lucide-react';
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
			highlight: 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white',
		},
		{
			title: 'Taxas de Serviço',
			value: metrics ? currencyFormatter.format(metrics.serviceFees) : '—',
			icon: TrendingUp,
			highlight: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
		},
		{
			title: 'Receita Líquida',
			value: metrics ? currencyFormatter.format(metrics.net) : '—',
			icon: DollarSign,
			highlight: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white',
		},
		{
			title: 'Ingressos Vendidos',
			value: metrics ? metrics.ticketsSold.toLocaleString('pt-BR') : '—',
			icon: Ticket,
			highlight: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
		},
		{
			title: 'Ticket Médio',
			value: metrics ? currencyFormatter.format(metrics.averageTicket) : '—',
			icon: DollarSign,
			highlight: 'bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white',
		},
		{
			title: 'Pendências / Reembolsos',
			value: metrics
				? `${metrics.pendingCount.toLocaleString('pt-BR')} pendentes · ${metrics.refundedCount.toLocaleString('pt-BR')} reembolsos`
				: '—',
			icon: Clock,
			highlight: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white',
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{cards.map((card, index) => (
				<Card
					key={card.title}
					className="overflow-hidden border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800"
				>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
							{card.title}
						</CardTitle>
						<div className={`rounded-xl p-2 ${card.highlight}`}>
							<card.icon className="size-4" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-900 dark:text-white">
							{isLoading ? (
								<div className="flex items-center text-sm text-gray-500">
									<Loader2 className="mr-2 size-4 animate-spin text-gray-400" />
									Atualizando...
								</div>
							) : (
								card.value
							)}
						</div>
						{index === 0 && metrics && (
							<p className="mt-2 text-xs text-gray-500">
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
