import { describe, expect, it, vi } from 'vitest';
import {
	EmailService,
	type EmailDeliveryRepository,
	type EmailGateway,
} from '../src/application/email/email-service.js';
import { partialMock } from './support/index.js';
const url = 'https://flouvi.example/convites/aceitar#token=secret-fragment';
function fixture(shouldSend = true) {
	const deliveries = partialMock<EmailDeliveryRepository>({
		claim: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 0, status: 'sending', shouldSend }),
		markSent: vi.fn().mockResolvedValue({ id: 'delivery', status: 'sent' }),
		markFailed: vi.fn().mockResolvedValue(undefined),
	});
	const gateway: EmailGateway = { send: vi.fn().mockResolvedValue({ messageId: 'sent' }) };
	const service = new EmailService(deliveries, gateway, 'Flouvi <suporte@example.test>', {
		load: async () => ({
			accentColor: '#6644ff',
			logoUrl: null,
			siteName: 'Flouvi',
			siteUrl: 'https://flouvi.example',
			supportEmail: null,
			tagline: null,
		}),
	});
	return { deliveries, gateway, service };
}
const notice = { id: 'invite', email: 'guest@example.test', url, expiresAt: '2026-12-01' };
describe('team invitation email', () => {
	it('renders the single-use link and expiry while keeping tokens out of delivery records', async () => {
		const { deliveries, gateway, service } = fixture();
		await service.sendTeamInvitation(notice, 'idempotency');
		expect(gateway.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: notice.email,
				html: expect.stringContaining(url),
				text: expect.stringContaining('7 dias'),
			}),
		);
		expect(JSON.stringify(vi.mocked(deliveries.claim).mock.calls)).not.toContain('secret-fragment');
		expect(deliveries.markSent).toHaveBeenCalledWith('delivery', 1, 'sent');
	});
	it('does not send an already claimed delivery twice', async () => {
		const { gateway, service } = fixture(false);
		await service.sendTeamInvitation(notice, 'idempotency');
		expect(gateway.send).not.toHaveBeenCalled();
	});
	it('does not persist a provider error that echoes the sensitive invitation link', async () => {
		const { deliveries, gateway, service } = fixture();
		vi.mocked(gateway.send).mockRejectedValue(new Error('SMTP failed: ' + url));
		await expect(service.sendTeamInvitation(notice, 'idempotency')).rejects.toThrow();
		expect(JSON.stringify(vi.mocked(deliveries.markFailed).mock.calls)).not.toContain('secret-fragment');
		expect(deliveries.markFailed).toHaveBeenCalled();
	});
});
