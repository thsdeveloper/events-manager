'use client';

import { EventCreatedFeedback } from '@/features/event-creation';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Calendar,
	Edit,
	ExternalLink,
	Globe,
	Info,
	LayoutTemplate,
	MapPin,
	Rocket,
	Settings,
	Star,
	Ticket,
	TicketPercent,
	Trash2,
	TrendingUp,
	UserCheck,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { Event, EventTicket } from '@events-manager/contracts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Text from '@/components/ui/Text';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCoupons } from '@/features/coupons/components/EventCoupons';
import { EventTicketManager } from '@/features/tickets/components/EventTicketManager';
import { ticketMetrics, type TicketStockRegistration } from '@/features/tickets/metrics';
import { revalidateEventPage } from '@/features/event-page/actions';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/fees';
import { describeProblem } from '@/lib/problem';

const STATUS_STYLES: Record<string, { label: string }> = {
	draft: { label: 'Rascunho' },
	published: { label: 'Publicado' },
	cancelled: { label: 'Cancelado' },
	archived: { label: 'Arquivado' },
};

function formatDateTime(value?: string | null) {
	if (!value) return '—';

	return new Date(value).toLocaleString('pt-BR', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function MetricCard({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: typeof Users;
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div role="group" aria-label={label} className="rounded-lg border bg-card p-4">
			<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
				<Icon className="size-3.5" />
				{label}
			</div>
			<p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
			{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
		</div>
	);
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Calendar; label: string; children: React.ReactNode }) {
	return (
		<div className="flex gap-3 border-b py-3 last:border-none">
			<Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0">
				<p className="text-xs font-medium text-muted-foreground">{label}</p>
				<div className="mt-0.5 text-sm text-foreground">{children}</div>
			</div>
		</div>
	);
}

interface EventoDetalhesClientProps {
	initialEvent: Event;
	evento_id: string;
}

export default function EventoDetalhesClient({ initialEvent, evento_id }: EventoDetalhesClientProps) {
	const router = useRouter();
	const { toast } = useToast();
	const event = initialEvent;

	const [eventDeleteOpen, setEventDeleteOpen] = useState(false);
	const [publishOpen, setPublishOpen] = useState(false);
	const [unpublishOpen, setUnpublishOpen] = useState(false);
	const [unpublishError, setUnpublishError] = useState<string | null>(null);
	const [publishError, setPublishError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const storedTickets = useMemo(() => (event.tickets ?? []) as EventTicket[], [event.tickets]);
	const registrations: TicketStockRegistration[] = (event.registrations ?? [])
		.filter((row): row is Exclude<typeof row, string> => typeof row !== 'string')
		.map((row) => ({
			...row,
			ticket_type_id: typeof row.ticket_type_id === 'object' ? (row.ticket_type_id?.id ?? null) : row.ticket_type_id,
		}));
	const metrics = ticketMetrics(registrations);
	const participantsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;
	const isFree = Boolean(event.is_free);

	const stats = useMemo(() => {
		const totalQuantity = storedTickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 0), 0);
		const totalSold = storedTickets.reduce((sum, ticket) => sum + (ticket.quantity_sold ?? 0), 0);

		return { totalQuantity, totalSold };
	}, [storedTickets]);

	const status = STATUS_STYLES[event.status ?? 'draft'] ?? STATUS_STYLES.draft;

	const confirmDeleteEvent = useCallback(async () => {
		setBusy(true);
		try {
			const response = await fetch(`/api/events/${evento_id}`, { method: 'DELETE' });
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail ?? 'Não foi possível excluir o evento.');
			}
			toast({ title: 'Evento excluído', variant: 'success' });
			router.push('/admin/eventos');
			router.refresh();
		} catch (error) {
			toast({
				title: 'Erro ao excluir',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
			setBusy(false);
		}
	}, [evento_id, router, toast]);

	// Publicar torna o evento visível ao público: exige confirmação e mostra a
	// recusa da API no próprio diálogo, para a pessoa corrigir e tentar de novo.
	const confirmPublish = useCallback(async () => {
		setBusy(true);
		setPublishError(null);
		try {
			const response = await fetch(`/api/events/${evento_id}`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'published' }),
			});
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(describeProblem(problem, 'Não foi possível publicar o evento.'));
			}
			if (event.slug) await revalidateEventPage(event.slug).catch(() => undefined);
			toast({
				title: 'Evento publicado',
				description:
					event.visibility === 'unlisted' ? 'A página está disponível pelo link.' : 'Ele já aparece para o público.',
				variant: 'success',
			});
			setPublishOpen(false);
			router.refresh();
		} catch (error) {
			setPublishError(error instanceof Error ? error.message : 'Tente novamente.');
		} finally {
			setBusy(false);
		}
	}, [event.slug, event.visibility, evento_id, router, toast]);

	const confirmUnpublish = useCallback(async () => {
		setBusy(true);
		setUnpublishError(null);
		try {
			const response = await fetch('/api/events/' + evento_id, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'draft' }),
			});
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(describeProblem(problem, 'Não foi possível despublicar o evento.'));
			}
			if (event.slug) await revalidateEventPage(event.slug).catch(() => undefined);
			setUnpublishOpen(false);
			router.refresh();
			toast({ title: 'Evento despublicado', description: 'Os ingressos e participantes continuam no painel.' });
		} catch (error) {
			setUnpublishError(error instanceof Error ? error.message : 'Tente novamente.');
		} finally {
			setBusy(false);
		}
	}, [event.slug, evento_id, router, toast]);

	const requestDeleteEvent = useCallback(() => {
		if (participantsCount > 0 || stats.totalSold > 0) {
			toast({
				title: 'Evento com movimentação',
				description: 'Há inscrições ou ingressos vendidos. Cancele o evento em vez de excluí-lo.',
				variant: 'destructive',
			});

			return;
		}
		setEventDeleteOpen(true);
	}, [participantsCount, stats.totalSold, toast]);

	return (
		<div className="space-y-6">
			<EventCreatedFeedback eventId={evento_id} />
			<PageHeader
				title={event.title}
				description={
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">{status.label}</Badge>
						{event.featured && (
							<Badge variant="secondary" className="inline-flex items-center gap-1">
								<Star className="size-3" />
								Destaque
							</Badge>
						)}
					</div>
				}
				actions={
					<div role="toolbar" aria-label="Ações do evento" className="flex flex-wrap items-center gap-2">
						{event.slug && (
							<Button variant="outline" size="sm" asChild>
								<Link
									href={event.status === 'published' ? `/eventos/${event.slug}` : `/admin/eventos/${evento_id}/previa`}
									target="_blank"
								>
									<ExternalLink className="mr-2 size-4" />
									{event.status === 'published' ? 'Ver página' : 'Prévia'}
								</Link>
							</Button>
						)}
						<Button variant="outline" size="sm" asChild>
							<Link href={`/admin/eventos/${evento_id}/pagina`}>
								<LayoutTemplate className="mr-2 size-4" />
								Página do evento
							</Link>
						</Button>
						<Button variant="outline" size="sm" asChild>
							<Link href={`/admin/eventos/${evento_id}/configuracoes`}>
								<Settings className="mr-2 size-4" />
								Configurações
							</Link>
						</Button>
						<Button size="sm" asChild>
							<Link href={`/admin/eventos/${evento_id}/editar`}>
								<Edit className="mr-2 size-4" />
								Editar
							</Link>
						</Button>
						{event.status === 'draft' && (
							<Button
								variant="default"
								size="sm"
								onClick={() => {
									setPublishError(null);
									setPublishOpen(true);
								}}
							>
								<Rocket className="mr-2 size-4" />
								Publicar
							</Button>
						)}
						{event.status === 'published' && (
							<>
								<Button variant="outline" size="sm" asChild>
									<Link href={'/admin/eventos/' + evento_id + '/previa'} target="_blank">
										Prévia
									</Link>
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setUnpublishError(null);
										setUnpublishOpen(true);
									}}
									disabled={busy}
								>
									Despublicar
								</Button>
							</>
						)}
						<Button variant="destructive" size="sm" onClick={requestDeleteEvent}>
							<Trash2 className="mr-2 size-4" />
							Excluir
						</Button>
					</div>
				}
			/>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<MetricCard icon={UserCheck} label="Inscritos" value={participantsCount.toLocaleString('pt-BR')} />
				<MetricCard
					icon={Ticket}
					label="Ingressos vendidos"
					value={metrics.sold.toLocaleString('pt-BR')}
					hint={stats.totalQuantity > 0 ? `de ${stats.totalQuantity.toLocaleString('pt-BR')} disponíveis` : undefined}
				/>
				<MetricCard icon={Ticket} label="Reservados" value={metrics.reserved.toLocaleString('pt-BR')} />
				<MetricCard icon={TrendingUp} label="Receita bruta" value={formatCurrency(metrics.revenue)} />
				<MetricCard
					icon={Users}
					label="Capacidade"
					value={event.max_attendees ? String(event.max_attendees) : 'Ilimitada'}
				/>
			</div>

			<Tabs defaultValue="informacoes" className="space-y-4">
				<TabsList>
					<TabsTrigger value="informacoes" className="gap-1.5">
						<Info className="size-4" />
						Informações
					</TabsTrigger>
					<TabsTrigger value="ingressos" className="gap-1.5">
						<Ticket className="size-4" />
						Ingressos
						{storedTickets.length > 0 && (
							<Badge variant="secondary" className="tabular-nums">
								{storedTickets.length}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="cupons" className="gap-1.5">
						<TicketPercent className="size-4" />
						Cupons
					</TabsTrigger>
				</TabsList>

				<TabsContent value="cupons" className="space-y-4">
					<EventCoupons eventId={evento_id} />
				</TabsContent>

				<TabsContent value="informacoes" className="space-y-4">
					<div className="grid gap-4 lg:grid-cols-3">
						<Card className="p-5 lg:col-span-2">
							<h2 className="text-sm font-semibold text-foreground">Sobre o evento</h2>
							{event.description ? (
								<Text className="prose-sm mt-2 text-muted-foreground" content={event.description} />
							) : (
								<p className="mt-2 text-sm leading-6 text-muted-foreground">Nenhuma descrição cadastrada.</p>
							)}
						</Card>

						<Card className="p-5">
							<h2 className="text-sm font-semibold text-foreground">Detalhes</h2>
							<div className="mt-2">
								<InfoRow icon={Calendar} label="Início">
									{formatDateTime(event.start_date)}
								</InfoRow>
								<InfoRow icon={Calendar} label="Término">
									{formatDateTime(event.end_date)}
								</InfoRow>
								<InfoRow icon={event.event_type === 'online' ? Globe : MapPin} label="Local">
									{event.location_tbd
										? 'Local a definir'
										: event.event_type === 'online'
											? (event.online_url ?? 'Link não informado')
											: (event.location_name ?? event.location_address ?? 'Não informado')}
								</InfoRow>
								<InfoRow icon={Ticket} label="Modelo">
									{isFree ? 'Evento gratuito' : 'Evento pago'}
								</InfoRow>
							</div>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="ingressos" className="space-y-4">
					<EventTicketManager
						eventId={evento_id}
						tickets={storedTickets}
						registrations={registrations}
						isFree={isFree}
						onChanged={() => router.refresh()}
					/>
				</TabsContent>
			</Tabs>

			<AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Publicar evento</AlertDialogTitle>
						<AlertDialogDescription>
							A página ficará disponível conforme a visibilidade escolhida e as inscrições abrirão nas datas
							configuradas. Você poderá despublicar o evento depois.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{publishError && (
						<Alert variant="destructive" role="alert" className="border text-sm">
							<AlertDescription>{publishError}</AlertDescription>
						</Alert>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								void confirmPublish();
							}}
							loading={busy}
						>
							Publicar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Despublicar evento</AlertDialogTitle>
						<AlertDialogDescription>
							O evento sai da página pública e deixa de receber novas inscrições. Seus ingressos e participantes
							continuam no painel.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{unpublishError && (
						<Alert variant="destructive" role="alert" className="text-sm">
							<AlertDescription>{unpublishError}</AlertDescription>
						</Alert>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							loading={busy}
							onClick={(e) => {
								e.preventDefault();
								void confirmUnpublish();
							}}
						>
							Despublicar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={eventDeleteOpen} onOpenChange={setEventDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir evento</AlertDialogTitle>
						<AlertDialogDescription>
							&ldquo;{event.title}&rdquo; e seus ingressos serão removidos permanentemente. Esta ação não pode ser
							desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeleteEvent} loading={busy}>
							Excluir evento
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
