import { useState } from 'react';

interface TicketItem {
	ticketId: string;
	quantity: number;
}

interface ParticipantInfo {
	name: string;
	email: string;
	phone?: string;
	document?: string;
}

interface InstallmentCheckoutOptions {
	onSuccess?: (data: InstallmentCheckoutResponse) => void;
}

interface InstallmentCheckoutResponse {
	success: boolean;
	registration_id: string;
	total_amount: number;
	installments: Array<{
		id: string;
		installment_number: number;
		amount: number;
		due_date: string;
	}>;
	first_installment: {
		id: string;
		amount: number;
		pix_qr_code: string | null;
		pix_copy_paste: string | null;
		provider_transaction_id: string;
		expires_at: string | null;
	};
}

export function useInstallmentCheckout({ onSuccess }: InstallmentCheckoutOptions = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createInstallmentCheckout = async (
		ticket: TicketItem,
		installments: number,
		participantInfo: ParticipantInfo,
	): Promise<InstallmentCheckoutResponse | null> => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/api/checkout/installments', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					ticket_id: ticket.ticketId,
					quantity: ticket.quantity,
					installments,
					participant_name: participantInfo.name,
					participant_email: participantInfo.email,
					participant_phone: participantInfo.phone,
					participant_document: participantInfo.document,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.detail || 'Erro ao criar checkout parcelado');
			}

			if (onSuccess) {
				onSuccess(data);
			}

			return data as InstallmentCheckoutResponse;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
			setError(errorMessage);

			return null;
		} finally {
			setIsLoading(false);
		}
	};

	return {
		createInstallmentCheckout,
		isLoading,
		error,
	};
}
