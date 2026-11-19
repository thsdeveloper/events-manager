import { describe, it, expect } from 'vitest';
import { platformPermissionDefinitions, type PlatformAccess } from '@events-manager/contracts';
import { presentPlatformData } from '../src/application/iam/platform-data.js';
const access: PlatformAccess = { userId: 'u', active: true, isRoot: false, permissions: ['platform_organizers.read'] };
describe('platform data minimization', () => {
	it('excludes financial and receiving fields from organizer support and nested audit snapshots', () => {
		const data = {
			organizer: {
				id: 'o',
				name: 'Organization',
				payout_pix_key: 'private',
				bank_account: '123',
				receiving_method: 'pix',
			},
			metrics: { events: 2, grossRevenue: 200, availableBalance: 100 },
			data: [
				{
					after_data: { amount: 100, pix_key: 'private', status: 'active', account_snapshot: { account: 'secret' } },
					reason: 'Support',
				},
			],
		};
		const result = presentPlatformData(access, data);
		expect(JSON.stringify(result)).not.toContain('private');
		expect(JSON.stringify(result)).not.toContain('secret');
		expect(result).toEqual({
			organizer: { id: 'o', name: 'Organization', receiving_method: 'pix' },
			metrics: { events: 2 },
			data: [{ after_data: { status: 'active' }, reason: 'Support' }],
		});
		expect(data.metrics.availableBalance).toBe(100);
	});
	it('financial read alone does not expose receiving credentials', () => {
		expect(
			presentPlatformData(
				{ ...access, permissions: ['platform_finance.read'] },
				{ amount: 50, pix_key: 'secret', bank_code: '001' },
			),
		).toEqual({ amount: 50 });
	});
	it('preserves all authorized data for root administrators', () => {
		const data = { amount: 50, pix_key: 'key', bank_code: '001' };
		expect(
			presentPlatformData(
				{ ...access, isRoot: true, permissions: platformPermissionDefinitions.map((p) => p.key) },
				data,
			),
		).toEqual(data);
	});
});
