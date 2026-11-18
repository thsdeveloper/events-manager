'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReceivingAccountOverview, ReceivingSubmission } from '@events-manager/contracts';
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { receivingBase, receivingRequest, useReceivingOverview } from '../api/receiving-account';
import { ReceivingAccountForm } from './ReceivingAccountForm';
import { ReceivingDetails, ReceivingHistory, receivingStatusLabels } from './ReceivingDetails';
export function ReceivingAccountPage({ initialData }: { initialData: ReceivingAccountOverview }) {
	const [page, setPage] = useState(1),
		[editing, setEditing] = useState(false);
	const query = useReceivingOverview(initialData.organizer.id, false, page, initialData);
	const data = query.data ?? initialData;
	const client = useQueryClient();
	const { toast } = useToast();
	const submit = useMutation({
		mutationFn: (input: ReceivingSubmission) =>
			receivingRequest(receivingBase(data.organizer.id), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input),
			}),
	});
	async function send(input: ReceivingSubmission) {
		try {
			await submit.mutateAsync(input);
			setEditing(false);
			await client.invalidateQueries({ queryKey: ['receiving-account'] });
			await client.invalidateQueries({ queryKey: ['finance'] });
			toast({
				title: 'Cadastro enviado para análise',
				description: 'Acompanhe o parecer e o histórico nesta página.',
				variant: 'success',
			});
		} catch (error) {
			toast({
				title: 'Não foi possível enviar',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		}
	}
	const approved = data.current?.status === 'approved' && data.organizer.payout_status === 'enabled';
	const production = Boolean(data.organizer.production_approved_at);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button variant="ghost" asChild>
					<Link href={data.organizer.status === 'active' ? '/admin/financeiro' : '/perfil/organizador'}>
						<ArrowLeft className="mr-2 size-4" />
						Voltar
					</Link>
				</Button>
				<Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
					<RefreshCw className="mr-2 size-4" />
					Atualizar análise
				</Button>
			</div>
			<Card className="overflow-hidden border-[#E6DBFF]" style={{ backgroundColor: '#F3EEFF', color: '#231A33' }}>
				<div className="grid items-center gap-4 p-6 sm:p-8 lg:grid-cols-[1fr_220px]">
					<div className="space-y-4">
						<p className="flex items-center gap-2 text-sm font-semibold">
							<ShieldCheck className="size-4" />
							Conta do organizador · {data.organizer.name}
						</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recebimento e verificação</h1>
						<p className="max-w-2xl text-sm leading-6">
							Coletamos os documentos necessários e validamos sua empresa ou cadastro para dar segurança às suas vendas.
							Após a aprovação, sua conta é liberada para operar em produção e você pode começar a vender.
						</p>
						<div className="flex flex-wrap gap-2">
							<Badge variant="outline" className="border-[#743DF5]/25 text-[#231A33]">
								{production ? 'Vendas em produção liberadas' : 'Aprovação necessária para vender em produção'}
							</Badge>
							{data.current && (
								<Badge variant="outline" className="border-[#743DF5]/25 text-[#231A33]">
									{receivingStatusLabels[data.current.status]}
								</Badge>
							)}
						</div>
					</div>
					<Image
						src={approved ? '/illustrations/organizer-approved.png' : '/illustrations/organizer-verification.png'}
						width={220}
						height={220}
						alt=""
						className="mx-auto hidden rounded-2xl lg:block"
						priority
					/>
				</div>
				<ol className="grid border-t border-[#743DF5]/10 sm:grid-cols-3">
					{[
						{
							icon: FileCheck2,
							title: '1. Envie seus dados',
							text: 'Escolha PIX ou conta bancária e anexe os documentos.',
						},
						{
							icon: Clock3,
							title: '2. Aguarde a análise',
							text: 'Nossa equipe confere os documentos e a titularidade.',
						},
						{
							icon: CheckCircle2,
							title: '3. Comece a vender',
							text: 'Com a primeira aprovação, sua conta pode operar em produção.',
						},
					].map((step) => (
						<li key={step.title} className="flex gap-3 p-5">
							<step.icon className="mt-0.5 size-5 shrink-0 text-[#743DF5]" />
							<div>
								<p className="text-sm font-semibold">{step.title}</p>
								<p className="mt-1 text-xs leading-5 opacity-80">{step.text}</p>
							</div>
						</li>
					))}
				</ol>
			</Card>
			<p className="flex gap-2 text-sm leading-6 text-muted-foreground">
				<ShieldCheck className="mt-1 size-4 shrink-0" />
				{production
					? 'Suas vendas continuam liberadas. Ao alterar o recebimento, novos repasses ficam bloqueados até a aprovação da nova versão.'
					: 'Você pode preparar seus eventos enquanto aguarda. Vendas em produção e repasses dependem da primeira aprovação.'}
			</p>
			{query.isError && (
				<Card role="alert" className="p-4 text-sm text-destructive">
					Não foi possível atualizar a análise. Tente novamente.
				</Card>
			)}
			{data.current && !editing && (
				<Card className="space-y-5 p-5 sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold">Cadastro atual · versão {data.current.version}</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								{approved
									? 'Dados aprovados para novos repasses.'
									: data.current.status === 'rejected'
										? 'Confira o parecer abaixo, corrija os dados e envie novamente.'
										: 'Novos repasses aguardam a aprovação dos dados e documentos.'}
							</p>
						</div>
						<Button variant="outline" onClick={() => setEditing(true)}>
							Alterar e reenviar
						</Button>
					</div>
					<ReceivingDetails request={data.current} organizerId={data.organizer.id} />
				</Card>
			)}
			{(!data.current || editing) && (
				<ReceivingAccountForm
					initialData={data}
					onSubmit={send}
					busy={submit.isPending}
					onCancel={data.current ? () => setEditing(false) : undefined}
				/>
			)}
			<ReceivingHistory
				requests={data.history}
				organizerId={data.organizer.id}
				page={data.pagination.page}
				pageCount={data.pagination.pageCount}
				onPageChange={setPage}
			/>
		</div>
	);
}
