import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CmsPagination } from '../types';

/** Paginação por links, para listagens renderizadas no servidor. */
export function PaginationLinks({
	pagination,
	pathname,
	query = {},
}: {
	pagination: CmsPagination;
	pathname: string;
	query?: Record<string, string | undefined>;
}) {
	if (pagination.pageCount <= 1) return null;
	const link = (page: number) => {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
		params.set('page', String(page));

		return `${pathname}?${params}`;
	};
	const buttonClass =
		'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50';

	return (
		<nav aria-label="Paginação" className="flex items-center justify-between text-sm text-slate-500">
			<span>
				Página {pagination.page} de {pagination.pageCount} · {pagination.total}{' '}
				{pagination.total === 1 ? 'item' : 'itens'}
			</span>
			<div className="flex gap-2">
				<Link
					href={link(Math.max(1, pagination.page - 1))}
					aria-disabled={pagination.page <= 1}
					className={cn(buttonClass, pagination.page <= 1 && 'pointer-events-none opacity-50')}
				>
					Anterior
				</Link>
				<Link
					href={link(Math.min(pagination.pageCount, pagination.page + 1))}
					aria-disabled={pagination.page >= pagination.pageCount}
					className={cn(buttonClass, pagination.page >= pagination.pageCount && 'pointer-events-none opacity-50')}
				>
					Próxima
				</Link>
			</div>
		</nav>
	);
}
