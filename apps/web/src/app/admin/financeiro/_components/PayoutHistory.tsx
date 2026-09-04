'use client';

import { memo } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export type PayoutRecord = {
	id: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: string | null;
	arrivalDate: string | null;
	description: string | null;
	statementDescriptor: string | null;
	destination: string | null;
};

export type PayoutSummary = {
	balance: {
		available: number;
		pending: number;
		currency: string;
	};
	payouts: PayoutRecord[];
	alert?: string;
};

interface PayoutHistoryProps {
	summary: PayoutSummary | null;
	isLoading: boolean;
	currencyFormatter: Intl.NumberFormat;
}

function formatDate(value: string | null) {
	if (!value) {

		return '—';
	}

	return new Date(value).toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

const statusLabel: Record<string, string> = {
	paid: 'Pago',
	in_transit: 'Em trânsito',
	pending: 'Pendente',
	failed: 'Falhou',
	canceled: 'Cancelado',
};

const statusBadge: Record<string, string> = {
	paid: 'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40',
	in_transit: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',
	pending: 'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40',
	failed: 'text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40',
	canceled: 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/40',
};

function PayoutHistory({ summary, isLoading, currencyFormatter }: PayoutHistoryProps) {
	const balance = summary?.balance;
	const payouts = summary?.payouts ?? [];

	return (
		<Card className="border border-gray-200 shadow-sm dark:border-gray-800">
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle>Repasses AbacatePay</CardTitle>
					<CardDescription>Histórico de transferências e saldo disponível</CardDescription>
				</div>
				{balance && (
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
							<Wallet className="size-4" />
							<span className="font-semibold">
								Disponível: {currencyFormatter.format(balance.available)}
							</span>
						</div>
						<div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
							Pendente: {currencyFormatter.format(balance.pending)}
						</div>
					</div>
				)}
			</CardHeader>
			<CardContent>
				{summary?.alert && (
					<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
						{summary.alert}
					</div>
				)}
				{isLoading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
						<Loader2 className="size-5 animate-spin" />
						Carregando histórico de repasses...
					</div>
				) : payouts.length === 0 ? (
					<div className="py-8 text-center text-sm text-gray-500">
						Nenhum repasse encontrado para sua conta AbacatePay.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
							<thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900 dark:text-gray-400">
								<tr>
									<th className="px-4 py-3 font-semibold">Data</th>
									<th className="px-4 py-3 font-semibold">ID Payout</th>
									<th className="px-4 py-3 font-semibold text-right">Valor</th>
									<th className="px-4 py-3 font-semibold text-right">Status</th>
									<th className="px-4 py-3 font-semibold">Previsão</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-slate-900">
								{payouts.map((payout) => (
									<tr key={payout.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
										<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
											{formatDate(payout.createdAt)}
										</td>
										<td className="px-4 py-3 text-xs font-semibold text-purple-600 dark:text-purple-300">
											{payout.id}
										</td>
										<td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
											{currencyFormatter.format(payout.amount)}
										</td>
										<td className="px-4 py-3 text-right text-sm">
											<span
												className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[payout.status] ?? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
											>
												{statusLabel[payout.status] ?? payout.status}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
											{formatDate(payout.arrivalDate)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default memo(PayoutHistory);
