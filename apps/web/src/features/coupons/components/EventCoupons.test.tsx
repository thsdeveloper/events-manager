import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { EventCoupons } from './EventCoupons';

const EVENT_ID = 'b395d1b2-9fd0-4147-be73-d3a6975aafd0';
const expirationMessage = 'A expiração deve ser depois do início.';
function invalidExpiration() {
	return problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
		errors: { formErrors: [], fieldErrors: { expires_at: [expirationMessage] } },
	});
}
function renderCoupons() {
	return renderWithProviders(
		<>
			<EventCoupons eventId={EVENT_ID} />
			<Toaster />
		</>,
	);
}
afterEach(() => vi.unstubAllGlobals());

describe('coupon error notifications', () => {
	it('shows the field validation in the standard toast, preserves the form, and allows retrying', async () => {
		let attempts = 0;
		mockFetch([
			[
				/coupons/,
				(_url, init) => {
					if (init?.method === 'POST') {
						attempts++;

						return attempts < 3 ? invalidExpiration() : jsonResponse({ id: 'coupon-created' }, { status: 201 });
					}

					return jsonResponse({
						data:
							attempts >= 3
								? [
										{
											id: 'coupon-created',
											code: 'JOVENS10',
											discount_type: 'percentage',
											discount_value: 10,
											status: 'active',
											starts_at: null,
											expires_at: null,
											max_uses: null,
											uses: 0,
										},
									]
								: [],
					});
				},
			],
		]);
		const { user } = renderCoupons();
		await user.click(screen.getByRole('button', { name: 'Novo cupom' }));
		await user.type(screen.getByRole('textbox', { name: 'Código' }), 'JOVENS10');
		await user.click(screen.getByRole('button', { name: 'Salvar cupom' }));
		const notifications = within(screen.getByRole('region', { name: /Notifications/ }));
		expect(await notifications.findByText(expirationMessage)).toBeInTheDocument();
		expect(notifications.getByText('Não foi possível criar o cupom')).toBeInTheDocument();
		expect(screen.queryByText('Os dados enviados são inválidos.')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: 'Código' })).toHaveValue('JOVENS10');
		await user.click(notifications.getByRole('button'));
		await waitFor(() => expect(notifications.queryByText(expirationMessage)).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: 'Salvar cupom' }));
		expect(await notifications.findByText(expirationMessage)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Salvar cupom' }));
		expect(await screen.findByRole('button', { name: 'Desativar JOVENS10' })).toBeInTheDocument();
		expect(screen.queryByRole('textbox', { name: 'Código' })).not.toBeInTheDocument();
	});

	it.each([
		[
			'an ordinary API rejection',
			() => problemResponse(409, 'COUPON_EXISTS', 'Já existe um cupom com este código.'),
			'Já existe um cupom com este código.',
		],
		[
			'an unreadable error response',
			() => new Response('Unavailable', { status: 503 }),
			'Não foi possível concluir a operação.',
		],
		[
			'a connection failure',
			() => {
				throw new TypeError('Failed to fetch');
			},
			'Não foi possível conectar ao servidor. Tente novamente.',
		],
	] as const)('shows %s in a toast without losing the form', async (_case, response, message) => {
		mockFetch([[/coupons/, (_url, init) => (init?.method === 'POST' ? response() : jsonResponse({ data: [] }))]]);
		const { user } = renderCoupons();
		await user.click(screen.getByRole('button', { name: 'Novo cupom' }));
		await user.type(screen.getByRole('textbox', { name: 'Código' }), 'NOVO10');
		await user.click(screen.getByRole('button', { name: 'Salvar cupom' }));
		expect(await within(screen.getByRole('region', { name: /Notifications/ })).findByText(message)).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: 'Código' })).toHaveValue('NOVO10');
		expect(screen.getByRole('button', { name: 'Salvar cupom' })).toBeEnabled();
	});
});

it('keeps a list-loading failure inline without reporting that an accepted creation failed', async () => {
	let created = false;
	mockFetch([
		[
			/coupons/,
			(_url, init) => {
				if (init?.method === 'POST') {
					created = true;

					return jsonResponse({ id: 'new-coupon' }, { status: 201 });
				}
				if (created) throw new TypeError('Failed to fetch');

				return jsonResponse({ data: [] });
			},
		],
	]);
	const { user } = renderCoupons();
	await user.click(screen.getByRole('button', { name: 'Novo cupom' }));
	await user.type(screen.getByRole('textbox', { name: 'Código' }), 'ACEITO10');
	await user.click(screen.getByRole('button', { name: 'Salvar cupom' }));
	expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os cupons. Tente novamente.');
	expect(screen.queryByRole('textbox', { name: 'Código' })).not.toBeInTheDocument();
});
