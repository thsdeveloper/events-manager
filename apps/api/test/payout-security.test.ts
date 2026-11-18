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
			return {
				id: 'reserved-payout',
				amount: 100,
				net_amount: 99.2,
				pix_key: 'owner@example.com',
				pix_key_type: 'EMAIL',
				method: 'pix',
			};
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
			expect.objectContaining({ externalId: 'reserved-payout', amountInCents: 10000 }),
		);
		expect(repository.recordAudit).toHaveBeenCalledWith(
			expect.objectContaining({ actorId: 'super-admin', action: 'payout.created' }),
		);
	});
});

it('sends PIX to the approved destination captured when funds were reserved, even if the preflight data was stale', async () => {
	const { repository, gateway, create } = setup();
	vi.mocked(repository.createPayout).mockResolvedValue({
		id: 'reserved-payout',
		net_amount: 99.2,
		method: 'pix',
		pix_key: 'reviewed@example.com',
		pix_key_type: 'EMAIL',
	});
	await create();
	expect(gateway.sendPix).toHaveBeenCalledWith(expect.objectContaining({ pixKey: 'reviewed@example.com' }));
});
it('reserves an approved bank transfer for manual execution without dispatching PIX or marking it completed', async () => {
	const { repository, gateway, create } = setup();
	vi.mocked(repository.getOrganizer).mockResolvedValue({
		name: 'Organizador',
		receiving_method: 'bank_transfer',
		payout_status: 'enabled',
	});
	vi.mocked(repository.createPayout).mockResolvedValue({
		id: 'reserved-payout',
		net_amount: 100,
		method: 'bank_transfer',
		status: 'pending',
	});
	await expect(create()).resolves.toMatchObject({ success: true, payout: { status: 'pending' } });
	expect(gateway.sendPix).not.toHaveBeenCalled();
	expect(repository.finishPayout).not.toHaveBeenCalled();
	expect(repository.createPayout).toHaveBeenCalledWith(expect.objectContaining({ provider: 'manual', providerFee: 0 }));
});

it.each([0, 250])('records the actual gateway withdrawal fee %i and the exact net received', async (fee) => {
	const { repository, gateway, create } = setup();
	vi.mocked(gateway.sendPix).mockResolvedValue({
		id: 'provider-transfer',
		status: 'COMPLETE',
		providerFeeInCents: fee,
		receiptUrl: null,
	});
	await create();
	expect(repository.finishPayout).toHaveBeenCalledWith(
		'reserved-payout',
		expect.objectContaining({ provider_fee: fee / 100, net_amount: 100 - fee / 100 }),
	);
});
