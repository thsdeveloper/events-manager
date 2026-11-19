'use client';
import { usePlatformPermissions } from '@/features/platform-access/PlatformPermissions';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReceivingReview } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { receivingBase, receivingRequest, useReceivingOverview } from '../api/receiving-account';
import { ReceivingDetails, ReceivingHistory, receivingStatusLabels } from './ReceivingDetails';
export function ReceivingReviewPanel({ organizerId }: { organizerId: string }) {
	const { can } = usePlatformPermissions();
	const [page, setPage] = useState(1);
	const query = useReceivingOverview(organizerId, true, page);
	const { toast } = useToast();
	const client = useQueryClient();
	const [reason, setReason] = useState(''),
		[checked, setChecked] = useState(false);
	const [checkedVersion, setCheckedVersion] = useState<string | null>(null);
	const review = useMutation({
		mutationFn: ({ requestId, ...input }: ReceivingReview & { requestId: string }) =>
			receivingRequest(`${receivingBase(organizerId, true)}/${requestId}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			}),
	});
	async function decide(decision: ReceivingReview['decision']) {
		const current = query.data?.current;
		if (!current) return;
		try {
			await review.mutateAsync({ requestId: current.id, decision, reason, documents_checked: true });
			setChecked(false);
			setReason('');
			await Promise.all([
				client.invalidateQueries({ queryKey: ['receiving-account'] }),
				client.invalidateQueries({ queryKey: ['super-admin', 'organizer', organizerId] }),
			]);
			toast({ title: decision === 'approved' ? 'Cadastro aprovado' : 'Correção solicitada', variant: 'success' });
		} catch (error) {
			toast({
				title: 'Não foi possível registrar a análise',
				description: error instanceof Error ? error.message : 'Atualize e tente novamente.',
				variant: 'destructive',
			});
		}
	}
	if (query.isPending)
		return (
			<p role="status" className="p-5 text-sm text-muted-foreground">
				Carregando dados de recebimento…
			</p>
		);
	if (query.isError || !query.data)
		return (
			<Card className="space-y-3 p-5">
				<p role="alert">Não foi possível carregar a análise.</p>
				<Button variant="outline" onClick={() => void query.refetch()}>
					Tentar novamente
				</Button>
			</Card>
		);
	const data = query.data,
		current = data.current;
	const eligible = checked && checkedVersion === current?.id && reason.trim().length >= 5 && !review.isPending;

	return (
		<div className="space-y-5">
			<Card className="space-y-5 p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold">Recebimento e documentos</h2>
						<p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
							Os dados são cadastrados exclusivamente pelo organizador. Confira a titularidade e os documentos antes de
							aprovar ou solicitar uma correção. A primeira aprovação libera as vendas em produção; envios posteriores
							bloqueiam apenas novos repasses.
						</p>
					</div>
					<Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
						Atualizar análise
					</Button>
				</div>
				{current ? (
					<>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								Versão {current.version} · {receivingStatusLabels[current.status]}
							</Badge>
							<Badge variant="outline">
								{data.organizer.production_approved_at ? 'Produção liberada' : 'Produção aguardando aprovação'}
							</Badge>
						</div>
						<ReceivingDetails request={current} organizerId={organizerId} admin />
						{can('platform_receiving.review') && current.status === 'pending' && (
							<div className="space-y-4 border-t pt-5">
								<Label className="block space-y-2 text-sm font-medium">
									Parecer da análise
									<Textarea
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										minLength={5}
										maxLength={2000}
										placeholder="Explique a aprovação ou o que precisa ser corrigido. O organizador verá este parecer."
									/>
								</Label>
								<Label className="flex items-start gap-3 text-sm leading-6">
									<Checkbox
										className="mt-1"
										checked={checked && checkedVersion === current.id}
										onCheckedChange={(v) => {
											setChecked(v === true);
											setCheckedVersion(current.id);
										}}
									/>
									<span>Conferi os documentos e a titularidade dos dados desta versão.</span>
								</Label>
								<div className="flex flex-wrap gap-3">
									<Button disabled={!eligible} loading={review.isPending} onClick={() => void decide('approved')}>
										Aprovar cadastro
									</Button>
									<Button variant="destructive" disabled={!eligible} onClick={() => void decide('rejected')}>
										Rejeitar e solicitar correção
									</Button>
								</div>
							</div>
						)}
					</>
				) : (
					<p className="rounded-lg bg-muted p-4 text-sm">
						O organizador ainda não enviou os dados e documentos para análise.
					</p>
				)}
			</Card>
			<ReceivingHistory
				requests={data.history}
				organizerId={organizerId}
				admin
				page={data.pagination.page}
				pageCount={data.pagination.pageCount}
				onPageChange={setPage}
			/>
		</div>
	);
}
