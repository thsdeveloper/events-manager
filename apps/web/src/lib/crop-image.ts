export interface PixelArea {
	height: number;
	width: number;
	x: number;
	y: number;
}

/**
 * Desenha a área escolhida da imagem original no tamanho de saída e devolve um
 * arquivo PNG. O nome mantém a base do original: a extensão muda porque o
 * canvas sempre re-codifica, e manter `.jpg` rotularia errado o upload.
 */
export async function renderCroppedFile(input: {
	area: PixelArea;
	canvas?: HTMLCanvasElement;
	image: HTMLImageElement;
	originalName: string;
	outputHeight: number;
	outputWidth: number;
}): Promise<File> {
	const canvas = input.canvas ?? document.createElement('canvas');
	canvas.width = input.outputWidth;
	canvas.height = input.outputHeight;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('canvas unavailable');

	context.drawImage(
		input.image,
		input.area.x,
		input.area.y,
		input.area.width,
		input.area.height,
		0,
		0,
		input.outputWidth,
		input.outputHeight,
	);

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) throw new Error('empty canvas');

	const baseName = input.originalName.replace(/\.[^.]+$/, '') || 'imagem';

	return new File([blob], `${baseName}.png`, { type: 'image/png' });
}

/** Carrega uma imagem a partir de uma URL para desenhar no canvas. */
export function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('image failed to load'));
		image.src = src;
	});
}
