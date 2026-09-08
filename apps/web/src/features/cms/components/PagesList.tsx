'use client';

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
			<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
					<FileText className="size-6" />
				</div>
				<p className="font-medium text-slate-950">Nenhuma página encontrada</p>
				<p className="text-sm text-slate-500">Ajuste a busca ou crie a primeira página.</p>
				<NewPageButton label="Criar página" />
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
			<table className="w-full text-left text-sm">
				<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
					<tr>
						<th className="px-5 py-3">Página</th>
						<th className="px-5 py-3">Status</th>
						<th className="px-5 py-3">Publicação</th>
						<th className="px-5 py-3">Atualizada</th>
						<th className="px-5 py-3 text-right">
							<span className="sr-only">Ações</span>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100">
					{pages.map((page) => (
						<tr key={page.id} className="hover:bg-slate-50">
							<td className="px-5 py-3">
								<Link
									href={`/super-admin/conteudo/paginas/${page.id}`}
									className="font-medium text-slate-950 hover:text-violet-700"
								>
									{page.title}
								</Link>
								<p className="text-xs text-slate-500">{page.permalink}</p>
							</td>
							<td className="px-5 py-3">
								<StatusBadge status={page.status} publishedAt={page.published_at} />
							</td>
							<td className="px-5 py-3 text-slate-600">{formatDateTime(page.published_at)}</td>
							<td className="px-5 py-3 text-slate-600">{formatDateTime(page.date_updated ?? page.date_created)}</td>
							<td className="px-5 py-3 text-right">
								<Link
									href={`/super-admin/conteudo/paginas/${page.id}`}
									className="text-sm font-semibold text-violet-700 hover:underline"
								>
									Editar
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
