import { describe, expect, it, vi } from 'vitest';
import { EmailService, type EmailDeliveryRepository } from '../src/application/email/email-service.js';
import { partialMock } from './support/index.js';
function setup(status = 'pending') {
	const deliveries = partialMock<EmailDeliveryRepository>({
		claim: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 0, status, shouldSend: status === 'pending' }),
		markSent: vi.fn().mockResolvedValue({ status: 'sent' }),
		markFailed: vi.fn().mockResolvedValue(undefined),
	});
	const gateway = { send: vi.fn().mockResolvedValue({ messageId: 'message' }) };
	const branding = {
		load: vi.fn().mockResolvedValue({
			siteName: 'Flouvi',
			siteUrl: 'https://flouvi.example',
			logoUrl: null,
			accentColor: '#743BFF',
		}),
	};
	return {
		deliveries,
		gateway,
		branding,
		service: new EmailService(deliveries, gateway, 'Flouvi <hello@example.test>', branding, { render: vi.fn() }),
	};
}
const notice = { id: 'job-id', kind: 'welcome' as const, email: 'person@example.test', payload: {} };
describe('queued notification email', () => {
	it('uses a durable idempotency key and sends the brand template', async () => {
		const { service, deliveries, gateway } = setup();
		await service.sendNotification(notice);
		expect(deliveries.claim).toHaveBeenCalledWith(
			expect.objectContaining({ idempotencyKey: 'notification-job-id', recipient: notice.email }),
		);
		expect(gateway.send).toHaveBeenCalledWith(
			expect.objectContaining({ to: notice.email, subject: 'Sua conta está pronta' }),
		);
	});
	it('does not resend an already delivered message', async () => {
		const { service, gateway } = setup('sent');
		expect(await service.sendNotification(notice)).toMatchObject({ status: 'sent' });
		expect(gateway.send).not.toHaveBeenCalled();
	});
	it('retries a still leased delivery instead of treating it as sent', async () => {
		const { service, gateway } = setup('sending');
		await expect(service.sendNotification(notice)).rejects.toThrow();
		expect(gateway.send).not.toHaveBeenCalled();
	});
	it('redacts provider failures and releases failed rendering attempts for retry', async () => {
		const { service, deliveries, branding } = setup();
		branding.load.mockRejectedValue(new Error('sensitive error'));
		await expect(service.sendNotification(notice)).rejects.toThrow();
		expect(deliveries.markFailed).toHaveBeenCalledWith('delivery', 1, 'Não foi possível preparar a notificação.');
	});
});
