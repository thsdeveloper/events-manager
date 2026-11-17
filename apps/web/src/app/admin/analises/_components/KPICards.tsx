import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, TrendingUp, Users, Ticket, CheckCircle2 } from 'lucide-react';
import type { KPIData } from '../actions';

interface KPICardsProps {
	data: KPIData;
}

export function KPICards({ data }: KPICardsProps) {
	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL',
		}).format(value);
	};

	const formatPercentage = (value: number) => {
		return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
	};

	const kpis = [
		{
			title: 'Receita Total',
			value: formatCurrency(data.totalRevenue),
			change: data.revenueChange,
			icon: TrendingUp,
		},
		{
			title: 'Ingressos Vendidos',
			value: `${data.ticketsSold} / ${data.ticketsTotal}`,
			subtitle: `${data.ticketsTotal > 0 ? ((data.ticketsSold / data.ticketsTotal) * 100).toFixed(0) : 0}% vendidos`,
			icon: Ticket,
		},
		{
			title: 'Participantes Únicos',
			value: data.uniqueParticipants.toString(),
			subtitle: 'Pessoas diferentes',
			icon: Users,
		},
		{
			title: 'Taxa de Check-in',
			value: `${data.checkinRate.toFixed(0)}%`,
			change: data.checkinChange,
			icon: CheckCircle2,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{kpis.map((kpi) => {
				const Icon = kpi.icon;
				const hasChange = kpi.change !== undefined;
				const isPositive = (kpi.change || 0) >= 0;

				return (
					<Card key={kpi.title}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
							<Icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{kpi.value}</div>
							{kpi.subtitle && <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>}
							{hasChange && (
								<div
									className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-muted-foreground' : 'text-destructive'}`}
								>
									{isPositive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
									<span>{formatPercentage(kpi.change!)}</span>
									<span className="text-muted-foreground">vs período anterior</span>
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
