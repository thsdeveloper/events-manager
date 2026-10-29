'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Coupon, CouponInput, CouponPatch } from '@events-manager/contracts';

async function readProblem(response: Response) {
	try {
		const payload = await response.json();

		return payload.detail ?? payload.title ?? 'Não foi possível concluir a operação.';
	} catch {
		return 'Não foi possível concluir a operação.';
	}
}

/**
 * Cupons de um evento, do ponto de vista de quem organiza. A API reconfere a
 * posse do evento a cada chamada — o hook não decide nada sobre permissão.
 */
export function useCoupons(eventId: string) {
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const base = `/api/events/${eventId}/coupons`;

	const refresh = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch(base, { credentials: 'include' });
			if (!response.ok) {
				setError(await readProblem(response));

				return;
			}
			const payload = await response.json();
			setCoupons((payload.data ?? []) as Coupon[]);
		} finally {
			setIsLoading(false);
		}
	}, [base]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const write = useCallback(
		async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => {
			setIsSaving(true);
			setError(null);
			try {
				const response = await fetch(url, {
					method,
					credentials: 'include',
					...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
				});
				if (!response.ok) {
					setError(await readProblem(response));

					return false;
				}
				await refresh();

				return true;
			} finally {
				setIsSaving(false);
			}
		},
		[refresh],
	);

	return {
		coupons,
		create: useCallback((input: CouponInput) => write(base, 'POST', input), [base, write]),
		error,
		isLoading,
		isSaving,
		refresh,
		remove: useCallback((couponId: string) => write(`${base}/${couponId}`, 'DELETE'), [base, write]),
		setStatus: useCallback(
			(couponId: string, status: 'active' | 'inactive') =>
				write(`${base}/${couponId}`, 'PATCH', { status } satisfies CouponPatch),
			[base, write],
		),
		update: useCallback(
			(couponId: string, input: CouponPatch) => write(`${base}/${couponId}`, 'PATCH', input),
			[base, write],
		),
	};
}
