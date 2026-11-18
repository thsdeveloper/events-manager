import { describe, expect, it, vi } from 'vitest';
import {
	OrganizerSupportService,
	type OrganizerSupportRepository,
} from '../src/application/super-admin/organizer-support-service.js';
import type { OrganizerAdminUpdate } from '@events-manager/contracts';
import { partialMock } from './support/index.js';
describe('organizer support cannot set financial destinations', () => {
	it.each([
		{ payout_pix_key: 'a@example.com', payout_pix_key_type: 'EMAIL' },
		{ payout_status: 'enabled', reviewed_pix_key: 'a@example.com' },
		{ bank_account: { account_number: '1234' } },
	])('rejects financial edits outside owner submission: %j', async (input) => {
		const repository = partialMock<OrganizerSupportRepository>({
			update: vi.fn(),
			detail: vi
				.fn()
				.mockResolvedValue({
					organizer: { status: 'active', payout_pix_key: 'a@example.com', payout_pix_key_type: 'EMAIL' },
				}),
		});
		await expect(
			new OrganizerSupportService(repository).update(
				'org',
				'actor',
				{ ...input, reason: 'Conferido pelo suporte' } as OrganizerAdminUpdate,
				{ ip: '127.0.0.1', userAgent: null },
			),
		).rejects.toBeDefined();
		expect(repository.update).not.toHaveBeenCalled();
	});
	it('keeps contact corrections with a reason', async () => {
		const repository = partialMock<OrganizerSupportRepository>({
			update: vi.fn().mockResolvedValue({ name: 'Nome corrigido' }),
		});
		await expect(
			new OrganizerSupportService(repository).update(
				'org',
				'actor',
				{ name: 'Nome corrigido', reason: 'Solicitação do titular' },
				{ ip: '127.0.0.1', userAgent: null },
			),
		).resolves.toMatchObject({ success: true });
	});
});
