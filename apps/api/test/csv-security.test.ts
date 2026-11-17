import { describe, expect, it, vi } from 'vitest';
import type { NominalTicket } from '@events-manager/contracts';
import { AdminService, type AdminRepository } from '../src/application/admin/admin-service.js';
import { FinanceService, type FinanceRepository } from '../src/application/finance/finance-service.js';
import { partialMock } from './support/index.js';

describe('CSV spreadsheet injection protection', () => {
	it.each(['=HYPERLINK("https://evil.example")', '+SUM(1,1)', '-SUM(1,1)', '@SUM(1,1)', ' \t=1+1', '\r=1+1', '\t123'])(
		'exports untrusted %j as literal text in both downloads',
		async (value) => {
			const admin = new AdminService(
				partialMock<AdminRepository>({
					listOwnedEventIds: vi.fn().mockResolvedValue(['event']),
					listParticipantTickets: vi.fn().mockResolvedValue({
						data: [{ attendee_name: value, registration: {}, event: {}, ticket_type: null } as NominalTicket],
					}),
				}),
			);
			const finance = new FinanceService(
				partialMock<FinanceRepository>({
					listRegistrations: vi.fn().mockResolvedValue([{ id: 'registration', participant_name: value }]),
				}),
				'mock',
			);
			for (const csv of [await admin.exportParticipants('owner'), await finance.exportCsv('owner')]) {
				expect(csv).toContain(`"'${value.replaceAll('"', '""')}"`);
			}
		},
	);

	it('preserves accents, quotes, commas and numeric amounts in safe CSV data', async () => {
		const finance = new FinanceService(
			partialMock<FinanceRepository>({
				listRegistrations: vi
					.fn()
					.mockResolvedValue([{ id: 'r', participant_name: 'João, "Silva"', total_amount: 12.5, payment_amount: 0 }]),
			}),
			'mock',
		);
		const csv = await finance.exportCsv('owner');
		expect(csv).toContain('"João, ""Silva"""');
		expect(csv).toContain('"12.5"');
	});
});
