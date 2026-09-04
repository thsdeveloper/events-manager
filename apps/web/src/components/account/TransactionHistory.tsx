'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Loader2, ReceiptText, RefreshCw, WalletCards } from 'lucide-react';
import type { EventRegistration, PaymentTransaction } from '@events-manager/contracts';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransactionHistoryProps {
	userId: string;
}

const statusDetails = {
	succeeded: {
		label: 'Aprovado',
		className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
	},
	failed: { label: 'Falhou', className: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
	pending: { label: 'Pendente', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
	refunded: { label: 'Reembolsado', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
} as const;

const paymentMethodLabels: Record<string, string> = {
	card: 'Cartão de crédito',
	pix: 'Pix',
	boleto: 'Boleto',
	free: 'Gratuito',
};

export function TransactionHistory({ userId }: TransactionHistoryProps) {
	const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let isActive = true;

		async function fetchTransactions() {
			setLoading(true);
			setError(false);
			try {
				const response = await fetch('/api/user/transactions', { credentials: 'include' });
				if (!response.ok) throw new Error('Transactions unavailable');
				const data = (await response.json()) as PaymentTransaction[];
				if (isActive) setTransactions(data);
			} catch {
				if (isActive) setError(true);
			} finally {
				if (isActive) setLoading(false);
			}
		}

		if (userId) void fetchTransactions();

		return () => {
			isActive = false;
		};
	}, [reloadKey, userId]);

	if (loading) {
		return (
			<div className="flex min-h-56 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<div className="text-center">
					<Loader2 className="mx-auto size-6 animate-spin text-violet-600" />
					<p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Consultando pagamentos...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-900">
				<ReceiptText className="mx-auto size-8 text-red-400" />
				<h2 className="mt-4 font-semibold text-slate-950 dark:text-white">Não foi possível carregar os pagamentos</h2>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tente consultar o histórico novamente.</p>
				<Button
					type="button"
					variant="outline"
					className="mt-5 rounded-lg"
					onClick={() => setReloadKey((key) => key + 1)}
				>
					<RefreshCw />
					Tentar novamente
				</Button>
			</div>
		);
	}

	if (transactions.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-14">
				<div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
					<WalletCards className="size-6 text-slate-500" />
				</div>
				<h2 className="mt-4 font-semibold text-slate-950 dark:text-white">Nenhum pagamento por aqui</h2>
				<p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
					Quando você comprar um ingresso, os dados da transação e do recibo aparecerão nesta área.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
			<div className="divide-y divide-slate-100 dark:divide-slate-800">
				{transactions.map((transaction) => (
					<TransactionRow key={transaction.id} transaction={transaction} />
				))}
			</div>
			<footer className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400 sm:px-6">
				Precisa de ajuda com uma cobrança? Informe o código do ingresso ao entrar em contato com o suporte.
			</footer>
		</div>
	);
}

function TransactionRow({ transaction }: { transaction: PaymentTransaction }) {
	const registration =
		transaction.registration_id && typeof transaction.registration_id === 'object' ? transaction.registration_id : null;
	const event = registration && typeof registration.event_id === 'object' ? registration.event_id : null;
	const status = transaction.status || 'pending';
	const statusDetail = statusDetails[status];

	return (
		<article className="p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 sm:p-6">
			<div className="flex items-start gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
					<CreditCard className="size-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<p className="truncate font-semibold text-slate-950 dark:text-white">
								{event?.title || 'Compra de ingresso'}
							</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								{formatTransactionDate(transaction.date_created)}
								{registration?.payment_method
									? ` · ${paymentMethodLabels[registration.payment_method] || registration.payment_method}`
									: ''}
							</p>
						</div>
						<div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
							<p className="font-semibold tabular-nums text-slate-950 dark:text-white">
								{formatCurrency(transaction.amount)}
							</p>
							<span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusDetail.className)}>
								{statusDetail.label}
							</span>
						</div>
					</div>

					{registration && (
						<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
							<span>{formatQuantity(registration)}</span>
							{registration.ticket_code && <span className="font-mono">Ingresso {registration.ticket_code}</span>}
							<span className="font-mono">Transação {transaction.id.slice(0, 8)}</span>
						</div>
					)}
				</div>
			</div>
		</article>
	);
}

function formatCurrency(value: number | null | undefined) {
	return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatTransactionDate(value: string | null | undefined) {
	if (!value) return 'Data não disponível';

	return format(new Date(value), "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR });
}

function formatQuantity(registration: EventRegistration) {
	const quantity = registration.quantity || 1;

	return `${quantity} ${quantity === 1 ? 'ingresso' : 'ingressos'}`;
}
