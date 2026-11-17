'use client';

import { RecordTable } from '@/components/ui/record-table';

import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '../lib/dates';
import type { CmsPageRow } from '../types';
import { NewPageDialog } from './NewPageDialog';
import { StatusBadge } from './StatusBadge';

export function NewPageButton({ label = 'Nova página' }: { label?: string }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setOpen(true)}>
				<Plus className="mr-2 size-4" />
				{label}
			</Button>
			<NewPageDialog open={open} onOpenChange={setOpen} />
		</>
	);
}

export function PagesList({ pages }: { pages: CmsPageRow[] }) {
	if (pages.length === 0) {
		return (
			<Empty className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
					<FileText className="size-6" />
				</div>
				<p className="font-medium text-foreground">Nenhuma página encontrada</p>
				<p className="text-sm text-muted-foreground">Ajuste a busca ou crie a primeira página.</p>
				<NewPageButton label="Criar página" />
			</Empty>
		);
	}

	return (
		<Card className="overflow-x-auto">
			<RecordTable
				headers={[
					'Página',
					'Status',
					'Publicação',
					'Atualizada',
					<>
						<span className="sr-only">Ações</span>
					</>,
				]}
				rows={pages.map((page) => ({
					id: String(page.id),
					cells: [
						<div key="column-0">
							<Link
								href={`/super-admin/conteudo/paginas/${page.id}`}
								className="font-medium text-foreground hover:text-primary"
							>
								{page.title}
							</Link>
							<p className="text-xs text-muted-foreground">{page.permalink}</p>
						</div>,
						<div key="column-1">
							<StatusBadge status={page.status} publishedAt={page.published_at} />
						</div>,
						<div key="column-2" className="text-muted-foreground">
							{formatDateTime(page.published_at)}
						</div>,
						<div key="column-3" className="text-muted-foreground">
							{formatDateTime(page.date_updated ?? page.date_created)}
						</div>,
						<div key="column-4" className="text-right">
							<Link
								href={`/super-admin/conteudo/paginas/${page.id}`}
								className="text-sm font-semibold text-primary hover:underline"
							>
								Editar
							</Link>
						</div>,
					],
				}))}
				paginate={false}
				emptyMessage={undefined}
			/>
		</Card>
	);
}
