import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
	return (
		<div aria-busy="true" aria-label="Carregando financeiro" className="space-y-6">
			<Skeleton className="h-12 w-64" />
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }, (_, index) => (
					<Skeleton key={index} className="h-32" />
				))}
			</div>
			<Skeleton className="h-96" />
		</div>
	);
}
