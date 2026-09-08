import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { PhoneVerification } from './PhoneVerification';

afterEach(() => vi.unstubAllGlobals());

const PHONE = '11999990000';

function bodyOf(fetchMock: ReturnType<typeof mockFetch>, path: string) {
	const call = fetchMock.mock.calls.find(([input]) => String(input).includes(path));

	return call ? JSON.parse(String(call[1]?.body)) : null;
}

describe('PhoneVerification', () => {
	it('shows the phone as confirmed and offers nothing else', () => {
		renderWithProviders(<PhoneVerification phone={PHONE} verified onVerified={vi.fn()} />);

		expect(screen.getByText(/telefone confirmado/i)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /confirmar por sms/i })).not.toBeInTheDocument();
	});

	it('does not offer to send a code to an invalid or empty phone', () => {
		renderWithProviders(<PhoneVerification phone="119" verified={false} onVerified={vi.fn()} />);

		expect(screen.getByRole('button', { name: /confirmar por sms/i })).toBeDisabled();
	});

	it('requests a code, then confirms it and reports the verified user', async () => {
		const verifiedUser = { id: 'u1', phone: PHONE, phone_verified_at: '2026-09-04T19:00:00.000Z' };
		const fetchMock = mockFetch([
			['/api/user/phone/request', () => jsonResponse({ success: true })],
			['/api/user/phone/confirm', () => jsonResponse({ success: true, user: verifiedUser })],
		]);
		const onVerified = vi.fn();
		const { user } = renderWithProviders(<PhoneVerification phone={PHONE} verified={false} onVerified={onVerified} />);

		await user.click(screen.getByRole('button', { name: /confirmar por sms/i }));

		await waitFor(() => expect(bodyOf(fetchMock, '/api/user/phone/request')).toEqual({ phone: PHONE }));
		const code = await screen.findByLabelText(/código recebido por sms/i);
		await user.type(code, '123456');
		await user.click(screen.getByRole('button', { name: /confirmar código/i }));

		await waitFor(() =>
			expect(bodyOf(fetchMock, '/api/user/phone/confirm')).toEqual({ phone: PHONE, token: '123456' }),
		);
		expect(onVerified).toHaveBeenCalledWith(verifiedUser);
	});

	it('finishes at once when the API already confirmed the phone (development shortcut)', async () => {
		const verifiedUser = { id: 'u1', phone: PHONE, phone_verified_at: '2026-09-04T20:00:00.000Z' };
		mockFetch([['/api/user/phone/request', () => jsonResponse({ success: true, verified: true, user: verifiedUser })]]);
		const onVerified = vi.fn();
		const { user } = renderWithProviders(<PhoneVerification phone={PHONE} verified={false} onVerified={onVerified} />);

		await user.click(screen.getByRole('button', { name: /confirmar por sms/i }));

		await waitFor(() => expect(onVerified).toHaveBeenCalledWith(verifiedUser));
		expect(screen.queryByLabelText(/código recebido por sms/i)).not.toBeInTheDocument();
	});

	it('shows a wrong code on the code field and keeps the form open', async () => {
		mockFetch([
			['/api/user/phone/request', () => jsonResponse({ success: true })],
			[
				'/api/user/phone/confirm',
				() => problemResponse(400, 'INVALID_PHONE_CODE', 'Código inválido ou expirado.', { field: 'token' }),
			],
		]);
		const { user } = renderWithProviders(<PhoneVerification phone={PHONE} verified={false} onVerified={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: /confirmar por sms/i }));
		await user.type(await screen.findByLabelText(/código recebido por sms/i), '000000');
		await user.click(screen.getByRole('button', { name: /confirmar código/i }));

		expect(await screen.findByText('Código inválido ou expirado.')).toBeInTheDocument();
		expect(screen.getByLabelText(/código recebido por sms/i)).toBeInTheDocument();
	});

	it('explains when the code could not be sent', async () => {
		mockFetch([
			[
				'/api/user/phone/request',
				() => problemResponse(429, 'PHONE_CODE_RATE_LIMITED', 'Aguarde um minuto antes de pedir outro código.'),
			],
		]);
		const { user } = renderWithProviders(<PhoneVerification phone={PHONE} verified={false} onVerified={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: /confirmar por sms/i }));

		expect(await screen.findByText('Aguarde um minuto antes de pedir outro código.')).toBeInTheDocument();
		expect(screen.queryByLabelText(/código recebido por sms/i)).not.toBeInTheDocument();
	});
});
