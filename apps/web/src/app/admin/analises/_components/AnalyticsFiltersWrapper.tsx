'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsFilters } from './AnalyticsFilters';
function queryDate(value: string | null) {
	const date = value ? new Date(value) : undefined;

	return date && Number.isFinite(date.getTime()) ? date : undefined;
}
export function AnalyticsFiltersWrapper() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	return (
		<AnalyticsFilters
			filters={{
				startDate: queryDate(params.get('startDate')),
				endDate: queryDate(params.get('endDate')),
				eventId: params.get('eventId') || undefined,
				organizerId: params.get('organizerId') || undefined,
			}}
			onFilterChange={(filters) => {
				const next = new URLSearchParams(params.toString());
				const values = {
					startDate: filters.startDate?.toISOString(),
					endDate: filters.endDate?.toISOString(),
					eventId: filters.eventId,
					organizerId: filters.organizerId,
				};
				for (const [key, value] of Object.entries(values)) {
					if (value) next.set(key, value);
					else next.delete(key);
				}
				next.delete('page');
				const suffix = next.toString();
				router.push(suffix ? `${pathname}?${suffix}` : pathname);
			}}
		/>
	);
}
