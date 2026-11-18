import { useState } from 'react';
import { screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import { EventLocationPicker } from './EventLocationPicker';
import type { MapPosition } from './EventLocationMap';
function Host() {
	const [position, setPosition] = useState<MapPosition | null>(null);

	return (
		<>
			<EventLocationPicker position={position} onPick={setPosition} onClear={() => setPosition(null)} />
			<output aria-label="Ponto selecionado">{position ? 'Marcado' : 'Vazio'}</output>
		</>
	);
}
afterEach(() => vi.unstubAllGlobals());
describe('map selection requests', () => {
	it('does not restore a removed pin when an older address lookup finishes', async () => {
		let resolve!: (response: Response) => void;
		mockFetch([
			[
				'/api/places/reverse',
				() =>
					new Promise<Response>((_resolve) => {
						resolve = _resolve;
					}),
			],
		]);
		const { user } = renderWithProviders(<Host />);
		await screen.findByRole('button', { name: 'Zoom in' });
		await user.click(screen.getByRole('application'));
		expect(screen.getByLabelText('Ponto selecionado')).toHaveTextContent('Marcado');
		await user.click(screen.getByRole('button', { name: 'Remover pino' }));
		await act(async () => resolve(jsonResponse({ place: { description: 'Endereço antigo', mainText: 'Antigo' } })));
		expect(screen.getByLabelText('Ponto selecionado')).toHaveTextContent('Vazio');
	});
});

it('centers the initial address without covering the map with suggestions or committing a pin', async () => {
	let resolve!: (response: Response) => void;
	const fetch = mockFetch([
		[
			'/api/places/search',
			() =>
				new Promise<Response>((_resolve) => {
					resolve = _resolve;
				}),
		],
	]);
	const pick = vi.fn();
	renderWithProviders(
		<EventLocationPicker position={null} initialQuery="Praça da Sé" onPick={pick} onClear={vi.fn()} />,
	);
	await waitFor(() => expect(fetch).toHaveBeenCalled());
	await act(async () =>
		resolve(
			jsonResponse({
				predictions: [
					{ placeId: '1', mainText: 'Praça da Sé', description: 'Praça da Sé', latitude: -23.55, longitude: -46.63 },
				],
			}),
		),
	);
	expect(screen.queryByRole('button', { name: 'Praça da Sé' })).not.toBeInTheDocument();
	expect(pick).not.toHaveBeenCalled();
});
