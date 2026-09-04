'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
// Type-only, so nothing is evaluated at import time. Imported by path on
// purpose — see src/types/cropperjs-full.d.ts. The runtime import lives in
// `attachCropper`; see the note there.
import type Cropper from 'cropperjs/dist/cropper.esm.js';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export interface ImageCropperDialogProps {
	/** The picked file. The dialog opens whenever this is set. */
	file: File | null;
	onCancel: () => void;
	/** Receives the cropped image, ready to upload. */
	onCropped: (file: File) => void;
	/** Width / height the selection is locked to. Omit for a free crop. */
	aspectRatio?: number;
	/** Pixel size of the exported image. Height defaults to `outputWidth / aspectRatio`. */
	outputWidth?: number;
	outputHeight?: number;
	title?: string;
	description?: string;
	/** Rounds the preview mask, for avatars. Output stays square. */
	circular?: boolean;
	confirmLabel?: string;
}

/**
 * Wraps Cropper.js 2.x, which ships as web components rather than a React API:
 * the class is handed a plain `<img>` and replaces it with its own element tree,
 * so the instance lives in a ref and is disposed when the dialog closes.
 *
 * The template mirrors the library default, with `aspect-ratio` applied to the
 * selection and the crosshair dropped — it adds noise at avatar sizes.
 */
function buildTemplate(aspectRatio?: number) {
	const ratio = aspectRatio ? ` aspect-ratio="${aspectRatio}"` : '';

	return (
		'<cropper-canvas background style="width:100%;height:100%">' +
		'<cropper-image rotatable scalable skewable translatable></cropper-image>' +
		'<cropper-shade hidden></cropper-shade>' +
		'<cropper-handle action="select" plain></cropper-handle>' +
		`<cropper-selection initial-coverage="0.9" movable resizable${ratio}>` +
		'<cropper-grid role="grid" bordered covered></cropper-grid>' +
		'<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>' +
		'<cropper-handle action="n-resize"></cropper-handle>' +
		'<cropper-handle action="e-resize"></cropper-handle>' +
		'<cropper-handle action="s-resize"></cropper-handle>' +
		'<cropper-handle action="w-resize"></cropper-handle>' +
		'<cropper-handle action="ne-resize"></cropper-handle>' +
		'<cropper-handle action="nw-resize"></cropper-handle>' +
		'<cropper-handle action="se-resize"></cropper-handle>' +
		'<cropper-handle action="sw-resize"></cropper-handle>' +
		'</cropper-selection>' +
		'</cropper-canvas>'
	);
}

export function ImageCropperDialog({
	file,
	onCancel,
	onCropped,
	aspectRatio,
	outputWidth = 800,
	outputHeight,
	title = 'Ajustar imagem',
	description = 'Arraste e redimensione a área para escolher o enquadramento.',
	circular = false,
	confirmLabel = 'Usar imagem',
}: ImageCropperDialogProps) {
	const cropperRef = useRef<Cropper | null>(null);
	const objectUrlRef = useRef<string | null>(null);
	// Bumped on every attach and on unmount, so a dynamic import that resolves
	// after the node was swapped or torn down knows it is stale.
	const attachIdRef = useRef(0);
	const [isCropping, setIsCropping] = useState(false);
	const [isReady, setIsReady] = useState(false);

	/**
	 * A callback ref rather than `useRef` + `useEffect`: the dialog body is
	 * mounted by Radix inside a portal, so an effect can run before the node
	 * exists — and would then never retry. This fires exactly when the node
	 * attaches and again with `null` when it detaches.
	 */
	const attachCropper = useCallback(
		(container: HTMLDivElement | null) => {
			const attachId = ++attachIdRef.current;

			cropperRef.current?.destroy();
			cropperRef.current = null;
			setIsReady(false);
			if (objectUrlRef.current) {
				URL.revokeObjectURL(objectUrlRef.current);
				objectUrlRef.current = null;
			}

			if (!container || !file) return;

			const objectUrl = URL.createObjectURL(file);
			objectUrlRef.current = objectUrl;

			const image = document.createElement('img');
			image.src = objectUrl;
			image.alt = '';
			container.replaceChildren(image);

			/**
			 * Loaded here instead of at the top of the file because Cropper.js 2.x
			 * registers its web components at module scope: evaluating it runs
			 * `class ... extends HTMLElement`, which throws "HTMLElement is not
			 * defined" while Next renders this client component on the server. The
			 * dynamic import keeps it browser-only — this callback ref only ever
			 * runs after the node attached in the DOM.
			 */
			void (async () => {
				const { default: CropperClass } = await import('cropperjs/dist/cropper.esm.js');
				if (attachIdRef.current !== attachId) return;

				cropperRef.current = new CropperClass(image, { template: buildTemplate(aspectRatio) });
				setIsReady(true);
			})();
		},
		[aspectRatio, file],
	);

	// The object URL outlives the node when the whole dialog unmounts.
	useEffect(() => {
		return () => {
			attachIdRef.current += 1;
			cropperRef.current?.destroy();
			if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
		};
	}, []);

	const handleConfirm = async () => {
		const selection = cropperRef.current?.getCropperSelection();
		if (!selection || !file) return;

		setIsCropping(true);
		try {
			const height = outputHeight ?? (aspectRatio ? Math.round(outputWidth / aspectRatio) : outputWidth);
			const canvas = await selection.$toCanvas({ width: outputWidth, height });
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
			if (!blob) throw new Error('empty canvas');

			// Renamed to .png because the canvas always re-encodes; keeping the
			// original extension would mislabel the upload.
			const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagem';
			onCropped(new File([blob], `${baseName}.png`, { type: 'image/png' }));
		} catch {
			// Falls back to the untouched file rather than blocking the upload.
			onCropped(file);
		} finally {
			setIsCropping(false);
		}
	};

	return (
		<Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div
					ref={attachCropper}
					className={`h-[360px] w-full overflow-hidden bg-slate-950 ${
						circular ? '[&_cropper-selection]:rounded-full' : ''
					}`}
				/>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
					{/* Disabled until the dynamic import resolves: without the cropper
					    instance there is no selection to export, and the click would
					    otherwise be a silent no-op. */}
					<Button type="button" onClick={handleConfirm} loading={isCropping} disabled={!isReady}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
