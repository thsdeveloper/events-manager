import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
	return (
		<div aria-busy="true" aria-label="Carregando visão geral" className="space-y-8">
			<div className="space-y-3">
				<Skeleton className="h-4 w-44" />
				<Skeleton className="h-10 w-72 max-w-full" />
				<Skeleton className="h-5 w-[36rem] max-w-full" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }, (_, index) => (
					<Card key={index}>
						<CardContent className="space-y-3 p-5">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-9 w-24" />
							<Skeleton className="h-3 w-40" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader className="space-y-3">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-80 max-w-full" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-20 w-full" />
					))}
				</CardContent>
			</Card>
			<span className="sr-only">Carregando indicadores e eventos recentes.</span>
		</div>
	);
}
