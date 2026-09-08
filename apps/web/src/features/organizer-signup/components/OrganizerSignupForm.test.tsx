import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { OrganizerSignupForm } from './OrganizerSignupForm';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

afterEach(() => vi.unstubAllGlobals());

const user = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: 'media-1',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-09-04T19:00:00.000Z',
	location: 'Uberlândia - MG',
	description: 'Gosto de festivais.',
};

function lastBody(fetchMock: ReturnType<typeof mockFetch>) {
	return JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body));
}

describe('OrganizerSignupForm', () => {
	it('starts as an individual with the verified CPF locked and the profile data prefilled', () => {
		mockFetch([]);
		renderWithProviders(<OrganizerSignupForm user={user} onSuccess={vi.fn()} />);

		expect(screen.getByRole('radio', { name: /pessoa física/i })).toBeChecked();
		expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
		expect(screen.getByText(/uma conta só vende com o próprio cpf/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/^cnpj/i)).not.toBeInTheDocument();
		expect(screen.getByLabelText(/nome da organização ou marca/i)).toHaveValue('Ana Silva');
		expect(screen.getByLabelText(/e-mail de contato/i)).toHaveValue('ana@example.com');
		expect(screen.getByLabelText(/telefone com ddd/i)).toHaveValue('(11) 99999-0000');
	});

	it('sends an individual using the profile CPF, without a document in the payload', async () => {
		const onSuccess = vi.fn();
		const fetchMock = mockFetch([['/api/organizer/request', () => jsonResponse({ success: true }, { status: 201 })]]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={onSuccess} />);

		await person.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(lastBody(fetchMock)).toEqual({
			account_type: 'individual',
			name: 'Ana Silva',
			email: 'ana@example.com',
			phone: '11999990000',
			description: null,
			website: null,
			accept_terms: true,
		});
	});

	it('switches to a company: asks for the CNPJ and the brand name, keeping the contact data', async () => {
		mockFetch([]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={vi.fn()} />);

		await person.click(screen.getByRole('radio', { name: /empresa ou organização/i }));

		expect(screen.getByLabelText(/^cnpj/i)).toHaveValue('');
		expect(screen.getByLabelText(/nome da organização ou marca/i)).toHaveValue('');
		expect(screen.getByLabelText(/e-mail de contato/i)).toHaveValue('ana@example.com');
		expect(screen.queryByText('529.982.247-25')).not.toBeInTheDocument();
	});

	it('validates the company before sending and masks the CNPJ while typing', async () => {
		const fetchMock = mockFetch([]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={vi.fn()} />);

		await person.click(screen.getByRole('radio', { name: /empresa ou organização/i }));
		await person.type(screen.getByLabelText(/nome da organização ou marca/i), 'F');
		await person.type(screen.getByLabelText(/^cnpj/i), '11111111111111');
		expect(screen.getByLabelText(/^cnpj/i)).toHaveValue('11.111.111/1111-11');
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));

		expect(await screen.findByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
		expect(screen.getByText('Informe um CNPJ válido.')).toBeInTheDocument();
		expect(screen.getByText(/confirme que as informações são verdadeiras/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends a company with the CNPJ digits and the optional fields', async () => {
		const onSuccess = vi.fn();
		const fetchMock = mockFetch([['/api/organizer/request', () => jsonResponse({ success: true }, { status: 201 })]]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={onSuccess} />);

		await person.click(screen.getByRole('radio', { name: /empresa ou organização/i }));
		await person.type(screen.getByLabelText(/nome da organização ou marca/i), 'Festivais Ltda');
		await person.type(screen.getByLabelText(/^cnpj/i), '45723174000110');
		await person.type(screen.getByLabelText(/site ou rede social/i), 'https://festivais.com');
		await person.type(screen.getByLabelText(/sobre seus eventos/i), 'Shows e festivais.');
		await person.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(lastBody(fetchMock)).toMatchObject({
			account_type: 'company',
			name: 'Festivais Ltda',
			document: '45723174000110',
			website: 'https://festivais.com',
			description: 'Shows e festivais.',
		});
	});

	it('explains when the person already has an organizer account and when the API refuses a field', async () => {
		const onSuccess = vi.fn();
		let attempt = 0;
		mockFetch([
			[
				'/api/organizer/request',
				() =>
					attempt++ === 0
						? problemResponse(409, 'ORGANIZER_EXISTS', 'Você já possui uma conta de organizador.')
						: problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
								errors: { fieldErrors: { email: ['E-mail recusado pela API'] } },
							}),
			],
		]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={onSuccess} />);

		await person.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Você já possui uma conta de organizador.');

		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));
		expect(await screen.findByText('E-mail recusado pela API')).toBeInTheDocument();
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
