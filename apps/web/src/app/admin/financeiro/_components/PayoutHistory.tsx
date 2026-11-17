'use client';

import { RecordTable } from '@/components/ui/record-table';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { memo } from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

function PayoutHistory({ summary, isLoading, currencyFormatter }: PayoutHistoryProps) {
	const balance = summary?.balance;
	const payouts = summary?.payouts ?? [];

	return (
		<Card className="">
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle>Repasses AbacatePay</CardTitle>
					<CardDescription>Histórico de transferências e saldo disponível</CardDescription>
				</div>
				{balance && (
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground  ">
							<Wallet className="size-4" />
							<span className="font-semibold">Disponível: {currencyFormatter.format(balance.available)}</span>
						</div>
						<div className="rounded-lg bg-muted px-3 py-2 text-muted-foreground  ">
							Pendente: {currencyFormatter.format(balance.pending)}
						</div>
					</div>
				)}
			</CardHeader>
			<CardContent>
				{summary?.alert && (
					<Alert className="mb-4 text-warning">
						<AlertDescription>{summary.alert}</AlertDescription>
					</Alert>
				)}
				{isLoading ? (
					<div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
						<Spinner className="size-5 animate-spin" />
						Carregando histórico de repasses...
					</div>
				) : payouts.length === 0 ? (
					<div className="py-8 text-center text-sm text-muted-foreground">
						Nenhum repasse encontrado para sua conta AbacatePay.
					</div>
				) : (
					<div className="overflow-x-auto">
						<RecordTable
							headers={['Data', 'ID Payout', 'Valor', 'Status', 'Previsão']}
							rows={payouts.map((payout) => ({
								id: String(payout.id),
								values: [payout.createdAt, payout.id, payout.amount, payout.status, payout.arrivalDate],
								cells: [
									<div key="column-0" className="text-sm text-muted-foreground">
										{formatDate(payout.createdAt)}
									</div>,
									<div key="column-1" className="text-primary">
										{payout.id}
									</div>,
									<div key="column-2" className="text-right text-sm text-foreground">
										{currencyFormatter.format(payout.amount)}
									</div>,
									<div key="column-3" className="text-right text-sm">
										<Badge variant="secondary">{statusLabel[payout.status] ?? payout.status}</Badge>
									</div>,
									<div key="column-4" className="text-sm text-muted-foreground">
										{formatDate(payout.arrivalDate)}
									</div>,
								],
							}))}
							paginate={true}
							emptyMessage={undefined}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default memo(PayoutHistory);
