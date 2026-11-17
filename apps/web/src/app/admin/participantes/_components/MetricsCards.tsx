'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { memo } from 'react';
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
					<Card key={i} className="animate-pulse rounded-lg border border-border bg-card p-6  ">
						<div className="h-4 w-24 rounded bg-muted " />
						<div className="mt-2 h-8 w-16 rounded bg-muted " />
					</Card>
				))}
			</div>
		);
	}

	const cards = [
		{
			label: 'Total de Participantes',
			value: metrics?.total || 0,
			icon: Users,
			color: 'text-blue-600 dark:text-blue-400',
			bgColor: 'bg-blue-50 dark:bg-blue-900/20',
		},
		{
			label: 'Check-in Realizados',
			value: metrics?.checkedIn || 0,
			icon: CheckCircle,
			color: 'text-emerald-600 dark:text-emerald-400',
			bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
		},
		{
			label: 'Pendentes',
			value: metrics?.pending || 0,
			icon: Clock,
			color: 'text-amber-600 dark:text-amber-400',
			bgColor: 'bg-amber-50 dark:bg-amber-900/20',
		},
		{
			label: 'Taxa de Check-in',
			value: `${metrics?.checkInRate || 0}%`,
			icon: TrendingUp,
			color: 'text-purple-600 dark:text-purple-400',
			bgColor: 'bg-purple-50 dark:bg-purple-900/20',
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map((card, index) => {
				const Icon = card.icon;

				return (
					<Card key={index} className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md  ">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground ">{card.label}</p>
								<p className="mt-2 text-3xl font-bold text-foreground ">{card.value}</p>
							</div>
							<div className={`rounded-lg p-3 ${card.bgColor}`}>
								<Icon className={`size-6 ${card.color}`} />
							</div>
						</div>
					</Card>
				);
			})}
		</div>
	);
}

export const MetricsCards = memo(MetricsCardsComponent);
