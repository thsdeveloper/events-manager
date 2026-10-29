'use client';

import { useEffect, useState } from 'react';

export type PaymentMethod = 'PIX' | 'CARD';

const FALLBACK_METHODS: PaymentMethod[] = ['PIX'];

async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
	const response = await fetch('/api/payments/methods');
	if (!response.ok) throw new Error('Não foi possível carregar as formas de pagamento.');
	const body = (await response.json()) as { methods?: unknown };
	const methods = Array.isArray(body.methods)
		? body.methods.filter((method): method is PaymentMethod => method === 'PIX' || method === 'CARD')
		: [];

	return methods.length > 0 ? methods : FALLBACK_METHODS;
}

/**
 * A loja no provedor decide o que aceita, e pedir um método desabilitado derruba
 * o checkout inteiro. Sem resposta da API, só Pix, que toda loja tem: melhor
 * esconder o cartão do que prometer e falhar na hora de pagar.
 *
 * Usa `fetch` direto, como os outros hooks do checkout público: essa página não
 * está sob o `QueryClientProvider`, que só envolve a área administrativa.
 */
export function usePaymentMethods() {
	const [methods, setMethods] = useState<PaymentMethod[]>(FALLBACK_METHODS);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				const loaded = await fetchPaymentMethods();
				if (active) setMethods(loaded);
			} catch {
				if (active) setMethods(FALLBACK_METHODS);
			} finally {
				if (active) setIsLoading(false);
			}
		};
		void load();

		return () => {
			active = false;
		};
	}, []);

	return { methods, isLoading };
}
