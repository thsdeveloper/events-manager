import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export function PlatformMetricCard({
	label,
	value,
	helper,
	icon: Icon,
}: {
	label: string;
	value: string;
	helper: string;
	icon: LucideIcon;
	tone?: 'violet' | 'emerald' | 'blue' | 'amber';
}) {
	return (
		<Card role="article">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{label}</CardTitle>
				<Icon className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-bold">{value}</p>
				<p className="text-xs text-muted-foreground">{helper}</p>
			</CardContent>
		</Card>
	);
}
