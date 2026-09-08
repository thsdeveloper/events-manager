'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PUBLIC_FEES, type PublicFeeTable } from '@/lib/fees';

async function fetchPublicFees(): Promise<PublicFeeTable> {
	const response = await fetch('/api/content/fees');
	if (!response.ok) throw new Error('Não foi possível carregar as taxas da plataforma.');
	const table = (await response.json()) as Partial<PublicFeeTable>;
	const numeric = (key: keyof PublicFeeTable) => Number(table[key] ?? DEFAULT_PUBLIC_FEES[key]);

	return {
		platform_fee_percentage: numeric('platform_fee_percentage'),
		pix_fee_fixed: numeric('pix_fee_fixed'),
		card_fee_percentage: numeric('card_fee_percentage'),
		card_fee_fixed: numeric('card_fee_fixed'),
		card_installment_2_6_percentage: numeric('card_installment_2_6_percentage'),
		card_installment_7_12_percentage: numeric('card_installment_7_12_percentage'),
		boleto_fee_fixed: numeric('boleto_fee_fixed'),
		payout_fee_fixed: numeric('payout_fee_fixed'),
		minimum_payout: numeric('minimum_payout'),
		convenience_fee_calculation_method:
			table.convenience_fee_calculation_method === 'organizer_absorbs' ? 'organizer_absorbs' : 'buyer_pays',
	};
}

/**
 * Tabela de taxas divulgada pela plataforma, sem sessão. Um erro cai nos
 * valores publicados e é sinalizado, para a página avisar que é estimativa.
 */
export function usePublicFees() {
	const { data, isPending, isError } = useQuery({
		queryKey: ['public-fees'],
		queryFn: fetchPublicFees,
		staleTime: 10 * 60 * 1000,
		retry: 1,
	});

	return { fees: data ?? DEFAULT_PUBLIC_FEES, isLoading: isPending, isFallback: isError };
}
