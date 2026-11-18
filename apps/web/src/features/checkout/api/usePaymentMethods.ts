'use client';

import { useQuery } from '@tanstack/react-query';

export type PaymentMethod = 'PIX' | 'CARD' | 'BOLETO';

const FALLBACK_METHODS: PaymentMethod[] = ['PIX'];

async function fetchPaymentMethods(signal: AbortSignal, eventId?: string): Promise<PaymentMethod[]> {
	const response = await fetch(
		eventId ? `/api/payments/methods?eventId=${encodeURIComponent(eventId)}` : '/api/payments/methods',
		{ signal },
	);
	if (!response.ok) throw new Error('Não foi possível carregar as formas de pagamento.');
	const body = (await response.json()) as { methods?: unknown };
	const methods = Array.isArray(body.methods)
		? body.methods.filter(
				(method): method is PaymentMethod => method === 'PIX' || method === 'CARD' || method === 'BOLETO',
			)
		: [];

	return eventId ? methods : methods.length > 0 ? methods : FALLBACK_METHODS;
}

/** Event checkout preserves empty availability and never enables a method after a failed lookup. */
export function usePaymentMethods(eventId?: string) {
	const query = useQuery({
		queryKey: ['public', 'payment-methods', eventId ?? 'store'],
		queryFn: ({ signal }) => fetchPaymentMethods(signal, eventId),
		staleTime: 60_000,
		retry: false,
	});

	return { methods: query.data ?? (eventId ? [] : FALLBACK_METHODS), isLoading: query.isPending };
}
