'use client';

import { Building2, Loader2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
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
				// The sidebar reads the logo from server data, so it only updates on refresh.
				router.refresh();
				toast({ title: 'Logo atualizada', variant: 'success' });
			} catch (error) {
				setPreview(logo ? getMediaAssetUrl(logo) : null);
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
		[logo, router, toast],
	);

	return (
		<div className="flex flex-wrap items-center gap-4">
			<div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
				{preview ? (
					<Image src={preview} alt="Logo da organização" fill sizes="80px" className="object-contain p-2" unoptimized />
				) : (
					<Building2 className="size-8 text-muted-foreground" />
				)}
				{uploading && (
					<div className="absolute inset-0 flex items-center justify-center bg-slate-950/60">
						<Loader2 className="size-5 animate-spin text-white" />
					</div>
				)}
			</div>

			<div className="space-y-1.5">
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
						<Upload className="mr-2 size-4" />
						{preview ? 'Trocar logo' : 'Enviar logo'}
					</Button>
					{preview && !uploading && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setPreview(null);
								if (inputRef.current) inputRef.current.value = '';
							}}
							className="text-destructive hover:bg-destructive/10"
						>
							<Trash2 className="mr-2 size-4" />
							Remover
						</Button>
					)}
				</div>
				<p className="text-xs text-muted-foreground">
					Aparece no topo do painel e nas páginas públicas dos seus eventos. PNG, WebP ou JPG até 5 MB.
				</p>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED.join(',')}
				onChange={handleSelect}
				className="hidden"
				disabled={uploading}
			/>

			{/* Free crop: logos come in wildly different shapes, so locking a ratio
			    would force letterboxing. */}
			<ImageCropperDialog
				file={fileToCrop}
				onCancel={() => setFileToCrop(null)}
				onCropped={handleCropped}
				outputWidth={512}
				title="Ajustar logo"
				description="Recorte as margens sobrando ao redor da sua logo."
				confirmLabel="Salvar logo"
			/>
		</div>
	);
}
