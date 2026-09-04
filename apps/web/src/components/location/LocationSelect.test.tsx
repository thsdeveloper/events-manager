import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { LocationSelect } from './LocationSelect';

afterEach(() => vi.unstubAllGlobals());

describe('LocationSelect', () => {
	it('keeps the chevron at the trailing edge of each select trigger', () => {
		mockFetch([['/api/locations/states', () => jsonResponse([{ id: 31, uf: 'MG', name: 'Minas Gerais' }])]]);

		renderWithProviders(<LocationSelect value={null} onChange={() => {}} />);

		for (const name of ['Estado', 'Cidade']) {
			const trigger = screen.getByRole('combobox', { name });
			const chevron = trigger.querySelector('svg.lucide-chevrons-up-down');
			const row = chevron?.parentElement;

			expect(trigger).toHaveClass('justify-between');
			// The chevron must sit in the trigger's own flex row (or a wrapper with no
			// box of its own) and be its last item; a sized wrapper collapses around the
			// text and drags the icon away from the right edge.
			expect(row === trigger || row?.classList.contains('contents')).toBe(true);
			expect(row?.lastElementChild).toBe(chevron);
		}
	});
});
