'use client';

import { useCallback, useState } from 'react';
import type { AppliedCoupon } from '@events-manager/contracts';

export interface CartItem {
	quantity: number;
	ticketId: string;
}

/**
 * Confere um cupom na API. O desconto exibido é sempre o que o servidor
 * devolveu — calcular aqui daria um número que a cobrança não honraria.
 */
export function useCoupon(eventId: string) {
	const [applied, setApplied] = useState<AppliedCoupon | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isApplying, setIsApplying] = useState(false);

	const apply = useCallback(
		async (code: string, items: CartItem[]) => {
			// O desconto depende do carrinho: sem ingresso não há o que calcular,
			// e o servidor recusaria com uma mensagem técnica sobre o array vazio.
			if (items.length === 0) {
				setApplied(null);
				setError('Escolha ao menos um ingresso antes de aplicar o cupom.');

				return null;
			}
			setIsApplying(true);
			setError(null);
			try {
				const response = await fetch(`/api/events/${eventId}/coupons/apply`, {
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code, items }),
				});
				const payload = await response.json();
				if (!response.ok) {
					setApplied(null);
					setError(payload.detail ?? 'Não foi possível aplicar este cupom.');

					return null;
				}
				setApplied(payload as AppliedCoupon);

				return payload as AppliedCoupon;
			} catch {
				setApplied(null);
				setError('Não foi possível falar com o servidor. Tente de novo.');

				return null;
			} finally {
				setIsApplying(false);
			}
		},
		[eventId],
	);

	const clear = useCallback(() => {
		setApplied(null);
		setError(null);
	}, []);

	return { apply, applied, clear, error, isApplying };
}
