'use client';
import {
	organizerAdminUpdateSchema,
	organizerSupportNoteSchema,
	type OrganizerAdminUpdate,
	type OrganizerSupportDetail,
} from '@events-manager/contracts';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { useOrganizerSupport } from '../api/organizer-support';
import { organizerStatusLabels, supportDate } from '../lib/organizer-labels';
import { OrganizerContactForm, OrganizerStatusForm } from './OrganizerSupportForms';
import { OrganizerSupportRecords } from './OrganizerSupportRecords';
export function OrganizerSupportPage({
	initialDetail,
	receivingPanel,
	manualPayoutPanel,
	initialTab = 'overview',
}: {
	initialDetail: OrganizerSupportDetail;
	receivingPanel?: ReactNode;
	manualPayoutPanel?: ReactNode;
	initialTab?: string;
}) {
	const { detail, update, addNote } = useOrganizerSupport(initialDetail);
	const { toast } = useToast();
	const [note, setNote] = useState('');
	const { organizer, owner, metrics } = detail.data;
	async function save(input: OrganizerAdminUpdate) {
		const parsed = organizerAdminUpdateSchema.safeParse(input);
		if (!parsed.success) {
			toast({ title: 'Confira os dados', description: parsed.error.issues[0].message, variant: 'destructive' });

			return false;
		}
		try {
			await update.mutateAsync(parsed.data);
			toast({
				title: 'Organizador atualizado',
				description: 'A alteração e o motivo foram registrados no histórico.',
				variant: 'success',
			});

			return true;
		} catch (error) {
			toast({
				title: 'Não foi possível salvar',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});

			return false;
		}
	}

	async function submitNote(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsed = organizerSupportNoteSchema.safeParse({ note });
		if (!parsed.success) {
			toast({ title: 'Descreva o atendimento', description: parsed.error.issues[0].message, variant: 'destructive' });

			return;
		}
		try {
			await addNote.mutateAsync(parsed.data.note);
			setNote('');
			toast({ title: 'Atendimento registrado', variant: 'success' });
		} catch (error) {
			toast({
				title: 'Não foi possível registrar',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		}
	}

	return (
		<div className="space-y-6">
			<Button asChild variant="link" className="h-auto p-0">
				<Link href="/super-admin/organizadores">
					<ArrowLeft className="size-4" />
					Voltar aos organizadores
				</Link>
			</Button>
			<PageHeader
				eyebrow="Atendimento ao organizador"
				title={organizer.name}
				description={
					<span className="break-all">
						Conta {organizer.id} · Cadastro em {supportDate(organizer.date_created)}
					</span>
				}
				actions={
					<div className="flex items-center gap-3">
						<Badge variant="secondary">{organizerStatusLabels[organizer.status]}</Badge>
						<Button variant="outline" onClick={() => detail.refetch()} disabled={detail.isFetching}>
							<RefreshCw className="size-4" />
							Atualizar
						</Button>
					</div>
				}
			/>
			{detail.isError && (
				<p role="alert" className="text-sm text-destructive">
					Não foi possível atualizar os dados. {detail.error.message}
				</p>
			)}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{(
					[
						['Receita bruta', formatCurrency(metrics.grossRevenue), `${metrics.ticketsSold} ingressos pagos`],
						['Saldo disponível', formatCurrency(metrics.availableBalance), 'Após taxas e reservas de repasses'],
						['Repasses reservados', formatCurrency(metrics.reservedPayouts), 'Pendentes ou em processamento'],
						['Repasses concluídos', formatCurrency(metrics.completedPayouts), 'Valores brutos já repassados'],
					] as const
				).map(([title, value, description]) => (
					<Card key={title} className="p-5">
						<h2 className="text-sm text-muted-foreground">{title}</h2>
						<p className="my-2 text-2xl font-semibold">{value}</p>
						<p className="text-xs text-muted-foreground">{description}</p>
					</Card>
				))}
			</div>
			<Tabs defaultValue={initialTab} className="space-y-5">
				<div className="overflow-x-auto">
					<TabsList className="h-auto w-max">
						<TabsTrigger value="overview">Cadastro e acesso</TabsTrigger>
						<TabsTrigger value="receiving">Recebimento e documentos</TabsTrigger>
						<TabsTrigger value="events">Eventos ({metrics.events})</TabsTrigger>
						<TabsTrigger value="transactions">Transações</TabsTrigger>
						<TabsTrigger value="payouts">Repasses</TabsTrigger>
						<TabsTrigger value="activity">Histórico e atendimento</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="overview" className="space-y-5">
					<Card className="p-5">
						<h2 className="text-lg font-semibold">Identificação e responsável</h2>
						<dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
							<div>
								<dt className="text-muted-foreground">CPF/CNPJ da organização</dt>
								<dd className="mt-1 font-medium">{organizer.document ?? 'Não informado'}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Responsável pela conta</dt>
								<dd className="mt-1 font-medium">
									{owner
										? [owner.first_name, owner.last_name].filter(Boolean).join(' ') || 'Nome não informado'
										: 'Perfil não encontrado'}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">E-mail do responsável</dt>
								<dd className="mt-1 break-words">{owner?.email ?? 'Não informado'}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Telefone do responsável</dt>
								<dd className="mt-1">
									{owner?.phone ?? 'Não informado'} · {owner?.phone_verified_at ? 'Confirmado' : 'Não confirmado'}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">CPF do responsável</dt>
								<dd className="mt-1">{owner?.document ?? 'Não informado'}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Situação do perfil</dt>
								<dd className="mt-1">{owner?.status === 'active' ? 'Ativo' : (owner?.status ?? 'Não informado')}</dd>
							</div>
						</dl>
						<p className="mt-4 text-xs text-muted-foreground">
							Usuário: {organizer.user_id ?? 'Não vinculado'} · Última alteração: {supportDate(organizer.date_updated)}
						</p>
					</Card>
					<div className="grid items-start gap-5 xl:grid-cols-2">
						<OrganizerContactForm organizer={organizer} save={save} busy={update.isPending} />
						<div className="space-y-5">
							<OrganizerStatusForm organizer={organizer} save={save} busy={update.isPending} />
						</div>
					</div>
				</TabsContent>
				<TabsContent value="receiving">{receivingPanel}</TabsContent>
				<TabsContent value="events">
					<Card className="space-y-4 p-5">
						<h2 className="text-lg font-semibold">Eventos desta organização</h2>
						<p className="text-sm text-muted-foreground">
							{metrics.publishedEvents} publicados · {metrics.registrations} inscrições no total.
						</p>
						<OrganizerSupportRecords id={organizer.id} kind="events" />
					</Card>
				</TabsContent>
				<TabsContent value="transactions">
					<Card className="space-y-4 p-5">
						<h2 className="text-lg font-semibold">Transações de pagamento</h2>
						<p className="text-sm text-muted-foreground">
							{metrics.failedPayments} transações com falha. Use a referência do pedido e do provedor para investigar.
						</p>
						<OrganizerSupportRecords id={organizer.id} kind="transactions" />
					</Card>
				</TabsContent>
				<TabsContent value="payouts" className="space-y-5">
					{manualPayoutPanel}
					<Card className="space-y-4 p-5">
						<h2 className="text-lg font-semibold">Repasses e comprovantes</h2>
						<p className="text-sm text-muted-foreground">
							Consulte valores, chave utilizada, falhas e comprovantes antes de solicitar uma nova transferência.
						</p>
						<OrganizerSupportRecords id={organizer.id} kind="payouts" />
					</Card>
				</TabsContent>
				<TabsContent value="activity" className="space-y-5">
					<Card className="p-5">
						<form className="space-y-3" onSubmit={submitNote}>
							<Label className="block space-y-2 text-sm font-medium">
								Anotação interna
								<Textarea
									value={note}
									onChange={(event) => setNote(event.target.value)}
									minLength={5}
									maxLength={4000}
									required
									placeholder="Registre a solicitação, as verificações e a solução adotada."
								/>
							</Label>
							<p className="text-xs text-muted-foreground">Visível apenas para superadministradores.</p>
							<Button type="submit" loading={addNote.isPending}>
								Registrar atendimento
							</Button>
						</form>
					</Card>
					<Card className="space-y-4 p-5">
						<h2 className="text-lg font-semibold">Histórico de alterações e atendimento</h2>
						<OrganizerSupportRecords id={organizer.id} kind="activity" />
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
