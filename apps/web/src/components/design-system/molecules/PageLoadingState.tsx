import { Skeleton } from '@/components/ui/skeleton';

export function PageLoadingState({ label = 'Carregando conteúdo' }: { label?: string }) {
	return (
		<div aria-busy="true" aria-live="polite" className="space-y-8 py-2" role="status">
			<span className="sr-only">{label}</span>
			<div className="space-y-3">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-10 w-full max-w-xl" />
				<Skeleton className="h-5 w-full max-w-2xl" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton className="h-32 rounded-lg" key={index} />
				))}
			</div>
			<Skeleton className="h-72 rounded-lg" />
		</div>
	);
}
