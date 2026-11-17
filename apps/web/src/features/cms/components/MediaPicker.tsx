'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { FileText, ImageIcon, Loader2, Search, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useState } from 'react';
import { cmsRequest, describeError } from '../api/client';
import { formatFileSize, isImageMedia, mediaLabel, mediaUrl, uploadCmsFile, validateUploadFile } from '../lib/media';
import type { CmsMedia, CmsPaginated } from '../types';

interface MediaPickerProps {
	value: CmsMedia | null;
	onChange: (media: CmsMedia | null) => void;
	/** Nome do campo, usado nos rótulos ("Escolher imagem de capa"). */
	label?: string;
	/** Galeria: cada escolha é adicionada em vez de substituir o valor. */
	multiple?: boolean;
	/** Aceita PDF além de imagens (biblioteca de mídia). */
	allowDocuments?: boolean;
	compact?: boolean;
}

export function MediaThumb({ media, className }: { media: CmsMedia; className?: string }) {
	if (!isImageMedia(media)) {
		return (
			<div className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}>
				<FileText className="size-6" />
			</div>
		);
	}

	return (
		<div className={cn('relative overflow-hidden bg-muted', className)}>
			<Image src={mediaUrl(media)} alt={mediaLabel(media)} fill sizes="240px" className="object-cover" unoptimized />
		</div>
	);
}

