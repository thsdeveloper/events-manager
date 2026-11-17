import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
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
					{pagination.page <= 1 ? (
						<Button variant="outline" size="sm" disabled>
							Anterior
						</Button>
					) : (
						<PaginationLink size="sm" href={link(pagination.page - 1)}>
							Anterior
						</PaginationLink>
					)}
				</PaginationItem>
				<PaginationItem>
					{pagination.page >= pagination.pageCount ? (
						<Button variant="outline" size="sm" disabled>
							Próxima
						</Button>
					) : (
						<PaginationLink size="sm" href={link(pagination.page + 1)}>
							Próxima
						</PaginationLink>
					)}
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
