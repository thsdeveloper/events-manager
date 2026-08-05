'use client';

import { useEffect, useState } from 'react';
import { Calendar, CreditCard, DollarSign, Loader2, Receipt } from 'lucide-react';
import { PaymentTransaction } from '@events-manager/contracts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransactionHistoryProps {
	userId: string;
}

const statusColors = {
	succeeded: 'bg-emerald-100 text-emerald-800',
	failed: 'bg-red-100 text-red-800',
	pending: 'bg-yellow-100 text-yellow-800',
	refunded: 'bg-slate-100 text-slate-800',
};

const statusLabels = {
	succeeded: 'Aprovado',
	failed: 'Falhou',
	pending: 'Pendente',
	refunded: 'Reembolsado',
};

const paymentMethodLabels = {
	card: 'Cartão de Crédito',
	pix: 'PIX',
	boleto: 'Boleto',
	free: 'Gratuito',
};

export function TransactionHistory({ userId }: TransactionHistoryProps) {
	const [transactions, setTransactions] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchTransactions = async () => {
			try {
				setLoading(true);
				setError(null);

				console.log('🔍 [TransactionHistory] Fetching transactions for user:', userId);

				const response = await fetch(`/api/user/transactions?userId=${userId}`, {
					credentials: 'include', // Include httpOnly cookies
				});

				console.log('📡 [TransactionHistory] Response status:', response.status);

				if (!response.ok) {
					const errorData = await response.json();
					console.error('❌ [TransactionHistory] Error response:', errorData);
					throw new Error('Failed to fetch transactions');
				}

				const data = await response.json();
				console.log('✅ [TransactionHistory] Received', data.length, 'transactions');
				setTransactions(data);
			} catch (err) {
				console.error('❌ [TransactionHistory] Error fetching transactions:', err);
				setError('Não foi possível carregar o histórico de transações');
			} finally {
				setLoading(false);
			}
		};

		if (userId) {
			void fetchTransactions();
		}
	}, [userId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
				<div className="text-center">
					<Loader2 className="mx-auto size-8 animate-spin text-purple-600" />
					<p className="mt-4 text-sm text-slate-500">Carregando transações...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
				<p className="text-sm text-red-800">{error}</p>
			</div>
		);
	}

	if (transactions.length === 0) {
		return (
			<div className="rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
				<div className="text-center">
					<Receipt className="mx-auto size-12 text-slate-300" />
					<h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma transação encontrada</h3>
					<p className="mt-2 text-sm text-slate-500">
						Quando você comprar ingressos, suas transações aparecerão aqui.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
				<header className="mb-6 space-y-2">
					<h2 className="text-xl font-semibold text-slate-900">Histórico de Transações</h2>
					<p className="text-sm text-slate-500">
						Confira todas as suas transações de pagamento realizadas na plataforma.
					</p>
				</header>

				<div className="space-y-4">
					{transactions.map((transaction) => {
						const registration = transaction.registration_id;
						const event = registration?.event_id;
						const status = transaction.status || 'pending';

						return (
							<div
								key={transaction.id}
								className="rounded-2xl border border-slate-100 bg-slate-50 p-6 transition hover:border-purple-200 hover:bg-purple-50/30"
							>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div className="flex-1 space-y-3">
										<div className="flex items-start justify-between">
											<div>
												<h3 className="font-semibold text-slate-900">
													{event?.title || 'Evento não encontrado'}
												</h3>
												{registration && (
													<p className="mt-1 text-sm text-slate-600">
														{registration.quantity}x ingresso
														{registration.quantity > 1 ? 's' : ''} •{' '}
														{registration.participant_name}
													</p>
												)}
											</div>
											<span
												className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status as keyof typeof statusColors] || statusColors.pending}`}
											>
												{statusLabels[status as keyof typeof statusLabels] || 'Desconhecido'}
											</span>
										</div>

										<div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
											{registration?.payment_method && (
												<div className="flex items-center gap-2">
													<CreditCard className="size-4 text-purple-500" />
													<span>
														{paymentMethodLabels[registration.payment_method as keyof typeof paymentMethodLabels] || registration.payment_method}
													</span>
												</div>
											)}

											{transaction.date_created && (
												<div className="flex items-center gap-2">
													<Calendar className="size-4 text-purple-500" />
													<span>
														{format(new Date(transaction.date_created), "dd 'de' MMMM 'de' yyyy", {
															locale: ptBR,
														})}
													</span>
												</div>
											)}

											{registration?.ticket_code && (
												<div className="flex items-center gap-2">
													<Receipt className="size-4 text-purple-500" />
													<span className="font-mono text-xs">{registration.ticket_code}</span>
												</div>
											)}
										</div>
									</div>

									{transaction.amount != null && (
										<div className="flex items-center gap-2 sm:flex-col sm:items-end">
											<DollarSign className="size-5 text-slate-400" />
											<span className="text-xl font-bold text-slate-900">
												R$ {(transaction.amount / 100).toFixed(2)}
											</span>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-600">
				<p className="font-medium text-slate-700">Dúvidas sobre uma transação?</p>
				<p className="mt-1">
					Entre em contato com nosso suporte informando o código do ingresso para receber ajuda.
				</p>
			</div>
		</div>
	);
}
