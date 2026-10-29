'use client';

import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area, type MediaSize } from 'react-easy-crop';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { loadImage, renderCroppedFile } from '@/lib/crop-image';

export interface ImageCropperDialogProps {
	/** The picked file. The dialog opens whenever this is set. */
	file: File | null;
	onCancel: () => void;
	/** Receives the cropped image, ready to upload. */
	onCropped: (file: File) => void;
	/** Width / height the frame is locked to. Omit to keep the image's own proportion. */
	aspectRatio?: number;
	/** Pixel size of the exported image. Height defaults to `outputWidth / aspect`. */
	outputWidth?: number;
	outputHeight?: number;
	title?: string;
	description?: string;
	/** Rounds the frame, for avatars. Output stays square. */
	circular?: boolean;
	confirmLabel?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

/**
 * A janela de recorte fica fixa e é a imagem que se move: a pessoa arrasta,
 * aproxima e afasta até o enquadramento certo, como nas redes sociais. A
 * biblioteca devolve a área em pixels da imagem original e o export desenha
 * exatamente essa área no tamanho pedido, então o que se vê é o que sai.
 */
export function ImageCropperDialog({
	file,
	onCancel,
	onCropped,
	aspectRatio,
	outputWidth = 800,
	outputHeight,
	title = 'Ajustar imagem',
	description = 'Arraste a imagem para posicionar e use o zoom para enquadrar. A moldura fica fixa.',
	circular = false,
	confirmLabel = 'Usar imagem',
}: ImageCropperDialogProps) {
	const [objectUrl, setObjectUrl] = useState<string | null>(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(MIN_ZOOM);
	const [mediaAspect, setMediaAspect] = useState<number | null>(null);
	const [area, setArea] = useState<Area | null>(null);
	const [isCropping, setIsCropping] = useState(false);

	// Uma URL de objeto por arquivo, revogada quando o arquivo muda ou o diálogo fecha.
	useEffect(() => {
		if (!file) {
			setObjectUrl(null);

			return;
		}
		const url = URL.createObjectURL(file);
		setObjectUrl(url);
		setCrop({ x: 0, y: 0 });
		setZoom(MIN_ZOOM);
		setMediaAspect(null);
		setArea(null);

		return () => URL.revokeObjectURL(url);
	}, [file]);

	// Sem proporção pedida, a moldura assume a da própria imagem: serve para
	// aparar margens de uma logo sem impor um formato.
	const aspect = aspectRatio ?? mediaAspect ?? 1;
	const isReady = Boolean(objectUrl && area && (aspectRatio || mediaAspect));
	const zoomPercent = useMemo(() => Math.round(zoom * 100), [zoom]);

	const handleMediaLoaded = (media: MediaSize) => {
		if (media.naturalWidth > 0 && media.naturalHeight > 0) setMediaAspect(media.naturalWidth / media.naturalHeight);
	};

	const handleConfirm = async () => {
		if (!file || !objectUrl || !area) return;
		setIsCropping(true);
		try {
			const height = outputHeight ?? Math.round(outputWidth / aspect);
			const image = await loadImage(objectUrl);
			onCropped(await renderCroppedFile({ area, image, originalName: file.name, outputWidth, outputHeight: height }));
		} catch {
			// Falls back to the untouched file rather than blocking the upload.
			onCropped(file);
		} finally {
			setIsCropping(false);
		}
	};

	const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

	return (
		<Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="relative h-[380px] w-full overflow-hidden rounded-lg bg-slate-950">
					{objectUrl ? (
						<Cropper
							image={objectUrl}
							crop={crop}
							zoom={zoom}
							aspect={aspect}
							minZoom={MIN_ZOOM}
							maxZoom={MAX_ZOOM}
							zoomSpeed={0.5}
							cropShape={circular ? 'round' : 'rect'}
							showGrid={!circular}
							restrictPosition
							onCropChange={setCrop}
							onZoomChange={(value) => setZoom(clampZoom(value))}
							onCropComplete={(_percent, pixels) => setArea(pixels)}
							onMediaLoaded={handleMediaLoaded}
						/>
					) : null}
				</div>

				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Diminuir zoom"
						onClick={() => setZoom((value) => clampZoom(value - ZOOM_STEP * 2))}
						disabled={zoom <= MIN_ZOOM}
					>
						<ZoomOut className="size-4" aria-hidden />
					</Button>
					<input
						type="range"
						aria-label="Zoom"
						aria-valuetext={`${zoomPercent}%`}
						min={MIN_ZOOM}
						max={MAX_ZOOM}
						step={ZOOM_STEP}
						value={zoom}
						onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
						className="h-2 flex-1 cursor-pointer accent-primary"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Aumentar zoom"
						onClick={() => setZoom((value) => clampZoom(value + ZOOM_STEP * 2))}
						disabled={zoom >= MAX_ZOOM}
					>
						<ZoomIn className="size-4" aria-hidden />
					</Button>
					<span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{zoomPercent}%</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							setCrop({ x: 0, y: 0 });
							setZoom(MIN_ZOOM);
						}}
						disabled={zoom === MIN_ZOOM && crop.x === 0 && crop.y === 0}
					>
						<RotateCcw className="size-4" aria-hidden />
						Restaurar
					</Button>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
					<Button type="button" onClick={handleConfirm} loading={isCropping} disabled={!isReady}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
