import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
	helper?: string;
	icon: ReactNode;
	label: string;
	tone?: 'brand' | 'info' | 'success' | 'warning' | 'neutral';
	value: string;
}

export function MetricCard({ helper, icon, label, value }: MetricCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{label}</CardTitle>
				<span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-bold">{value}</p>
				{helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
			</CardContent>
		</Card>
	);
}
