'use client';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { cmsRequest, describeError } from '../api/client';
import type { CmsPageRow, CmsPaginated, CmsPostListRow } from '../types';

export interface ContentReference {
	id: string;
	title: string;
	/** Permalink da página ou slug do post; só para exibição. */
	path?: string;
}

interface ContentPickerProps {
	kind: 'page' | 'post';
	value: ContentReference | null;
	onChange: (value: ContentReference | null) => void;
	label?: string;
	error?: string | null;
}

/** Busca páginas ou posts pela API e devolve a referência escolhida. */
export function ContentPicker({ kind, value, onChange, label, error }: ContentPickerProps) {
	const id = useId();
	const [search, setSearch] = useState('');
	const debounced = useDebounce(search, 250);
	const [options, setOptions] = useState<ContentReference[]>([]);
	const [loading, setLoading] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const noun = kind === 'page' ? 'página' : 'post';

	useEffect(() => {
		if (!open) return;
		const controller = new AbortController();
		setLoading(true);
		setFailure(null);
		const query = new URLSearchParams({ search: debounced, limit: '10' });
		const path = kind === 'page' ? `/pages?${query}` : `/posts?${query}`;
		async function load() {
			try {
				const body = await cmsRequest<CmsPaginated<CmsPageRow | CmsPostListRow>>(path, { signal: controller.signal });
				setOptions(
					body.data.map((row) => ({
						id: row.id,
						title: row.title,
						path: 'permalink' in row ? row.permalink : `/blog/${row.slug}`,
					})),
				);
			} catch (problem) {
				if (!controller.signal.aborted) setFailure(describeError(problem));
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}
		void load();

		return () => controller.abort();
	}, [debounced, kind, open]);

	if (value) {
		return (
			<div className="space-y-1.5">
				<span className="text-sm font-medium">{label ?? `Escolher ${noun}`}</span>
				<Card className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
					<span className="min-w-0 truncate">
						<span className="font-medium text-foreground">{value.title}</span>
						{value.path && <span className="ml-2 text-xs text-muted-foreground">{value.path}</span>}
					</span>
					<Button
						variant="ghost"
						type="button"
						onClick={() => onChange(null)}
						aria-label={`Trocar ${noun}`}
						className="h-auto whitespace-normal rounded p-1"
					>
						<X className="size-4" />
					</Button>
				</Card>
				{error && (
					<Alert variant="destructive" className="text-xs" role="alert">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-sm font-medium">
				{label ?? `Escolher ${noun}`}
			</Label>
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={id}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					onFocus={() => setOpen(true)}
					placeholder={`Buscar ${noun} pelo título`}
					className="pl-9"
					autoComplete="off"
				/>
			</div>
			{open && (
				<ul
					className="max-h-48 overflow-y-auto rounded-md border border-border bg-card text-sm shadow-sm"
					aria-label={`Resultados de ${noun}`}
				>
					{loading && (
						<li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
							<Spinner className="size-4 animate-spin" /> Buscando…
						</li>
					)}
					{failure && <li className="px-3 py-2 text-destructive">{failure}</li>}
					{!loading && !failure && options.length === 0 && (
						<li className="px-3 py-2 text-muted-foreground">Nenhum resultado.</li>
					)}
					{options.map((option) => (
						<li key={option.id}>
							<Button
								variant="ghost"
								type="button"
								onClick={() => {
									onChange(option);
									setOpen(false);
									setSearch('');
								}}
								className="h-auto whitespace-normal flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
							>
								<span className="truncate font-medium text-foreground">{option.title}</span>
								<span className="shrink-0 text-xs text-muted-foreground">{option.path}</span>
							</Button>
						</li>
					))}
				</ul>
			)}
			{error && (
				<Alert variant="destructive" className="text-xs" role="alert">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
