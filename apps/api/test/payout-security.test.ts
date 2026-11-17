import { describe, expect, it, vi } from 'vitest';
import { SuperAdminService, type SuperAdminRepository } from '../src/application/super-admin/super-admin-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import { partialMock } from './support/index.js';

function setup() {
	let available = 100;
	const repository = partialMock<SuperAdminRepository>({
		getOrganizer: vi.fn().mockResolvedValue({
			name: 'Organizador',
			payout_pix_key: 'owner@example.com',
			payout_pix_key_type: 'EMAIL',
			payout_status: 'enabled',
		}),
		getConfiguration: vi.fn().mockResolvedValue({ payouts_enabled: true, minimum_payout: 1, payout_fee_fixed: 0.8 }),
		getAvailableBalance: vi.fn(async () => available),
		createPayout: vi.fn(async () => {
			available = 0;
			return { id: 'reserved-payout', net_amount: 99.2 };
		}),
		finishPayout: vi.fn(async () => ({ id: 'reserved-payout', status: 'completed' })),
		failPayout: vi.fn(async () => {
			available = 100;
		}),
		recordAudit: vi.fn().mockResolvedValue(undefined),
	});
	const gateway = partialMock<PaymentGateway>({
		provider: 'abacatepay',
		sendPix: vi
			.fn()
			.mockResolvedValue({ id: 'provider-transfer', status: 'COMPLETE', providerFeeInCents: 80, receiptUrl: null }),
	});
	const service = new SuperAdminService(repository, gateway);
	const create = () => service.createPayout('super-admin', 'organizer', 100, { ip: '127.0.0.1', userAgent: null });
	return { repository, gateway, create };
}

describe('payout reservation after uncertain provider outcomes', () => {
	it.each(['timeout', 'persistence', 'audit'] as const)(
		'does not release funds or allow another transfer after %s failure',
		async (failure) => {
			const { repository, gateway, create } = setup();
			if (failure === 'timeout') vi.mocked(gateway.sendPix).mockRejectedValue(new Error('timeout after dispatch'));
			if (failure === 'persistence')
				vi.mocked(repository.finishPayout).mockRejectedValue(new Error('database unavailable'));
			if (failure === 'audit') vi.mocked(repository.recordAudit).mockRejectedValue(new Error('audit unavailable'));
			await expect(create()).rejects.toMatchObject({
				code: 'PAYOUT_RECONCILIATION_REQUIRED',
				context: { payoutId: 'reserved-payout' },
			});
			expect(repository.failPayout).not.toHaveBeenCalled();
			await expect(create()).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
			expect(gateway.sendPix).toHaveBeenCalledOnce();
		},
	);
	it('completes and audits a confirmed transfer', async () => {
		const { repository, gateway, create } = setup();
		await expect(create()).resolves.toMatchObject({ success: true, payout: { status: 'completed' } });
		expect(gateway.sendPix).toHaveBeenCalledWith(
			expect.objectContaining({ externalId: 'reserved-payout', amountInCents: 9920 }),
		);
		expect(repository.recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ actorId: 'super-admin', action: 'payout.created' }),
		);
	});
});
