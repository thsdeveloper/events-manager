import { describe, it, expect, vi } from 'vitest';
import { ManualPayoutService, type ManualPayoutRepository } from '../src/application/payouts/manual-payout-service.js';
import { partialMock } from './support/index.js';
const file = { filename: 'receipt.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-test') };
const payout = {
	id: 'payout',
	organizer_id: 'org',
	provider: 'manual',
	status: 'pending',
	receipt_document_id: 'receipt',
};
const receipt = {
	id: 'receipt',
	payout_id: 'payout',
	filename: 'receipt.pdf',
	mime_type: 'application/pdf',
	storage_path: 'private/receipt',
};
function setup() {
	const repo = partialMock<ManualPayoutRepository>({
		payout: vi.fn().mockResolvedValue(payout),
		storeReceipt: vi.fn().mockResolvedValue({ id: 'receipt', filename: 'receipt.pdf' }),
		receipt: vi.fn().mockResolvedValue(receipt),
		download: vi.fn().mockResolvedValue(file.buffer),
		list: vi.fn().mockResolvedValue({ data: [payout], total: 23 }),
	});
	return { repo, service: new ManualPayoutService(repo) };
}
describe('private manual payout receipt handling', () => {
	it('accepts a genuine receipt for a pending manual transfer', async () => {
		const { repo, service } = setup();
		await expect(service.upload('payout', 'reviewer', file)).resolves.toMatchObject({ id: 'receipt' });
		expect(repo.storeReceipt).toHaveBeenCalledWith(
			expect.objectContaining({ payoutId: 'payout', actor: 'reviewer', buffer: file.buffer }),
		);
	});
	it.each([null, { ...payout, provider: 'abacatepay' }, { ...payout, status: 'completed' }])(
		'rejects uploads for an ineligible payout',
		async (value) => {
			const { repo, service } = setup();
			vi.mocked(repo.payout).mockResolvedValue(value);
			await expect(service.upload('payout', 'reviewer', file)).rejects.toMatchObject({ code: 'MANUAL_PAYOUT_CHANGED' });
			expect(repo.storeReceipt).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ ...file, mimetype: 'text/html' },
		{ ...file, buffer: Buffer.from('<script>') },
		{ ...file, buffer: Buffer.concat([file.buffer, Buffer.alloc(10 * 1024 * 1024)]) },
	])('rejects invalid or oversized receipts', async (input) => {
		const { repo, service } = setup();
		await expect(service.upload('payout', 'reviewer', input)).rejects.toBeDefined();
		expect(repo.storeReceipt).not.toHaveBeenCalled();
	});
	it.each([null, { ...payout, organizer_id: 'other-org' }, { ...payout, receipt_document_id: null }])(
		'does not download receipts for an unrelated or incomplete payout',
		async (value) => {
			const { repo, service } = setup();
			vi.mocked(repo.payout).mockResolvedValue(value);
			await expect(service.download('org', 'payout')).rejects.toMatchObject({ code: 'RECEIPT_NOT_FOUND' });
			expect(repo.download).not.toHaveBeenCalled();
		},
	);
	it.each([null, { ...receipt, payout_id: 'other-payout' }])(
		'requires the receipt to belong to the requested payout',
		async (value) => {
			const { repo, service } = setup();
			vi.mocked(repo.receipt).mockResolvedValue(value);
			await expect(service.download('org', 'payout')).rejects.toMatchObject({ code: 'RECEIPT_NOT_FOUND' });
			expect(repo.download).not.toHaveBeenCalled();
		},
	);
	it('returns the private receipt only after checking payout ownership', async () => {
		const { service } = setup();
		await expect(service.download('org', 'payout')).resolves.toEqual({ receipt, buffer: file.buffer });
	});
	it('paginates manual transfer history', async () => {
		const { service } = setup();
		expect(await service.list('org', 2, 10)).toMatchObject({ pagination: { page: 2, total: 23, pageCount: 3 } });
	});
});
