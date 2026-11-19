import { describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { createNotificationProcessor } from '../src/infrastructure/email/create-notification-processor.js';
import { createSupabaseClientsStub, createTestEnv } from './support/index.js';

describe('notification composition', () => {
	it.each([true, false])('honors current consent (%s) before delivering current sale information', async (allowed) => {
		// This transport serializes MIME in memory; no mail leaves the test process.
		const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
		vi.spyOn(nodemailer, 'createTransport').mockReturnValue(transport);
		const send = vi.spyOn(transport, 'sendMail');
		const { clients, rpc } = createSupabaseClientsStub({
			tables: { email_deliveries: { data: { id: 'delivery', status: 'sent', attempts: 1 } } },
		});
		rpc.mockImplementation(async (name) => ({
			error: null,
			data:
				{
					schedule_email_notifications: null,
					claim_email_notifications: [
						{
							id: 'job',
							kind: 'organization_sale',
							user_id: 'buyer',
							organizer_id: 'org',
							attempts: 1,
							lease_token: 'lease',
							payload: { title: 'Old title', amount: 1 },
						},
					],
					email_notification_recipient: {
						email: 'current@example.test',
						verified: true,
						active: true,
						eligible: true,
						userSettings: {},
						organizationSettings: { sales: allowed },
						details: { title: 'Current title', amount: 150, quantity: 2 },
					},
					claim_email_delivery: { id: 'delivery', attempts: 0, shouldSend: true, status: 'pending' },
					finish_email_notification: true,
				}[name] ?? null,
		}));
		const processor = createNotificationProcessor(createTestEnv(), clients);
		expect(await processor.run()).toEqual({ sent: allowed ? 1 : 0, suppressed: allowed ? 0 : 1, failed: 0 });
		if (allowed) {
			expect(send).toHaveBeenCalledWith(
				expect.objectContaining({ to: 'current@example.test', text: expect.stringContaining('Current title') }),
			);
			expect(send.mock.calls[0][0].text).toMatch(/R\$\s?150,00/);
		} else expect(send).not.toHaveBeenCalled();
	});
});
