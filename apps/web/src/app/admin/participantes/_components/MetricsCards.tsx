'use client';

import { Card } from '@/components/ui/card';
import { memo } from 'react';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { ParticipantMetrics } from '../_lib/types';

interface MetricsCardsProps {
	metrics: ParticipantMetrics | null;
	isLoading: boolean;
}

function MetricsCardsComponent({ metrics, isLoading }: MetricsCardsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i} className="animate-pulse p-6">
						<div className="h-4 w-24 rounded bg-muted" />
						<div className="mt-2 h-8 w-16 rounded bg-muted" />
					</Card>
				))}
			</div>
		);
	}

	const cards = [
		{
			label: 'Total de Ingressos',
			value: metrics?.total || 0,
			icon: Users,
		},
		{
			label: 'Check-in Realizados',
			value: metrics?.checkedIn || 0,
			icon: CheckCircle,
		},
		{
			label: 'Pedidos Pendentes',
			value: metrics?.pending || 0,
			icon: Clock,
		},
		{
			label: 'Taxa de Check-in',
			value: `${metrics?.checkInRate || 0}%`,
			icon: TrendingUp,
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map((card, index) => {
				const Icon = card.icon;

				return (
					<Card key={index} className="p-6 transition-shadow">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">{card.label}</p>
								<p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
							</div>
							<Icon className="size-4 text-muted-foreground" />
						</div>
					</Card>
				);
			})}
		</div>
	);
}

export const MetricsCards = memo(MetricsCardsComponent);
