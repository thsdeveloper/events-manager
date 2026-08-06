import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { IconSurface } from '../atoms/IconSurface';

interface MetricCardProps {
	helper?: string;
	icon: ReactNode;
	label: string;
	tone?: 'brand' | 'info' | 'success' | 'warning' | 'neutral';
	value: string;
}

export function MetricCard({ helper, icon, label, tone = 'brand', value }: MetricCardProps) {
	return (
		<Card className="overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md">
			<CardContent className="flex items-start justify-between gap-4 p-5">
				<div className="min-w-0 space-y-1.5">
					<p className="text-sm font-medium text-muted-foreground">{label}</p>
					<p className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</p>
					{helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
				</div>
				<IconSurface tone={tone}>{icon}</IconSurface>
			</CardContent>
		</Card>
	);
}
