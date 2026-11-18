import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { renderWithProviders } from '@/test';
import PaymentAccountStatus from './PaymentAccountStatus';
describe('receiving settings entry point', () => {
	it.each(['not_configured', 'pending_review', 'enabled', 'blocked'])(
		'links the dedicated secure page for %s',
		(status) => {
			renderWithProviders(
				<PaymentAccountStatus organizer={{ payout_status: status } as OrganizerProfile} payoutSummary={null} />,
			);
			expect(screen.getByRole('link', { name: /recebimento/i })).toHaveAttribute(
				'href',
				'/admin/financeiro/recebimento',
			);
		},
	);
});
