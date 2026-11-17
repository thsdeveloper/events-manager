'use client';

import { useQuery } from '@tanstack/react-query';

export type PaymentMethod = 'PIX' | 'CARD';

const FALLBACK_METHODS: PaymentMethod[] = ['PIX'];

async function fetchPaymentMethods(signal: AbortSignal): Promise<PaymentMethod[]> {
	const response = await fetch('/api/payments/methods', { signal });
	if (!response.ok) throw new Error('Não foi possível carregar as formas de pagamento.');
	const body = (await response.json()) as { methods?: unknown };
	const methods = Array.isArray(body.methods)
		? body.methods.filter((method): method is PaymentMethod => method === 'PIX' || method === 'CARD')
		: [];

	return methods.length > 0 ? methods : FALLBACK_METHODS;
}

/** The provider defines the methods available at checkout. A failed lookup offers only Pix. */
export function usePaymentMethods() {
	const query = useQuery({
		queryKey: ['public', 'payment-methods'],
		queryFn: ({ signal }) => fetchPaymentMethods(signal),
		staleTime: 60_000,
		retry: false,
	});

	return { methods: query.data ?? FALLBACK_METHODS, isLoading: query.isPending };
}
