/**
 * Diálogo de ajuste de imagem. A pessoa move a imagem por trás de uma janela de
 * recorte fixa e controla o zoom; o botão de confirmar só libera quando a
 * imagem carregou e há uma área a exportar.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { ImageCropperDialog } from './image-cropper-dialog';

const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });

// O jsdom não implementa URLs de objeto; o diálogo cria uma por arquivo e a
// revoga ao desmontar, inclusive depois do cleanup do teste.
URL.createObjectURL = vi.fn(() => 'blob:foto');
URL.revokeObjectURL = vi.fn();

function renderDialog(props: Partial<React.ComponentProps<typeof ImageCropperDialog>> = {}) {
	return renderWithProviders(<ImageCropperDialog file={file} onCancel={vi.fn()} onCropped={vi.fn()} {...props} />);
}

describe('ImageCropperDialog', () => {
	it('offers zoom and explains that the image, not the frame, is what moves', () => {
		renderDialog();

		expect(screen.getByRole('dialog', { name: 'Ajustar imagem' })).toBeInTheDocument();
		expect(screen.getByRole('slider', { name: 'Zoom' })).toBeInTheDocument();
		expect(screen.getByText(/arraste a imagem/i)).toBeInTheDocument();
	});

	it('keeps the confirm button locked until the image is ready to be cropped', () => {
		renderDialog();

		expect(screen.getByRole('button', { name: 'Usar imagem' })).toBeDisabled();
	});

	it('lets the caller override the texts and the confirm label', () => {
		renderDialog({ title: 'Ajustar foto do perfil', description: 'Escolha a área visível.', confirmLabel: 'Salvar' });

		expect(screen.getByRole('dialog', { name: 'Ajustar foto do perfil' })).toBeInTheDocument();
		expect(screen.getByText('Escolha a área visível.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
	});

	it('closes through the cancel button', async () => {
		const onCancel = vi.fn();
		const { user } = renderDialog({ onCancel });

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));

		expect(onCancel).toHaveBeenCalled();
	});
});
