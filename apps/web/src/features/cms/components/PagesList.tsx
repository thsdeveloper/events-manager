'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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
			<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
					<FileText className="size-6" />
				</div>
				<p className="font-medium text-foreground">Nenhuma página encontrada</p>
				<p className="text-sm text-muted-foreground">Ajuste a busca ou crie a primeira página.</p>
				<NewPageButton label="Criar página" />
			</div>
		);
	}

	return (
		<Card className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
			<Table className="w-full text-left text-sm">
				<TableHeader className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
					<TableRow>
						<TableHead className="px-5 py-3">Página</TableHead>
						<TableHead className="px-5 py-3">Status</TableHead>
						<TableHead className="px-5 py-3">Publicação</TableHead>
						<TableHead className="px-5 py-3">Atualizada</TableHead>
						<TableHead className="px-5 py-3 text-right">
							<span className="sr-only">Ações</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="divide-y divide-border">
					{pages.map((page) => (
						<TableRow key={page.id} className="hover:bg-muted/40">
							<TableCell className="px-5 py-3">
								<Link
									href={`/super-admin/conteudo/paginas/${page.id}`}
									className="font-medium text-foreground hover:text-primary"
								>
									{page.title}
								</Link>
								<p className="text-xs text-muted-foreground">{page.permalink}</p>
							</TableCell>
							<TableCell className="px-5 py-3">
								<StatusBadge status={page.status} publishedAt={page.published_at} />
							</TableCell>
							<TableCell className="px-5 py-3 text-muted-foreground">{formatDateTime(page.published_at)}</TableCell>
							<TableCell className="px-5 py-3 text-muted-foreground">
								{formatDateTime(page.date_updated ?? page.date_created)}
							</TableCell>
							<TableCell className="px-5 py-3 text-right">
								<Link
									href={`/super-admin/conteudo/paginas/${page.id}`}
									className="text-sm font-semibold text-primary hover:underline"
								>
									Editar
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
