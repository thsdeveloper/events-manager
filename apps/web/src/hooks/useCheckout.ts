import { useState } from 'react';
import type { PaymentMethod } from '@/features/checkout/api/usePaymentMethods';
import { describeProblem } from '@/lib/problem';

interface TicketItem {
	ticketId: string;
	quantity: number;
	/** Um participante por unidade; `null` fica pendente. Sem a lista, a primeira unidade é de quem compra. */
	attendees?: Array<{ name: string; email: string; phone?: string; document?: string } | null>;
}

interface ParticipantInfo {
	name: string;
	email: string;
	phone?: string;
	document?: string;
}

interface CheckoutOptions {
	eventId: string;
	userId?: string;
}

interface CheckoutResponse {
	checkoutId: string;
	url: string;
	registrationId: string;
}

export function useCheckout({ eventId, userId }: CheckoutOptions) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createCheckoutSession = async (
		tickets: TicketItem[],
		participantInfo: ParticipantInfo,
		couponCode?: string,
		paymentMethod: PaymentMethod = 'PIX',
	) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/api/payments/checkout', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					eventId,
					tickets,
					participantInfo,
					userId,
					// O servidor confere se a loja aceita o método e envia só ele ao provedor.
					paymentMethod,
					// O servidor reconfere o cupom e recalcula o total: aqui ele viaja
					// apenas como código, nunca como valor de desconto.
					...(couponCode ? { couponCode } : {}),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(describeProblem(data, 'Erro ao criar sessão de checkout'));
			}

			// Redirecionar para o checkout hospedado ou para a confirmação local.
			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error('URL de checkout não retornada');
			}

			return data as CheckoutResponse;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
			setError(errorMessage);
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		createCheckoutSession,
		isLoading,
		error,
	};
}
