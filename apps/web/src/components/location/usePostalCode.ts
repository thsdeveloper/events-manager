'use client';
import { useEffect, useRef, useState } from 'react';
export interface PostalAddress {
	street: string;
	neighborhood: string;
	city: string;
	state: string;
	postal_code: string;
}
export function usePostalCode(value: string, enabled: boolean, onResolved: (address: PostalAddress) => void) {
	const [loading, setLoading] = useState(false),
		[error, setError] = useState<string | null>(null);
	const code = value.replace(/\D/g, '');
	const resolvedCallback = useRef(onResolved);
	useEffect(() => {
		resolvedCallback.current = onResolved;
	}, [onResolved]);
	useEffect(() => {
		setError(null);
		setLoading(false);
		if (!enabled || code.length !== 8) return;
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setLoading(true);
			try {
				const response = await fetch(`/api/places/postal-code/${code}`, { signal: controller.signal });
				const data = await response.json();
				if (!response.ok) throw new Error(data?.detail ?? 'Não foi possível consultar o CEP. Preencha manualmente.');
				if (!controller.signal.aborted) resolvedCallback.current(data);
			} catch (cause) {
				if (!controller.signal.aborted)
					setError(cause instanceof Error ? cause.message : 'Preencha o endereço manualmente.');
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}, 250);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [code, enabled]);

	return { loading, error };
}
