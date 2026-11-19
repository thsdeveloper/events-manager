'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckoutQuoteInput, TransparentCheckoutResult } from '@events-manager/contracts';
import type { PaymentMethod } from '@/features/checkout/api/usePaymentMethods';
import { describeProblem } from '@/lib/problem';
export type CheckoutPaymentOptions = { expectedAmountInCents: number; installments?: number; token?: string };
const terminal = new Set(['confirmed', 'failed', 'cancelled', 'refunded']);
export function useCheckout({ eventId, userId }: { eventId: string; userId?: string }) {
	const storageKey = `checkout-attempt:${userId ?? 'session'}:${eventId}`;
	const [attemptId, setAttemptId] = useState<string | null>(null);
	const [local, setLocal] = useState<TransparentCheckoutResult | null>(null);
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [restored, setRestored] = useState(false);
	const locked = useRef(false);
	const currentId = useRef<string | null>(null);
	const client = useQueryClient();
	useEffect(() => {
		currentId.current = null;
		setAttemptId(null);
		setLocal(null);
		setError(null);
		setRestored(false);
		try {
			const id = sessionStorage.getItem(storageKey);
			if (id && /^[0-9a-f-]{36}$/i.test(id)) {
				currentId.current = id;
				setAttemptId(id);
				setRestored(true);
				setLocal({ attemptId: id, status: 'processing', payment: null });
			}
		} catch {
			/* Browser storage can be unavailable; the current page keeps the attempt. */
		}
	}, [storageKey]);
	const query = useQuery({
		queryKey: ['checkout-attempt', userId, attemptId],
		enabled: Boolean(attemptId),
		retry: false,
		queryFn: async ({ signal }): Promise<TransparentCheckoutResult> => {
			const response = await fetch(`/api/payments/attempts/${attemptId}`, { signal });
			if (!response.ok) throw new Error('Não foi possível atualizar a confirmação. Tente verificar novamente.');

			return response.json();
		},
		refetchInterval: (query) => (terminal.has(query.state.data?.status ?? '') ? false : 4000),
	});
	const current = query.data ?? local;
	useEffect(() => {
		// A recovered payment still pending now belongs to this visit: celebrate when it completes.
		if (restored && query.isFetchedAfterMount && query.data && query.data.status !== 'confirmed') setRestored(false);
	}, [restored, query.isFetchedAfterMount, query.data]);
	// Keep this visit's success visible, but never reopen a completed purchase on a later visit.
	const attempt = restored && current?.status === 'confirmed' ? null : current;
	useEffect(() => {
		if (current?.status !== 'confirmed') return;
		try {
			if (sessionStorage.getItem(storageKey) === current.attemptId) sessionStorage.removeItem(storageKey);
		} catch {
			/* The next visit will verify and discard this completed attempt again. */
		}
		if (restored) {
			currentId.current = null;
			setAttemptId(null);
			setLocal(null);
			setError(null);
			setRestored(false);
		}
	}, [current?.status, current?.attemptId, restored, storageKey]);
	async function createCheckoutSession(
		tickets: CheckoutQuoteInput['tickets'],
		participantInfo: CheckoutQuoteInput['participantInfo'],
		couponCode?: string,
		paymentMethod: PaymentMethod = 'PIX',
		options?: CheckoutPaymentOptions,
	) {
		if (locked.current || (currentId.current && attempt && !terminal.has(attempt.status))) return attempt;
		locked.current = true;
		setLoading(true);
		setError(null);
		const id = crypto.randomUUID();
		setRestored(false);
		currentId.current = id;
		try {
			sessionStorage.setItem(storageKey, id);
		} catch {
			/* Browser storage can be unavailable; the current page keeps the attempt. */
		}
		try {
			const response = await fetch('/api/payments/checkout', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventId,
					tickets,
					participantInfo: {
						...participantInfo,
						phone: participantInfo.phone || undefined,
						document: participantInfo.document || undefined,
					},
					paymentMethod,
					requestId: id,
					...options,
					...(couponCode ? { couponCode } : {}),
				}),
			});
			const data = await response.json();
			if (!response.ok) {
				if (response.status < 500) {
					currentId.current = null;
					try {
						sessionStorage.removeItem(storageKey);
					} catch {
						/* Browser storage can be unavailable; the current page keeps the attempt. */
					}
				}
				throw new Error(describeProblem(data, 'Não foi possível concluir o pagamento.'));
			}
			const result = data as TransparentCheckoutResult;
			setLocal(result);
			client.setQueryData(['checkout-attempt', userId, id], result);
			setAttemptId(id);

			return result;
		} catch (cause) {
			if (currentId.current) {
				setLocal({ attemptId: id, status: 'processing', payment: null });
				setAttemptId(id);
				setError('A confirmação está em verificação. Não refaça a compra; consulte o andamento abaixo.');
			} else setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o pagamento.');
			throw cause;
		} finally {
			locked.current = false;
			setLoading(false);
		}
	}
	function reset() {
		if (attempt && !terminal.has(attempt.status)) return;
		try {
			sessionStorage.removeItem(storageKey);
		} catch {
			/* Browser storage can be unavailable; the current page keeps the attempt. */
		}
		currentId.current = null;
		setAttemptId(null);
		setLocal(null);
		setError(null);
	}

	return {
		createCheckoutSession,
		isLoading,
		error,
		attempt,
		reset,
		refresh: query.refetch,
		isRefreshing: query.isFetching,
		statusError: query.isError,
	};
}
