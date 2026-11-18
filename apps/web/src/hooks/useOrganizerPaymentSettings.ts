'use client';

import type { OrganizerPaymentSettingsResponse } from '@events-manager/contracts';
import { useQuery } from '@tanstack/react-query';

export const ORGANIZER_PAYMENT_SETTINGS_KEY = ['organizer-payment-settings'] as const;
/** The admin QueryClient is remounted for each user/organization by AdminEventScope. */
export function useOrganizerPaymentSettings() {
	return useQuery({
		queryKey: ORGANIZER_PAYMENT_SETTINGS_KEY,
		queryFn: async ({ signal }): Promise<OrganizerPaymentSettingsResponse> => {
			const response = await fetch('/api/organizer/payment-settings', { signal });
			if (!response.ok) throw new Error('Não foi possível carregar as formas de pagamento.');

			return response.json();
		},
		staleTime: 60_000,
		retry: false,
	});
}
