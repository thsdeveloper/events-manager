'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReceivingAccount } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { receivingRequest } from '../api/receiving-account';
import { ReceivingDetails } from './ReceivingDetails';
interface ManualPayout {
	id: string;
	amount: number;
	net_amount: number;
	status: string;
	bank_account: ReceivingAccount;
	bank_reference?: string | null;
	requested_at: string;
	processed_at?: string | null;
	receipt_document_id?: string | null;
	failure_reason?: string | null;
}
function ManualPayoutItem({
	payout,
	organizerId,
	onChange,
}: {
	payout: ManualPayout;
	organizerId: string;
	onChange: () => Promise<void>;
}) {
	const { toast } = useToast();
	const [receipt, setReceipt] = useState<string | null>(null),
		[reference, setReference] = useState(''),
		[confirmed, setConfirmed] = useState(false),
		[busy, setBusy] = useState(false),
		[cancelling, setCancelling] = useState(false),
		[reason, setReason] = useState(''),
		[notSent, setNotSent] = useState(false);
	const base = `/api/super-admin/finance/payouts/${payout.id}`;
	async function upload(file: File) {
		setBusy(true);
		setReceipt(null);
		try {
			if (file.size > 10 * 1024 * 1024) throw new Error('O comprovante pode ter até 10 MB.');
			const body = new FormData();
			body.append('file', file);
			const result = await receivingRequest<{ id: string }>(`${base}/receipt`, { method: 'POST', body });
			setReceipt(result.id);
		} catch (error) {
			toast({
				title: 'Comprovante não enviado',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	}
	async function finish(cancel = false) {
		setBusy(true);
		try {
			await receivingRequest(`${base}/${cancel ? 'cancel' : 'complete'}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					cancel ? { reason, confirmed_not_sent: true } : { receipt_id: receipt, reference, confirmed_transfer: true },
				),
			});
			await onChange();
			toast({ title: cancel ? 'Reserva cancelada' : 'Transferência registrada', variant: 'success' });
		} catch (error) {
			toast({
				title: 'Não foi possível atualizar o repasse',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card className="space-y-5 p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-lg font-semibold">{formatCurrency(Number(payout.net_amount))}</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Reservado em {new Date(payout.requested_at).toLocaleString('pt-BR')} · {payout.id}
					</p>
				</div>
				<Badge variant="secondary">
					{(
						{ pending: 'Aguardando transferência manual', completed: 'Concluído', cancelled: 'Cancelado' } as Record<
							string,
							string
						>
					)[payout.status] ?? payout.status}
				</Badge>
			</div>
			<ReceivingDetails
				organizerId={organizerId}
				admin
				request={{ account: payout.bank_account, documents: [], review_reason: null }}
			/>
			<p className="text-xs leading-5 text-muted-foreground">
				Estes são os dados aprovados no momento da reserva. A plataforma não executa a transferência bancária
				automaticamente.
			</p>
			{payout.receipt_document_id && (
				<Button asChild variant="outline">
					<a
						href={`/api/super-admin/organizers/${organizerId}/manual-payouts/${payout.id}/receipt`}
						target="_blank"
						rel="noopener noreferrer"
					>
						Baixar comprovante
					</a>
				</Button>
			)}
			{payout.bank_reference && <p className="text-sm">Referência: {payout.bank_reference}</p>}
			{payout.failure_reason && <p className="text-sm">Motivo: {payout.failure_reason}</p>}
			{payout.status === 'pending' && (
				<div className="space-y-4 border-t pt-4">
					{!cancelling ? (
						<>
							<Label className="block space-y-2 text-sm font-medium">
								Referência da transferência
								<Input
									value={reference}
									onChange={(e) => setReference(e.target.value)}
									maxLength={160}
									placeholder="Identificador informado pelo banco"
								/>
							</Label>
							<Label className="block space-y-2 text-sm font-medium">
								Comprovante da transferência
								<Input
									type="file"
									accept="application/pdf,image/png,image/jpeg"
									disabled={busy}
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) void upload(file);
									}}
								/>
							</Label>
							{receipt && (
								<p role="status" className="text-sm">
									Comprovante anexado.
								</p>
							)}
							<Label className="flex items-start gap-3 text-sm leading-6">
								<Checkbox className="mt-1" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
								<span>Confirmo que a transferência foi realizada para a conta e o valor apresentados acima.</span>
							</Label>
							<div className="flex flex-wrap gap-3">
								<Button
									disabled={busy || !receipt || !confirmed || reference.trim().length < 3}
									onClick={() => void finish()}
								>
									Registrar transferência concluída
								</Button>
								<Button variant="outline" disabled={busy} onClick={() => setCancelling(true)}>
									Cancelar reserva
								</Button>
							</div>
						</>
					) : (
						<>
							<Label className="block space-y-2 text-sm font-medium">
								Motivo do cancelamento
								<Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} />
							</Label>
							<Label className="flex items-start gap-3 text-sm">
								<Checkbox checked={notSent} onCheckedChange={(v) => setNotSent(v === true)} />
								<span>Confirmo que nenhum valor foi transferido. O saldo reservado pode ser liberado.</span>
							</Label>
							<div className="flex gap-3">
								<Button
									variant="destructive"
									disabled={busy || !notSent || reason.trim().length < 5}
									onClick={() => void finish(true)}
								>
									Confirmar cancelamento
								</Button>
								<Button variant="outline" onClick={() => setCancelling(false)}>
									Voltar
								</Button>
							</div>
						</>
					)}
				</div>
			)}
		</Card>
	);
}
export function ManualPayoutPanel({ organizerId }: { organizerId: string }) {
	const [page, setPage] = useState(1),
		client = useQueryClient();
	const query = useQuery({
		queryKey: ['manual-payouts', organizerId, page],
		queryFn: ({ signal }) =>
			receivingRequest<{ data: ManualPayout[]; pagination: { page: number; pageCount: number } }>(
				`/api/super-admin/organizers/${organizerId}/manual-payouts?page=${page}&limit=10`,
				{ signal },
			),
	});
	async function changed() {
		await Promise.all([
			client.invalidateQueries({ queryKey: ['manual-payouts', organizerId] }),
			client.invalidateQueries({ queryKey: ['super-admin', 'organizer', organizerId] }),
		]);
	}

	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-lg font-semibold">Transferências bancárias manuais</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Reserve um repasse no Financeiro da plataforma. Depois de realizar a transferência, registre o comprovante
					aqui.
				</p>
			</div>
			{query.isPending ? (
				<p role="status">Carregando transferências…</p>
			) : query.isError ? (
				<Card className="space-y-3 p-4">
					<p role="alert">Não foi possível carregar as transferências.</p>
					<Button variant="outline" onClick={() => void query.refetch()}>
						Tentar novamente
					</Button>
				</Card>
			) : (
				<>
					{!query.data?.data.length && (
						<Card className="p-5 text-sm text-muted-foreground">Nenhuma transferência bancária registrada.</Card>
					)}
					{query.data?.data.map((p) => (
						<ManualPayoutItem key={p.id} payout={p} organizerId={organizerId} onChange={changed} />
					))}
					{(query.data?.pagination.pageCount ?? 0) > 1 && (
						<div className="flex justify-end gap-2">
							<Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
								Anterior
							</Button>
							<Button
								variant="outline"
								disabled={page >= (query.data?.pagination.pageCount ?? 0)}
								onClick={() => setPage(page + 1)}
							>
								Próxima
							</Button>
						</div>
					)}
				</>
			)}
		</section>
	);
}
