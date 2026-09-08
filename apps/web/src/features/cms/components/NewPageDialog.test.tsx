import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { NewPageDialog } from './NewPageDialog';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

describe('NewPageDialog', () => {
	it('suggests a permalink from the title until the person edits it by hand', async () => {
		mockFetch([]);
		const { user } = renderWithProviders(<NewPageDialog open onOpenChange={vi.fn()} />);

		await user.type(screen.getByLabelText(/título/i), 'Quem Somos Nós');
		expect(screen.getByLabelText(/permalink/i)).toHaveValue('/quem-somos-nos');

		await user.clear(screen.getByLabelText(/permalink/i));
		await user.type(screen.getByLabelText(/permalink/i), '/equipe');
		await user.type(screen.getByLabelText(/título/i), '!');
		expect(screen.getByLabelText(/permalink/i)).toHaveValue('/equipe');
	});

	it('creates the draft and opens its editor', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/pages', () => jsonResponse({ id: 'new-page' }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<NewPageDialog open onOpenChange={vi.fn()} />);

		await user.type(screen.getByLabelText(/título/i), 'Contato');
		await user.click(screen.getByRole('button', { name: /criar página/i }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/super-admin/conteudo/paginas/new-page'));
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
			title: 'Contato',
			permalink: '/contato',
			status: 'draft',
			published_at: null,
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('blocks reserved paths inline and surfaces a duplicate permalink from the API', async () => {
		mockFetch([['/api/super-admin/cms/pages', () => problemResponse(409, 'PERMALINK_IN_USE', 'Permalink já em uso.')]]);
		const { user } = renderWithProviders(<NewPageDialog open onOpenChange={vi.fn()} />);

		await user.type(screen.getByLabelText(/título/i), 'Blog');
		await user.click(screen.getByRole('button', { name: /criar página/i }));
		expect(await screen.findByText(/reservado pela aplicação/i)).toBeInTheDocument();

		await user.clear(screen.getByLabelText(/permalink/i));
		await user.type(screen.getByLabelText(/permalink/i), '/novidades');
		await user.click(screen.getByRole('button', { name: /criar página/i }));
		expect(await screen.findByText('Permalink já em uso.')).toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
	});
});
