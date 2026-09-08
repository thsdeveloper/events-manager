'use client';

import { FileText, Images, Pencil, Save, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { cmsRequest, describeError } from '../api/client';
import { formatDateTime } from '../lib/dates';
import { formatFileSize, isImageMedia, mediaLabel } from '../lib/media';
import type { CmsMedia } from '../types';
import { Field, FieldError } from './FormPrimitives';
import { MediaThumb, MediaUploadForm } from './MediaPicker';

function MediaDetailsSheet({
	media,
	onOpenChange,
	onSaved,
}: {
	media: CmsMedia | null;
	onOpenChange: (open: boolean) => void;
	onSaved: () => Promise<void>;
}) {
	const id = useId();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setTitle(media?.title ?? '');
		setDescription(media?.description ?? '');
		setError(null);
	}, [media]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!media) return;
		setSaving(true);
		setError(null);
		try {
			await cmsRequest(`/media/${media.id}`, {
				method: 'PATCH',
				body: { title: title || null, description: description || null },
			});
			await onSaved();
			onOpenChange(false);
		} catch (failure) {
			setError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet open={Boolean(media)} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
				<SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
					<SheetTitle>Detalhes do arquivo</SheetTitle>
					<SheetDescription>{media?.filename}</SheetDescription>
				</SheetHeader>
				<form id={id} onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto p-6">
					{media && <MediaThumb media={media} className="h-48 w-full rounded-lg" />}
					{media && (
						<dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
							<dt>Tipo</dt>
							<dd>{media.type ?? '—'}</dd>
							<dt>Tamanho</dt>
							<dd>{formatFileSize(media.filesize)}</dd>
							{media.width && media.height && (
								<>
									<dt>Dimensões</dt>
									<dd>
										{media.width} × {media.height}
									</dd>
								</>
							)}
							<dt>Enviado em</dt>
							<dd>{formatDateTime(media.date_created)}</dd>
						</dl>
					)}
					<Field id={`${id}-title`} label="Título" hint="Usado como texto alternativo das imagens.">
						<Input
							id={`${id}-title`}
							value={title}
							maxLength={150}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</Field>
					<Field id={`${id}-description`} label="Descrição">
						<Textarea
							id={`${id}-description`}
							rows={3}
							maxLength={500}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
						/>
					</Field>
					<FieldError message={error} />
				</form>
				<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form={id} loading={saving}>
						<Save className="mr-2 size-4" />
						Salvar
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export function MediaLibrary({ media }: { media: CmsMedia[] }) {
	const router = useRouter();
	const { toast } = useToast();
	const [editing, setEditing] = useState<CmsMedia | null>(null);
	const [toDelete, setToDelete] = useState<CmsMedia | null>(null);
	const [uploadOpen, setUploadOpen] = useState(false);

	async function afterMutation(message: string) {
		await revalidateCmsContent();
		toast({ title: message, variant: 'success' });
		router.refresh();
	}

	async function confirmDelete() {
		if (!toDelete) return;
		try {
			await cmsRequest(`/media/${toDelete.id}`, { method: 'DELETE' });
			await afterMutation('Arquivo excluído');
		} catch (failure) {
			toast({ title: 'Não foi possível excluir', description: describeError(failure), variant: 'destructive' });
		} finally {
			setToDelete(null);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setUploadOpen(true)}>
					<Upload className="mr-2 size-4" />
					Enviar arquivo
				</Button>
			</div>

			{media.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
						<Images className="size-6" />
					</div>
					<p className="font-medium text-slate-950">Nenhum arquivo encontrado</p>
					<p className="text-sm text-slate-500">Envie imagens e PDFs para usar nas páginas e posts.</p>
				</div>
			) : (
				<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
					{media.map((file) => {
						const label = mediaLabel(file);

						return (
							<li
								key={file.id}
								className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
							>
								{isImageMedia(file) ? (
									<MediaThumb media={file} className="aspect-square w-full" />
								) : (
									<div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
										<FileText className="size-8" />
										<span className="text-xs font-semibold uppercase">
											{file.type === 'application/pdf' ? 'PDF' : 'Arquivo'}
										</span>
									</div>
								)}
								<div className="space-y-1 p-3">
									<p className="truncate text-sm font-medium text-slate-950" title={label}>
										{label}
									</p>
									<p className="text-xs text-slate-500">
										{formatFileSize(file.filesize)} · {formatDateTime(file.date_created)}
									</p>
									<div className="flex items-center justify-end gap-1 pt-1">
										<Button
											size="icon"
											variant="ghost"
											className="size-8"
											onClick={() => setEditing(file)}
											aria-label={`Editar ${label}`}
										>
											<Pencil className="size-4" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
											onClick={() => setToDelete(file)}
											aria-label={`Excluir ${label}`}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Enviar arquivo</DialogTitle>
						<DialogDescription>Imagens (PNG, JPEG, WebP, GIF) ou PDF até 20 MB.</DialogDescription>
					</DialogHeader>
					<MediaUploadForm
						allowDocuments
						onUploaded={() => {
							setUploadOpen(false);
							void afterMutation('Arquivo enviado');
						}}
					/>
				</DialogContent>
			</Dialog>

			<MediaDetailsSheet
				media={editing}
				onOpenChange={(open) => !open && setEditing(null)}
				onSaved={() => afterMutation('Arquivo atualizado')}
			/>

			<AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{toDelete && mediaLabel(toDelete)}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>
							O arquivo é removido do armazenamento. Blocos, posts e configurações que o usam ficam vazios no lugar da
							imagem.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
