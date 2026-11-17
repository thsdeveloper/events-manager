import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';

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

	return (
		<Pagination
			aria-label="Paginação"
			className="flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
		>
			<span>
				Página {pagination.page} de {pagination.pageCount} · {pagination.total}{' '}
				{pagination.total === 1 ? 'item' : 'itens'}
			</span>
			<PaginationContent>
				<PaginationItem>
					<PaginationLink
						size="default"
						href={link(Math.max(1, pagination.page - 1))}
						aria-disabled={pagination.page <= 1}
						tabIndex={pagination.page <= 1 ? -1 : undefined}
						className={cn(pagination.page <= 1 && 'pointer-events-none opacity-50')}
					>
						Anterior
					</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink
						size="default"
						href={link(Math.min(pagination.pageCount, pagination.page + 1))}
						aria-disabled={pagination.page >= pagination.pageCount}
						tabIndex={pagination.page >= pagination.pageCount ? -1 : undefined}
						className={cn(pagination.page >= pagination.pageCount && 'pointer-events-none opacity-50')}
					>
						Próxima
					</PaginationLink>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
