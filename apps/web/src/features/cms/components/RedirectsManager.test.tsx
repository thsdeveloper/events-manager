import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { RedirectsManager } from './RedirectsManager';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

describe('RedirectsManager', () => {
	it('creates a permanent redirect and refreshes the table', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/redirects', () => jsonResponse({ id: 'r1' }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<RedirectsManager redirects={[]} />);

		await user.click(screen.getByRole('button', { name: /novo redirecionamento/i }));
		const sheet = await screen.findByRole('dialog');
		await user.type(within(sheet).getByLabelText(/origem/i), '/antiga');
		await user.type(within(sheet).getByLabelText(/destino/i), '/nova');
		await user.click(within(sheet).getByRole('button', { name: /salvar/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
			url_from: '/antiga',
			url_to: '/nova',
			response_code: '301',
			note: null,
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('shows the loop error returned by the API on the destination field', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/redirects',
				() =>
					problemResponse(422, 'REDIRECT_LOOP', 'O destino já redireciona de volta para a origem.', {
						errors: { fieldErrors: { url_to: ['Cria um loop de redirecionamento.'] }, formErrors: [] },
					}),
			],
		]);
		const { user } = renderWithProviders(<RedirectsManager redirects={[]} />);

		await user.click(screen.getByRole('button', { name: /novo redirecionamento/i }));
		const sheet = await screen.findByRole('dialog');
		await user.type(within(sheet).getByLabelText(/origem/i), '/a');
		await user.type(within(sheet).getByLabelText(/destino/i), '/b');
		await user.click(within(sheet).getByRole('button', { name: /salvar/i }));

		expect(await within(sheet).findByText('Cria um loop de redirecionamento.')).toBeInTheDocument();
		expect(within(sheet).getByText('O destino já redireciona de volta para a origem.')).toBeInTheDocument();
		expect(refresh).not.toHaveBeenCalled();
	});

	it('rejects a destination equal to the origin before calling the API', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<RedirectsManager redirects={[]} />);

		await user.click(screen.getByRole('button', { name: /novo redirecionamento/i }));
		const sheet = await screen.findByRole('dialog');
		await user.type(within(sheet).getByLabelText(/origem/i), '/x');
		await user.type(within(sheet).getByLabelText(/destino/i), '/x');
		await user.click(within(sheet).getByRole('button', { name: /salvar/i }));

		expect(await within(sheet).findByText(/não podem ser iguais/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
