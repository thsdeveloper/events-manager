import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div className="space-y-6" role="status" aria-label="Carregando financeiro">
			<Skeleton className="h-12 w-64" />
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<Card key={index}>
						<CardContent className="space-y-3 pt-6">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-8 w-40" />
						</CardContent>
					</Card>
				))}
			</div>
			<Skeleton className="h-96 w-full" />
		</div>
	);
}
