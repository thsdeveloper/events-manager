import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { Toaster } from '@/components/ui/toaster';
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
	it('starts as an individual with the profile data prefilled and locked: name, e-mail, phone and CPF come from the verified profile', () => {
		mockFetch([]);
		renderWithProviders(<OrganizerSignupForm user={user} onSuccess={vi.fn()} />);

		expect(screen.getByRole('radio', { name: /pessoa física/i })).toBeChecked();
		expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
		expect(screen.getByText(/uma conta só vende com o próprio cpf/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/^cnpj/i)).not.toBeInTheDocument();

		const name = screen.getByLabelText(/^nome$/i);
		const email = screen.getByLabelText(/^seu e-mail$/i);
		const phone = screen.getByLabelText(/^seu telefone$/i);
		expect(name).toHaveValue('Ana Silva');
		expect(email).toHaveValue('ana@example.com');
		expect(phone).toHaveValue('(11) 99999-0000');
		expect(name).toBeDisabled();
		expect(email).toBeDisabled();
		expect(phone).toBeDisabled();
		expect(screen.queryByLabelText(/nome da organização ou marca/i)).not.toBeInTheDocument();
		// The way to change them is the profile, not this form.
		expect(screen.getByRole('link', { name: /editar perfil/i })).toHaveAttribute('href', '/perfil?section=personal');
	});

	it('sends an individual with only the optional texts: the contact data and the CPF are read from the profile by the API', async () => {
		const onSuccess = vi.fn();
		const fetchMock = mockFetch([['/api/organizer/request', () => jsonResponse({ success: true }, { status: 201 })]]);
		const { user: person } = renderWithProviders(<OrganizerSignupForm user={user} onSuccess={onSuccess} />);

		await person.type(screen.getByLabelText(/sobre seus eventos/i), 'Shows e festivais.');
		await person.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(lastBody(fetchMock)).toEqual({
			account_type: 'individual',
			description: 'Shows e festivais.',
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
		expect(screen.getByLabelText(/nome da organização ou marca/i)).toBeEnabled();
		expect(screen.getByLabelText(/e-mail de contato/i)).toHaveValue('ana@example.com');
		expect(screen.getByLabelText(/e-mail de contato/i)).toBeEnabled();
		expect(screen.getByLabelText(/telefone com ddd/i)).toBeEnabled();
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

	it('explains duplicate documents and field validation errors', async () => {
		const onSuccess = vi.fn();
		let attempt = 0;
		mockFetch([
			[
				'/api/organizer/request',
				() =>
					attempt++ === 0
						? problemResponse(409, 'DOCUMENT_IN_USE', 'Você já possui uma conta com este CPF.')
						: problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
								errors: { fieldErrors: { email: ['E-mail recusado pela API'] } },
							}),
			],
		]);
		const { user: person } = renderWithProviders(
			<>
				<OrganizerSignupForm user={user} onSuccess={onSuccess} />
				<Toaster />
			</>,
		);

		await person.click(screen.getByRole('checkbox', { name: /confirmo/i }));
		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));
		expect(
			await within(screen.getByRole('region', { name: /Notifications/ })).findByText(
				'Você já possui uma conta com este CPF.',
			),
		).toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();

		await person.click(screen.getByRole('button', { name: /criar conta de organizador/i }));
		expect(await screen.findByText('E-mail recusado pela API')).toBeInTheDocument();
		expect(onSuccess).not.toHaveBeenCalled();
	});
});

it('links all acceptance documents to published CMS URLs without losing the signup form', () => {
	renderWithProviders(<OrganizerSignupForm user={user} onSuccess={vi.fn()} />);
	for (const [name, href] of [
		['termos de uso', '/termos-de-uso'],
		['política de acesso', '/politica-de-acesso'],
		['política de privacidade', '/politica-de-privacidade'],
	]) {
		const link = screen.getByRole('link', { name });
		expect(link).toHaveAttribute('href', href);
		expect(link).toHaveAttribute('target', '_blank');
	}
});
