/**
 * Exporta o recorte escolhido no diálogo: a área em pixels da imagem original
 * vira um arquivo no tamanho de saída pedido, sempre em PNG porque o canvas
 * re-codifica. O nome mantém a base do arquivo original.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderCroppedFile } from './crop-image';

function fakeCanvas() {
	const context = { drawImage: vi.fn() };
	const canvas = {
		width: 0,
		height: 0,
		getContext: vi.fn(() => context),
		toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(['png'], { type: 'image/png' }))),
	};

	return { canvas, context };
}

describe('renderCroppedFile', () => {
	it('draws only the chosen area, scaled to the output size, and names the file after the original', async () => {
		const { canvas, context } = fakeCanvas();
		const image = { naturalWidth: 4000, naturalHeight: 3000 } as HTMLImageElement;

		const file = await renderCroppedFile({
			area: { x: 100, y: 200, width: 1600, height: 900 },
			canvas: canvas as unknown as HTMLCanvasElement,
			image,
			originalName: 'capa-evento.jpg',
			outputWidth: 800,
			outputHeight: 450,
		});

		expect(canvas.width).toBe(800);
		expect(canvas.height).toBe(450);
		expect(context.drawImage).toHaveBeenCalledWith(image, 100, 200, 1600, 900, 0, 0, 800, 450);
		expect(file.name).toBe('capa-evento.png');
		expect(file.type).toBe('image/png');
	});

	it('refuses to produce an empty file when the browser cannot encode the canvas', async () => {
		const { canvas } = fakeCanvas();
		canvas.toBlob.mockImplementation((callback: (blob: Blob | null) => void) => callback(null));

		await expect(
			renderCroppedFile({
				area: { x: 0, y: 0, width: 10, height: 10 },
				canvas: canvas as unknown as HTMLCanvasElement,
				image: { naturalWidth: 10, naturalHeight: 10 } as HTMLImageElement,
				originalName: 'x.png',
				outputWidth: 10,
				outputHeight: 10,
			}),
		).rejects.toThrow();
	});
});
