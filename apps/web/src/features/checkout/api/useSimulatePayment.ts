'use client';

import { useMutation } from '@tanstack/react-query';
import { describeProblem } from '@/lib/problem';

export function useSimulatePayment(attemptId: string, onSuccess: () => void) {
	return useMutation({
		mutationFn: async () => {
			let response: Response;
			try {
				response = await fetch(`/api/payments/attempts/${attemptId}/simulate-payment`, {
					method: 'POST',
					credentials: 'include',
				});
			} catch {
				throw new Error('Não foi possível simular o pagamento. Verifique sua conexão e tente novamente.');
			}
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(describeProblem(problem, 'Não foi possível simular o pagamento. Tente novamente.'));
			}
		},
		onSuccess,
	});
}
