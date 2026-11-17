'use client';

import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Building2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageCropperDialog } from '@/components/ui/lazy-image-cropper-dialog';
import { useToast } from '@/hooks/use-toast';
import { getMediaAssetUrl } from '@/lib/media';

const ACCEPTED = ['image/png', 'image/webp', 'image/jpeg'];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Uploads straight away, unlike the event cover: the organization already
 * exists, so there is no risk of leaving a file attached to a record that never
 * gets created.
 */
export function OrganizerLogoField({ logo }: { logo: string | null }) {
	const router = useRouter();
	const { toast } = useToast();
	const inputRef = useRef<HTMLInputElement>(null);
	const [preview, setPreview] = useState<string | null>(logo ? getMediaAssetUrl(logo) : null);
	useEffect(() => setPreview(logo ? getMediaAssetUrl(logo) : null), [logo]);
	const [uploading, setUploading] = useState(false);
	// Holds the picked file while the crop dialog is open.
	const [fileToCrop, setFileToCrop] = useState<File | null>(null);

	const handleSelect = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			// Reset so re-picking the same file still fires onChange.
			event.target.value = '';
			if (!file) return;
			if (!ACCEPTED.includes(file.type)) {
				toast({ title: 'Formato não suportado', description: 'Envie PNG, WebP ou JPG.', variant: 'destructive' });

				return;
			}
			if (file.size > MAX_SIZE) {
				toast({ title: 'Arquivo muito grande', description: 'O limite é 5 MB.', variant: 'destructive' });

				return;
			}

			setFileToCrop(file);
		},
		[toast],
	);

	const handleCropped = useCallback(
		async (file: File) => {
			setFileToCrop(null);
			setUploading(true);
			const previousPreview = preview;
			const localPreview = URL.createObjectURL(file);
			setPreview(localPreview);
			try {
				const formData = new FormData();
				formData.append('file', file);
				const response = await fetch('/api/organizer/logo', {
					method: 'POST',
					body: formData,
					credentials: 'include',
				});
				const body = await response.json().catch(() => null);
				if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível enviar a logo.');
				const mediaId = body?.file?.file?.id;
				setPreview(mediaId ? getMediaAssetUrl(mediaId) : (body?.file?.url ?? previousPreview));
				// The sidebar reads the logo from server data, so it only updates on refresh.
				router.refresh();
				toast({
					title: body?.cleanupPending ? 'Logo atualizada; limpeza pendente' : 'Logo atualizada',
					description: body?.cleanupPending
						? 'Não foi possível excluir o arquivo anterior. A falha foi registrada no servidor.'
						: undefined,
					variant: body?.cleanupPending ? 'default' : 'success',
				});
			} catch (error) {
				setPreview(previousPreview);
				toast({
					title: 'Erro ao enviar logo',
					description: error instanceof Error ? error.message : 'Tente novamente.',
					variant: 'destructive',
				});
			} finally {
				URL.revokeObjectURL(localPreview);
				setUploading(false);
				if (inputRef.current) inputRef.current.value = '';
			}
		},
		[preview, router, toast],
	);

	async function handleRemove() {
		setUploading(true);
		try {
			const response = await fetch('/api/organizer/logo', { method: 'DELETE', credentials: 'include' });
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível remover a logo.');
			setPreview(null);
			router.refresh();
			toast({ title: body?.cleanupPending ? 'Logo removida; limpeza do arquivo pendente' : 'Logo removida' });
		} catch (error) {
			toast({
				title: 'Erro ao remover logo',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-4">
			<Card className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden">
				{preview ? (
					<Image src={preview} alt="Logo da organização" fill sizes="80px" className="object-cover" unoptimized />
				) : (
					<Building2 className="size-8 text-muted-foreground" />
				)}
				{uploading && (
					<div className="absolute inset-0 flex items-center justify-center bg-foreground/60">
						<Spinner className="size-5 animate-spin text-white" />
					</div>
				)}
			</Card>

			<div className="space-y-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => inputRef.current?.click()}
						disabled={uploading}
					>
						<Upload className="mr-2 size-4" />
						{preview ? 'Trocar logo' : 'Enviar logo'}
					</Button>
					{preview && !uploading && (
						<Button type="button" variant="destructive" size="sm" onClick={handleRemove}>
							<Trash2 className="mr-2 size-4" />
							Remover
						</Button>
					)}
				</div>
				<p className="text-xs text-muted-foreground">
					Aparece no topo do painel e nas páginas públicas dos seus eventos. PNG, WebP ou JPG até 5 MB.
				</p>
			</div>

			<Input
				ref={inputRef}
				type="file"
				aria-label="Imagem da organização"
				accept={ACCEPTED.join(',')}
				onChange={handleSelect}
				className="hidden"
				disabled={uploading}
			/>

			<ImageCropperDialog
				file={fileToCrop}
				onCancel={() => setFileToCrop(null)}
				onCropped={handleCropped}
				aspectRatio={1}
				outputWidth={512}
				outputHeight={512}
				title="Ajustar logo"
				description="Arraste e ajuste o zoom para enquadrar a logo em um quadrado."
				confirmLabel="Salvar logo"
			/>
		</div>
	);
}
