import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { FormEditor } from './FormEditor';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

describe('FormEditor', () => {
	it('creates the form with its fields and opens the editor of the new form', { timeout: 20_000 }, async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/forms', () => jsonResponse({ id: 'form-1' }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<FormEditor form={null} />);

		await user.type(screen.getByLabelText(/nome do formulário/i), 'Contato');
		await user.click(screen.getByRole('button', { name: /adicionar campo/i }));
		const field = screen.getByRole('group', { name: /campo 1/i });
		await user.type(within(field).getByLabelText(/rótulo/i), 'E-mail');
		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		await waitFor(() => expect(push).toHaveBeenCalledWith('/super-admin/conteudo/formularios/form-1'));
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toMatchObject({
			title: 'Contato',
			on_success: 'message',
			is_active: true,
			fields: [{ name: 'e-mail', label: 'E-mail', type: 'text', required: false }],
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('refuses to save without a name and points at the problem', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<FormEditor form={null} />);

		await user.click(screen.getByRole('button', { name: /^salvar$/i }));

		expect(await screen.findByText('Informe o nome do formulário.')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
