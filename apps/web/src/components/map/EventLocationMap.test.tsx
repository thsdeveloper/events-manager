import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { EventLocationMap } from './EventLocationMap';
describe('mapa do evento', () => {
	it('mostra o marcador salvo assim que o mapa é carregado', async () => {
		renderWithProviders(<EventLocationMap position={{ latitude: -23.55, longitude: -46.63 }} editable />);
		expect(await screen.findByRole('button', { name: 'Ponto exato do evento' })).toBeInTheDocument();
	});
	it('permite marcar o mapa com um clique', async () => {
		const onPositionChange = vi.fn();
		const { user } = renderWithProviders(
			<EventLocationMap position={null} editable onPositionChange={onPositionChange} />,
		);
		await screen.findByRole('button', { name: 'Zoom in' });
		await user.click(screen.getByRole('application'));
		await waitFor(() =>
			expect(onPositionChange).toHaveBeenCalledWith({ latitude: expect.any(Number), longitude: expect.any(Number) }),
		);
	});
});
