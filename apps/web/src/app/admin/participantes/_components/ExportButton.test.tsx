/**
 * A exportação baixa o CSV que a API já monta, uma linha por ingresso nominal,
 * em vez de remontá-lo no navegador a partir de um JSON.
 */
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test';
import { ExportButton } from './ExportButton';

const filters = {
	search: '',
	eventIds: ['e-1'],
	ticketTypeIds: [],
	registrationStatus: [],
	paymentStatus: [],
	hasCheckedIn: null,
	checkInDateRange: { start: null, end: null },
};

afterEach(() => vi.unstubAllGlobals());

describe('ExportButton', () => {
	it('downloads the CSV served by the API with the active filters', async () => {
		const csv = '﻿Participante,Email\n"Bia","bia@events.local"';
		const fetchMock = mockFetch([
			['/api/admin/participantes/export', () => new Response(csv, { headers: { 'content-type': 'text/csv' } })],
		]);
		const createObjectURL = vi.fn(() => 'blob:csv');
		vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		const { user } = renderWithProviders(<ExportButton filters={filters} />);

		await user.click(screen.getByRole('button', { name: /exportar csv/i }));

		await waitFor(() => expect(click).toHaveBeenCalledOnce());
		expect(String(fetchMock.mock.calls[0][0])).toContain('eventIds=e-1');
		expect(createObjectURL).toHaveBeenCalledOnce();
	});
});
