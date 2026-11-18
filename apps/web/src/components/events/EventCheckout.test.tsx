/**
 * A compra inteira, do ingresso ao envio: a pessoa escolhe a quantidade, segue
 * para os dados, escolhe cartão e finaliza. O que sai para a API precisa
 * refletir a escolha, e o parcelamento via Pix não pode vazar para o cartão.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { EventTicket } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import EventCheckout from './EventCheckout';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const tickets = [
	{
		id: 'ticket-a',
		title: 'Inteira',
		description: 'Ingresso comum',
		status: 'active',
		quantity: 100,
		quantity_sold: 0,
		price: 90,
		buyer_price: 100,
		sale_start_date: null,
		sale_end_date: null,
		min_quantity_per_purchase: 1,
		max_quantity_per_purchase: 5,
		allow_installments: true,
		max_installments: 3,
		min_amount_for_installments: 50,
	},
] as unknown as EventTicket[];

function renderCheckout(
	checkoutResponse: () => Response = () =>
		jsonResponse({ attemptId: '00000000-0000-4000-8000-000000000099', status: 'pending', payment: null }),
	quoteExtra: Record<string, unknown> = {},
	checkoutTickets = tickets,
	buyer: { name: string; email: string; phone?: string; document?: string } = {
		name: 'Ana Souza',
		email: 'ana@events.local',
	},
) {
	sessionStorage.clear();
	vi.stubGlobal('location', { ...window.location, href: '' });
	const fetchMock = mockFetch([
		['/api/payments/methods', () => jsonResponse({ methods: ['PIX', 'CARD'] })],
		[
			'/api/payments/checkout/quote',
			(_url, init) =>
				jsonResponse({
					amountInCents:
						10000 *
						JSON.parse(String(init?.body)).tickets.reduce(
							(sum: number, t: { quantity: number }) => sum + t.quantity,
							0,
						),
					maxInstallments: 3,
					methods: ['PIX', 'CARD'],
					publicKey: null,
					mock: true,
					...quoteExtra,
				}),
		],
		[/\/api\/payments\/attempts\//, () => jsonResponse({ attemptId: 'a', status: 'pending', payment: null })],
		['/api/payments/checkout', checkoutResponse],
		['/api/checkout/installments', () => jsonResponse({ registration_id: 'reg-1', success: true })],
	]);
	const view = renderWithProviders(
		<>
			<EventCheckout
				event={{
					endDate: '2026-09-21T21:00:00.000Z',
					eventType: 'in_person',
					locationName: 'Ginásio Central',
					slug: 'congresso',
					startDate: '2026-09-19T12:00:00.000Z',
				}}
				eventId="e-1"
				eventTitle="Congresso"
				tickets={checkoutTickets}
				defaultParticipantInfo={buyer}
			/>
			<Toaster />
		</>,
	);

	return { ...view, fetchMock };
}

describe('EventCheckout', () => {
	it('continues to payment from the summary and removes the redundant back button', async () => {
		const { user } = renderCheckout();
		await continueToDetails(user);
		const summary = screen.getByRole('region', { name: 'Resumo da compra' });
		const next = within(summary).getByRole('button', { name: 'Continuar para pagamento' });
		expect(screen.getAllByRole('button', { name: 'Continuar para pagamento' })).toHaveLength(1);
		expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Voltar para Ingressos' })).toBeInTheDocument();
		await user.click(next);
		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Pagamento');
	});

	it('validates the attendee form when continuing from the summary', async () => {
		const { user } = renderCheckout();
		await user.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));
		await continueToDetails(user);
		const next = within(screen.getByRole('region', { name: 'Resumo da compra' })).getByRole('button', {
			name: 'Continuar para pagamento',
		});
		await user.click(next);
		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Seus dados');
		const attendee = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		expect(within(attendee).getByRole('alert')).toHaveTextContent('Informe nome e e-mail');
		expect(within(attendee).getByLabelText('Nome completo')).toHaveFocus();
		await user.click(within(attendee).getByRole('checkbox', { name: 'Preencher depois' }));
		await user.click(next);
		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Pagamento');
	});

	it('keeps a ticket pending nomination in a Pix installment purchase without changing its buyer', async () => {
		const { user, fetchMock } = renderCheckout();
		await continueToDetails(user);
		await user.click(screen.getByRole('checkbox', { name: 'Preencher depois' }));
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));
		await user.click(await screen.findByRole('radio', { name: /3x de R\$ 33\.33/i }));
		await user.click(screen.getByRole('button', { name: /Pagar R\$/ }));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/checkout/installments', expect.anything()));
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/checkout/installments');
		expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
			participant_name: 'Ana Souza',
			participant_email: 'ana@events.local',
			attendees: [null],
		});
	});

	it('starts with one ticket selected and includes it in the purchase total', () => {
		renderCheckout();
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toHaveValue(1);
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 100,00');
		expect(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]).toBeEnabled();
	});

	it.each([
		{ status: 'inactive' },
		{ visibility: 'private' },
		{ quantity_sold: 100 },
		{ sale_start_date: '2999-01-01T00:00:00Z' },
		{ sale_end_date: '2000-01-01T00:00:00Z' },
		{ quantity: 1, min_quantity_per_purchase: 2 },
		{ max_quantity_per_purchase: 1, min_quantity_per_purchase: 2 },
	])('preselects only the first purchasable ticket, skipping %j', (unavailable) => {
		renderCheckout(undefined, {}, [
			{ ...tickets[0], ...unavailable } as EventTicket,
			{ ...tickets[0], id: 'ticket-b', title: 'VIP' },
			{ ...tickets[0], id: 'ticket-c', title: 'Camarote' },
		]);
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de VIP' })).toHaveValue(1);
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Camarote' })).toHaveValue(0);
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 100,00');
	});

	it('respects the minimum purchase quantity when preselecting a ticket', () => {
		renderCheckout(undefined, {}, [{ ...tickets[0], min_quantity_per_purchase: 2 }]);
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toHaveValue(2);
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 200,00');
	});

	it('keeps the cart empty when no tickets are available', () => {
		renderCheckout(undefined, {}, [{ ...tickets[0], quantity_sold: 100 }]);
		expect(screen.getByText('Nenhum ingresso disponível no momento.')).toBeInTheDocument();
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 0,00');
		expect(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]).toBeDisabled();
	});

	it('preserves the chosen quantity between steps and allows removing the default ticket', async () => {
		const { user } = renderCheckout();
		await user.click(screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' }));
		await continueToDetails(user);
		await user.click(screen.getByRole('button', { name: 'Voltar para Ingressos' }));
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toHaveValue(2);
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 200,00');
		await user.click(screen.getByRole('button', { name: 'Remover um ingresso Inteira' }));
		await user.click(screen.getByRole('button', { name: 'Remover um ingresso Inteira' }));
		expect(screen.getByRole('spinbutton', { name: 'Quantidade de Inteira' })).toHaveValue(0);
		expect(screen.getByTestId('order-total')).toHaveTextContent('R$ 0,00');
		expect(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]).toBeDisabled();
	});

	// O botão de avançar existe duas vezes no DOM: no resumo (desktop) e na barra
	// fixa (celular). O CSS mostra um de cada vez; para o teste, o primeiro basta.
	async function continueToDetails(user: ReturnType<typeof renderCheckout>['user']) {
		await user.click(screen.getAllByRole('button', { name: 'Continuar para seus dados' })[0]);
	}

	async function reachPaymentStep(user: ReturnType<typeof renderCheckout>['user']) {
		await continueToDetails(user);
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));
	}

	it('shows a declined payment only once in the standard toast', async () => {
		const { user } = renderCheckout(() => problemResponse(422, 'PAYMENT_DECLINED', 'Pagamento recusado.'));
		await reachPaymentStep(user);
		await user.click(await screen.findByRole('button', { name: /Pagar R\$/ }));
		await waitFor(() => expect(screen.getAllByText('Pagamento recusado.')).toHaveLength(1));
	});
	it('updates the summary when the server price changed since the event was loaded', async () => {
		const { user } = renderCheckout(undefined, {
			amountInCents: 12000,
			items: [{ id: 'ticket-a', title: 'Inteira', quantity: 1, unitPrice: 120, unitFee: 10 }],
			discountInCents: 0,
		});
		await reachPaymentStep(user);
		await screen.findByRole('button', { name: /Pagar R\$\s?120,00/ });
		expect(screen.getByTestId('order-total').textContent).toMatch(/120,00/);
	});
	it('introduces the event once, with when and where, and puts the tickets first', () => {
		renderCheckout();

		expect(screen.getByRole('heading', { level: 1, name: 'Congresso' })).toBeInTheDocument();
		expect(screen.getAllByText('Congresso')).toHaveLength(1);
		expect(screen.getByText(/Ginásio Central/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Ver detalhes do evento' })).toHaveAttribute('href', '/eventos/congresso');
		expect(screen.getByRole('heading', { level: 2, name: /^Ingressos/ })).toBeInTheDocument();
		expect(screen.queryByText('Escolha seus ingressos.')).not.toBeInTheDocument();
	});

	it('names the next step on the button and goes there', async () => {
		const { user } = renderCheckout();

		await continueToDetails(user);

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Seus dados');
	});

	it('repeats the total and the next step in a bar for small screens', () => {
		renderCheckout();

		const bar = screen.getByRole('region', { name: 'Total e próximo passo' });
		expect(within(bar).getByText('R$ 100,00')).toBeInTheDocument();
		expect(within(bar).getByRole('button', { name: 'Continuar para seus dados' })).toBeEnabled();
	});

	it('lets the buyer go back to the tickets from the trail of steps', async () => {
		const { user } = renderCheckout();

		await continueToDetails(user);
		await user.click(screen.getByRole('button', { name: 'Voltar para Ingressos' }));

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Ingressos');
	});

	it('shows the coupon once, on the discount line, and lets the buyer remove it there', async () => {
		const { user, fetchMock } = renderCheckout();
		fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
			String(input).includes('/coupons/apply')
				? jsonResponse({ code: 'JOVENS10', discount: 10, subtotal: 100, total: 90 })
				: jsonResponse({ methods: ['PIX', 'CARD'] }),
		);

		await user.type(screen.getByLabelText('Cupom de desconto'), 'JOVENS10');
		await user.click(screen.getByRole('button', { name: 'Aplicar' }));

		expect(await screen.findByText('Você economiza R$ 10,00')).toBeInTheDocument();
		expect(screen.getAllByText('JOVENS10')).toHaveLength(1);
		expect(screen.queryByLabelText('Cupom de desconto')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Remover cupom' }));

		expect(screen.getByLabelText('Cupom de desconto')).toBeInTheDocument();
		expect(screen.queryByText('JOVENS10')).not.toBeInTheDocument();
	});

	it('explains how much of the subtotal is service fee', () => {
		renderCheckout();

		expect(screen.getByText('Inclui R$ 10,00 de taxa de serviço')).toBeInTheDocument();
	});

	it('reassures the buyer in plain words instead of talking about the server', () => {
		renderCheckout();

		expect(screen.getByText('Você confere tudo antes de pagar.')).toBeInTheDocument();
		expect(screen.queryByText(/servidor/)).not.toBeInTheDocument();
	});

	it('explains that a ticket comes first when a coupon is applied to an empty cart', async () => {
		const { user, fetchMock } = renderCheckout();
		await user.click(screen.getByRole('button', { name: 'Remover um ingresso Inteira' }));

		await user.type(screen.getByLabelText('Cupom de desconto'), 'JOVENS10');
		await user.click(screen.getByRole('button', { name: 'Aplicar' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Escolha ao menos um ingresso antes de aplicar o cupom.',
		);
		expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/coupons/apply'))).toBe(false);
	});

	it('keeps the payment choice out of "Seus dados" and shows it on the "Pagamento" step', async () => {
		const { user } = renderCheckout();

		await continueToDetails(user);

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Seus dados');
		expect(screen.queryByRole('radio', { name: /cartão de crédito/i })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Pagamento');
		expect(await screen.findByRole('radio', { name: /cartão de crédito/i })).toBeInTheDocument();
	});

	it('requires completing missing buyer data in the profile before payment', async () => {
		const { user } = renderCheckout(undefined, {}, tickets, { name: '', email: 'ana@events.local' });

		await continueToDetails(user);
		expect(screen.getByRole('link', { name: 'Atualizar meu perfil' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Continuar para pagamento' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Seus dados');
	});

	it('asks who will use each ticket, with the first unit already hers, and sends the attendees', async () => {
		const { fetchMock, user } = renderCheckout();

		const add = screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' });
		await user.click(add);
		await continueToDetails(user);

		expect(screen.getByRole('heading', { name: 'Participantes' })).toBeInTheDocument();
		const first = screen.getByRole('group', { name: 'Inteira · ingresso 1 de 2' });
		expect(within(first).getByRole('checkbox', { name: 'Este ingresso é para mim' })).toBeChecked();
		expect(within(first).getByText('Ana Souza')).toBeInTheDocument();

		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		await user.type(within(second).getByLabelText('Nome completo'), 'Bia Lima');
		await user.type(within(second).getByLabelText('E-mail'), 'bia@events.local');
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));
		await user.click(await screen.findByRole('button', { name: /Pagar R\$/ }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/payments/checkout', expect.anything()));
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/payments/checkout');
		expect(JSON.parse(String(call?.[1]?.body)).tickets).toEqual([
			{
				ticketId: 'ticket-a',
				quantity: 2,
				attendees: [
					{ name: 'Ana Souza', email: 'ana@events.local' },
					{ name: 'Bia Lima', email: 'bia@events.local' },
				],
			},
		]);
	});

	it('lets a unit wait to be named later and sends it as pending', async () => {
		const { fetchMock, user } = renderCheckout();

		const add = screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' });
		await user.click(add);
		await continueToDetails(user);
		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		await user.click(within(second).getByRole('checkbox', { name: 'Preencher depois' }));
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));
		await user.click(await screen.findByRole('button', { name: /Pagar R\$/ }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/payments/checkout', expect.anything()));
		const call = fetchMock.mock.calls.find(([url]) => url === '/api/payments/checkout');
		expect(JSON.parse(String(call?.[1]?.body)).tickets[0].attendees).toEqual([
			{ name: 'Ana Souza', email: 'ana@events.local' },
			null,
		]);
	});

	it('does not move on while a unit is neither named nor left for later', async () => {
		const { user } = renderCheckout();

		const add = screen.getByRole('button', { name: 'Adicionar um ingresso Inteira' });
		await user.click(add);
		await continueToDetails(user);
		await user.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));

		expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Seus dados');
		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		expect(within(second).getByRole('alert')).toHaveTextContent(/informe nome e e-mail/i);
	});

	it('lets the buyer pay by card using their profile data', async () => {
		const { fetchMock, user } = renderCheckout(undefined, {}, tickets, {
			name: 'Ana Souza',
			email: 'ana@events.local',
			document: '52998224725',
			phone: '11999999999',
		});

		await reachPaymentStep(user);
		await user.click(await screen.findByRole('radio', { name: /cartão de crédito/i }));
		expect(screen.getByLabelText('CPF ou CNPJ do comprador *')).toHaveValue('529.982.247-25');
		expect(screen.getByLabelText('Celular do comprador *')).toHaveValue('(11) 99999-9999');
		await user.click(await screen.findByRole('button', { name: /Pagar R\$/ }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith('/api/payments/checkout', expect.objectContaining({ method: 'POST' })),
		);
		const checkoutCall = fetchMock.mock.calls.find(([url]) => url === '/api/payments/checkout');
		expect(JSON.parse(String(checkoutCall?.[1]?.body))).toMatchObject({
			paymentMethod: 'CARD',
			tickets: [{ ticketId: 'ticket-a', quantity: 1 }],
			participantInfo: { name: 'Ana Souza', email: 'ana@events.local' },
		});
	});

	it('shows the Pix installment choices only while Pix is selected', async () => {
		const { user } = renderCheckout();

		await reachPaymentStep(user);

		expect(await screen.findByRole('radio', { name: /3x de R\$ 33\.33/i })).toBeInTheDocument();
		await user.click(screen.getByRole('radio', { name: /cartão de crédito/i }));
		expect(screen.queryByRole('radio', { name: /3x de/i })).not.toBeInTheDocument();
	});

	it('reports a refused purchase through the toast, naming the field, not an inline alert', async () => {
		const { user } = renderCheckout(() =>
			problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
				errors: { fieldErrors: { participantInfo: ['CPF inválido'] }, formErrors: [] },
			}),
		);

		await reachPaymentStep(user);
		await user.click(await screen.findByRole('button', { name: /Pagar R\$/ }));

		expect(await screen.findByText('CPF inválido')).toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
