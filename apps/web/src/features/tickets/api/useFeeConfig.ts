'use client';

import { DEFAULT_ORGANIZER_PAYMENTS, quoteGatewayFee, readGatewayFees } from '@events-manager/contracts';
import { useMemo } from 'react';
import { usePublicFees } from '@/hooks/usePublicFees';
import { useOrganizerPaymentSettings } from '@/hooks/useOrganizerPaymentSettings';

/** Both the compact summary and detailed simulation use the organization's saved preferences. */
export function useFeeConfig() {
	const { fees, isLoading, isFallback } = usePublicFees();
	const preferences = useOrganizerPaymentSettings();
	const settings = preferences.data?.settings ?? DEFAULT_ORGANIZER_PAYMENTS;
	const method = settings.accepted_payment_methods.includes('PIX') ? 'PIX' : settings.accepted_payment_methods[0];
	const feeConfig = useMemo(() => {
		const quote = quoteGatewayFee(
			100,
			method === 'CARD' ? 'card' : method === 'BOLETO' ? 'boleto' : method === 'DEBIT' ? 'debit' : 'pix',
			readGatewayFees({ ...fees }),
			1,
			settings.credit_card_settlement_period ?? 'D+1',
		);

		return {
			platformFeePercentage: fees.platform_fee_percentage,
			platformFeeMinimum: fees.platform_fee_minimum ?? 0,
			providerPercentageFee: quote.percentage,
			providerFixedFee: quote.fixed,
		};
	}, [fees, method, settings.credit_card_settlement_period]);
	const paymentSettings = preferences.data ?? {
		settings: DEFAULT_ORGANIZER_PAYMENTS,
		available_methods: ['PIX'] as const,
		pending_methods: [],
		gateway_card_settlement_period: 'D+1' as const,
	};

	return {
		feeConfig,
		feeTable: fees,
		paymentSettings: { ...paymentSettings, available_methods: [...paymentSettings.available_methods] },
		isLoading: isLoading || preferences.isPending,
		isFallback: isFallback || preferences.isError,
	};
}
