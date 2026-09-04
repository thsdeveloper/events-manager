'use client';

import { useQuery } from '@tanstack/react-query';
import type { FeeConfig } from '@/lib/fees';

const FALLBACK_FEE_CONFIG: FeeConfig = {
	platformFeePercentage: 5,
	providerPercentageFee: 3.5,
	providerFixedFee: 0.6,
};

async function fetchFeeConfig(): Promise<FeeConfig> {
	const response = await fetch('/api/admin/event-configurations', { credentials: 'include' });
	if (!response.ok) throw new Error('Não foi possível carregar as taxas da plataforma.');
	const config = await response.json();

	return {
		platformFeePercentage: Number(config?.platform_fee_percentage ?? FALLBACK_FEE_CONFIG.platformFeePercentage),
		providerPercentageFee: Number(config?.card_fee_percentage ?? FALLBACK_FEE_CONFIG.providerPercentageFee),
		providerFixedFee: Number(config?.card_fee_fixed ?? FALLBACK_FEE_CONFIG.providerFixedFee),
	};
}

/**
 * Platform fees change rarely and every ticket form needs them, so they are
 * fetched once and shared. The previous modal refetched on every open.
 *
 * A failed request falls back to the published defaults rather than blocking the
 * form: the values only drive an on-screen estimate, and the API recomputes
 * `buyer_price` server-side when the ticket is saved.
 */
export function useFeeConfig() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['event-fee-config'],
		queryFn: fetchFeeConfig,
		staleTime: 10 * 60 * 1000,
		retry: 1,
	});

	return { feeConfig: data ?? FALLBACK_FEE_CONFIG, isLoading: isPending, isFallback: isError };
}