export function MediaPicker({
	value,
	onChange,
	label = 'imagem',
	multiple = false,
	allowDocuments = false,
	compact = false,
}: MediaPickerProps) {
	const [open, setOpen] = useState(false);
	const lowerLabel = label.toLowerCase();

	return (
		<Card className={cn('rounded-lg border border-border bg-card', compact ? 'p-3' : 'p-4')}>
			<div className="flex items-center gap-4">
				{value ? (
					<MediaThumb media={value} className="size-20 shrink-0 rounded-lg" />
				) : (
					<div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-muted/40 text-muted-foreground">
						<ImageIcon className="size-6" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-foreground">
						{value ? mediaLabel(value) : `Nenhuma ${lowerLabel} selecionada`}
					</p>
					{value && <p className="text-xs text-muted-foreground">{formatFileSize(value.filesize)}</p>}
					<div className="mt-2 flex flex-wrap gap-2">
						<Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
							<Upload className="mr-2 size-4" />
							{multiple ? `Adicionar ${lowerLabel}` : value ? `Trocar ${lowerLabel}` : `Escolher ${lowerLabel}`}
						</Button>
						{value && !multiple && (
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="text-red-600 hover:bg-red-50 hover:text-red-700"
								onClick={() => onChange(null)}
								aria-label={`Remover ${lowerLabel}`}
							>
								<Trash2 className="mr-2 size-4" />
								Remover
							</Button>
						)}
					</div>
				</div>
			</div>
			<MediaPickerDialog
				open={open}
				onOpenChange={setOpen}
				allowDocuments={allowDocuments}
				onSelect={(media) => {
					onChange(media);
					setOpen(false);
				}}
			/>
		</Card>
	);
}

interface MediaPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (media: CmsMedia) => void;
	allowDocuments?: boolean;
}

export function MediaPickerDialog({ open, onOpenChange, onSelect, allowDocuments = false }: MediaPickerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Biblioteca de mídia</DialogTitle>
					<DialogDescription>Escolha um arquivo já enviado ou envie um novo.</DialogDescription>
				</DialogHeader>
				<Tabs defaultValue="library">
					<TabsList>
						<TabsTrigger value="library">Biblioteca</TabsTrigger>
						<TabsTrigger value="upload">Enviar</TabsTrigger>
					</TabsList>
					<TabsContent value="library">{open && <MediaLibraryGrid onSelect={onSelect} />}</TabsContent>
					<TabsContent value="upload">
						<MediaUploadForm onUploaded={onSelect} allowDocuments={allowDocuments} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

function MediaLibraryGrid({ onSelect }: { onSelect: (media: CmsMedia) => void }) {
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const debouncedSearch = useDebounce(search, 250);
	const [result, setResult] = useState<CmsPaginated<CmsMedia> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const searchId = useId();

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		const query = new URLSearchParams({ page: String(page), limit: '24', search: debouncedSearch });
		async function load() {
			try {
				setResult(await cmsRequest<CmsPaginated<CmsMedia>>(`/media?${query}`, { signal: controller.signal }));
			} catch (failure) {
				if (!controller.signal.aborted) setError(describeError(failure));
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}
		void load();

		return () => controller.abort();
	}, [debouncedSearch, page]);

	return (
		<div className="space-y-3">
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Label htmlFor={searchId} className="sr-only">
					Buscar na biblioteca
				</Label>
				<Input
					id={searchId}
					value={search}
					onChange={(event) => {
						setSearch(event.target.value);
						setPage(1);
					}}
					placeholder="Buscar por título ou nome do arquivo"
					className="pl-9"
				/>
			</div>
			{error && (
				<p className="text-sm text-red-600" role="alert">
					{error}
				</p>
			)}
			{loading && !result ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					<Loader2 className="size-6 animate-spin" />
				</div>
			) : result && result.data.length === 0 ? (
				<p className="py-12 text-center text-sm text-muted-foreground">Nenhum arquivo encontrado.</p>
			) : (
				<ul className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
					{result?.data.map((media) => (
						<li key={media.id}>
							<Button
								variant="ghost"
								type="button"
								onClick={() => onSelect(media)}
								className="h-auto whitespace-normal group flex w-full flex-col gap-1 rounded-lg border border-border p-1 text-left transition hover:border-violet-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
							>
								<MediaThumb media={media} className="aspect-square w-full rounded" />
								<span className="truncate px-1 text-xs text-muted-foreground">{mediaLabel(media)}</span>
							</Button>
						</li>
					))}
				</ul>
			)}
			{result && result.pagination.pageCount > 1 && (
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						Página {result.pagination.page} de {result.pagination.pageCount}
					</span>
					<div className="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={page <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							Anterior
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={page >= result.pagination.pageCount}
							onClick={() => setPage((p) => p + 1)}
						>
							Próxima
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export function MediaUploadForm({
	onUploaded,
	allowDocuments = false,
}: {
	onUploaded: (media: CmsMedia) => void;
	allowDocuments?: boolean;
}) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputId = useId();
	const accept = allowDocuments
		? 'image/png,image/jpeg,image/webp,image/gif,application/pdf'
		: 'image/png,image/jpeg,image/webp,image/gif';

	async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setError(null);
		const problem = validateUploadFile(file, { imagesOnly: !allowDocuments });
		if (problem) {
			setError(problem);

			return;
		}
		setUploading(true);
		try {
			onUploaded(await uploadCmsFile(file));
		} catch (failure) {
			setError(describeError(failure, 'Falha no envio do arquivo.'));
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="space-y-3">
			<Label
				htmlFor={inputId}
				className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-muted/40 px-6 py-10 text-center text-sm text-muted-foreground transition hover:border-violet-400 hover:bg-primary/10/40"
			>
				{uploading ? (
					<Loader2 className="size-6 animate-spin text-primary" />
				) : (
					<Upload className="size-6 text-primary" />
				)}
				<span className="font-medium text-foreground">{uploading ? 'Enviando…' : 'Escolher arquivo'}</span>
				<span className="text-xs text-muted-foreground">
					{allowDocuments ? 'PNG, JPEG, WebP, GIF ou PDF' : 'PNG, JPEG, WebP ou GIF'} até 20 MB
				</span>
			</Label>
			<Input
				id={inputId}
				type="file"
				accept={accept}
				className="sr-only"
				onChange={handleChange}
				disabled={uploading}
			/>
			{error && (
				<p className="text-sm text-red-600" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
