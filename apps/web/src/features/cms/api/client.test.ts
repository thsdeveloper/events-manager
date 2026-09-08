import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse } from '@/test';
import { CmsRequestError, cmsRequest } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('cmsRequest', () => {
	it('sends JSON with the session cookie to the CMS endpoint and returns the parsed body', async () => {
		const fetchMock = mockFetch([['/api/super-admin/cms/pages', () => jsonResponse({ id: 'p1' }, { status: 201 })]]);

		const body = await cmsRequest<{ id: string }>('/pages', { method: 'POST', body: { title: 'Sobre' } });

		expect(body).toEqual({ id: 'p1' });
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/super-admin/cms/pages',
			expect.objectContaining({
				method: 'POST',
				credentials: 'include',
				headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
				body: JSON.stringify({ title: 'Sobre' }),
			}),
		);
	});

	it('turns a validation problem into an error carrying the field messages from the API', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/redirects',
				() =>
					problemResponse(422, 'REDIRECT_LOOP', 'O destino redireciona de volta para a origem.', {
						errors: { fieldErrors: { url_to: ['Cria um loop.'] }, formErrors: [] },
					}),
			],
		]);

		const failure = await cmsRequest('/redirects', { method: 'POST', body: {} }).catch((error) => error);

		expect(failure).toBeInstanceOf(CmsRequestError);
		expect(failure).toMatchObject({
			status: 422,
			code: 'REDIRECT_LOOP',
			message: 'O destino redireciona de volta para a origem.',
			fieldErrors: { url_to: ['Cria um loop.'] },
		});
	});

	it('falls back to a generic message when the API answers without a problem body', async () => {
		mockFetch([['/api/super-admin/cms/site', () => new Response('nope', { status: 500 })]]);

		await expect(cmsRequest('/site')).rejects.toMatchObject({
			status: 500,
			message: 'Não foi possível concluir a operação. Tente novamente.',
		});
	});
});
