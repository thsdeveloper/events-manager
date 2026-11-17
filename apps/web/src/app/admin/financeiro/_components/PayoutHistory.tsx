'use client';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet } from 'lucide-react';
import { memo } from 'react';

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
	canceled: 'text-muted-foreground bg-muted  ',
};

function PayoutHistory({ summary, isLoading, currencyFormatter }: PayoutHistoryProps) {
	const balance = summary?.balance;
	const payouts = summary?.payouts ?? [];

	return (
		<Card className="border border-border shadow-sm ">
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle>Repasses AbacatePay</CardTitle>
					<CardDescription>Histórico de transferências e saldo disponível</CardDescription>
				</div>
				{balance && (
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
							<Wallet className="size-4" />
							<span className="font-semibold">Disponível: {currencyFormatter.format(balance.available)}</span>
						</div>
						<div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
							Pendente: {currencyFormatter.format(balance.pending)}
						</div>
					</div>
				)}
			</CardHeader>
			<CardContent>
				{summary?.alert && (
					<Alert className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
						{summary.alert}
					</Alert>
				)}
				{isLoading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
						<Loader2 className="size-5 animate-spin" />
						Carregando histórico de repasses...
					</div>
				) : payouts.length === 0 ? (
					<div className="py-8 text-center text-sm text-muted-foreground">
						Nenhum repasse encontrado para sua conta AbacatePay.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table className="min-w-full divide-y divide-border text-left text-sm ">
							<TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground  ">
								<TableRow>
									<TableHead className="px-4 py-3 font-semibold">Data</TableHead>
									<TableHead className="px-4 py-3 font-semibold">ID Payout</TableHead>
									<TableHead className="px-4 py-3 font-semibold text-right">Valor</TableHead>
									<TableHead className="px-4 py-3 font-semibold text-right">Status</TableHead>
									<TableHead className="px-4 py-3 font-semibold">Previsão</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="divide-y divide-border bg-card  ">
								{payouts.map((payout) => (
									<TableRow key={payout.id} className="transition-colors hover:bg-muted/40 dark:hover:bg-gray-800/40">
										<TableCell className="px-4 py-3 text-sm text-muted-foreground ">
											{formatDate(payout.createdAt)}
										</TableCell>
										<TableCell className="px-4 py-3 text-xs font-semibold text-purple-600 dark:text-purple-300">
											{payout.id}
										</TableCell>
										<TableCell className="px-4 py-3 text-right text-sm font-semibold text-foreground ">
											{currencyFormatter.format(payout.amount)}
										</TableCell>
										<TableCell className="px-4 py-3 text-right text-sm">
											<Badge
												variant="secondary"
												className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[payout.status] ?? 'bg-muted text-foreground  dark:text-gray-200'}`}
											>
												{statusLabel[payout.status] ?? payout.status}
											</Badge>
										</TableCell>
										<TableCell className="px-4 py-3 text-sm text-muted-foreground ">
											{formatDate(payout.arrivalDate)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default memo(PayoutHistory);
