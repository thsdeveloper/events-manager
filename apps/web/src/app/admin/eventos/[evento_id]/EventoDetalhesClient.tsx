'use client';

import {
	ArrowLeft,
	Calendar,
	Edit,
	ExternalLink,
	Globe,
	Info,
	MapPin,
	Settings,
	Star,
	Ticket,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketFormSheet } from '@/features/tickets/components/TicketFormSheet';
import { TicketList } from '@/features/tickets/components/TicketList';
import type { TicketDraft } from '@/features/tickets/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/fees';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
	draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
	published: { label: 'Publicado', className: 'bg-emerald-100 text-emerald-700' },
	cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
	archived: { label: 'Arquivado', className: 'bg-amber-100 text-amber-700' },
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

/** Maps a stored ticket onto the shape the shared sheet and list expect. */
function toTicketDraft(ticket: EventTicket): TicketDraft {
	return {
		id: ticket.id,
		title: ticket.title ?? '',
		description: ticket.description ?? null,
		quantity: ticket.quantity ?? 0,
		price: Number(ticket.price ?? 0),
		service_fee_type: (ticket.service_fee_type ?? 'passed_to_buyer') as TicketDraft['service_fee_type'],
		visibility: (ticket.visibility ?? 'public') as TicketDraft['visibility'],
		sale_start_date: ticket.sale_start_date ?? null,
		sale_end_date: ticket.sale_end_date ?? null,
		min_quantity_per_purchase: ticket.min_quantity_per_purchase ?? 1,
		max_quantity_per_purchase: ticket.max_quantity_per_purchase ?? 5,
		allow_installments: ticket.allow_installments ?? false,
		max_installments: ticket.max_installments ?? null,
	};
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
	return (
		<div className="rounded-lg border bg-card p-4">
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

	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingTicket, setEditingTicket] = useState<TicketDraft | null>(null);
	const [ticketToDelete, setTicketToDelete] = useState<TicketDraft | null>(null);
	const [eventDeleteOpen, setEventDeleteOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	const storedTickets = useMemo(() => (event.tickets ?? []) as EventTicket[], [event.tickets]);
	const tickets = useMemo(() => storedTickets.map(toTicketDraft), [storedTickets]);
	const participantsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;
	const isFree = Boolean(event.is_free);

	const stats = useMemo(() => {
		const totalQuantity = storedTickets.reduce((sum, ticket) => sum + (ticket.quantity ?? 0), 0);
		const totalSold = storedTickets.reduce((sum, ticket) => sum + (ticket.quantity_sold ?? 0), 0);
		const revenue = storedTickets.reduce(
			(sum, ticket) => sum + (ticket.quantity_sold ?? 0) * Number(ticket.price ?? 0),
			0,
		);

		return { totalQuantity, totalSold, revenue };
	}, [storedTickets]);

	const status = STATUS_STYLES[event.status ?? 'draft'] ?? STATUS_STYLES.draft;

	const handleAddTicket = useCallback(() => {
		setEditingTicket(null);
		setSheetOpen(true);
	}, []);

	const handleEditTicket = useCallback((ticket: TicketDraft) => {
		setEditingTicket(ticket);
		setSheetOpen(true);
	}, []);

	// The sheet already persisted the change, so the server data is refetched
	// rather than mirrored in local state — one source of truth.
	const handleTicketSaved = useCallback(() => {
		setEditingTicket(null);
		router.refresh();
	}, [router]);

	const handleRemoveTicket = useCallback(
		(ticket: TicketDraft) => {
			const stored = storedTickets.find(item => item.id === ticket.id);
			if (stored?.quantity_sold) {
				toast({
					title: 'Ingresso com vendas',
					description: `Já existem ${stored.quantity_sold} vendas deste ingresso. Desative-o em vez de excluir.`,
					variant: 'destructive',
				});

				return;
			}
			setTicketToDelete(ticket);
		},
		[storedTickets, toast],
	);

	const confirmDeleteTicket = useCallback(async () => {
		if (!ticketToDelete?.id) return;
		setBusy(true);
		try {
			const response = await fetch(`/api/admin/ingressos/${ticketToDelete.id}`, { method: 'DELETE' });
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail ?? 'Não foi possível excluir o ingresso.');
			}
			toast({ title: 'Ingresso excluído', variant: 'success' });
			setTicketToDelete(null);
			router.refresh();
		} catch (error) {
			toast({
				title: 'Erro ao excluir',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	}, [router, ticketToDelete, toast]);

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
		} catch (error) {
			toast({
				title: 'Erro ao excluir',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
			setBusy(false);
		}
	}, [evento_id, router, toast]);

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
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<Link
						href="/admin/eventos"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" />
						Eventos
					</Link>
					<div className="mt-2 flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">{event.title}</h1>
						<span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', status.className)}>{status.label}</span>
						{event.featured && (
							<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
								<Star className="size-3" />
								Destaque
							</span>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{event.slug && (
						<Button variant="outline" size="sm" asChild>
							<Link href={`/eventos/${event.slug}`} target="_blank">
								<ExternalLink className="mr-2 size-4" />
								Ver página
							</Link>
						</Button>
					)}
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
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard icon={UserCheck} label="Inscritos" value={participantsCount.toLocaleString('pt-BR')} />
				<MetricCard
					icon={Ticket}
					label="Ingressos vendidos"
					value={stats.totalSold.toLocaleString('pt-BR')}
					hint={stats.totalQuantity > 0 ? `de ${stats.totalQuantity.toLocaleString('pt-BR')} disponíveis` : undefined}
				/>
				<MetricCard icon={TrendingUp} label="Receita bruta" value={formatCurrency(stats.revenue)} />
				<MetricCard icon={Users} label="Capacidade" value={event.max_attendees ? String(event.max_attendees) : 'Ilimitada'} />
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
						{tickets.length > 0 && (
							<span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{tickets.length}</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="informacoes" className="space-y-4">
					<div className="grid gap-4 lg:grid-cols-3">
						<div className="rounded-lg border bg-card p-5 lg:col-span-2">
							<h2 className="text-sm font-semibold text-foreground">Sobre o evento</h2>
							<p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
								{event.description || 'Nenhuma descrição cadastrada.'}
							</p>
						</div>

						<div className="rounded-lg border bg-card p-5">
							<h2 className="text-sm font-semibold text-foreground">Detalhes</h2>
							<div className="mt-2">
								<InfoRow icon={Calendar} label="Início">
									{formatDateTime(event.start_date)}
								</InfoRow>
								<InfoRow icon={Calendar} label="Término">
									{formatDateTime(event.end_date)}
								</InfoRow>
								<InfoRow icon={event.event_type === 'online' ? Globe : MapPin} label="Local">
									{event.event_type === 'online'
										? (event.online_url ?? 'Link não informado')
										: (event.location_name ?? event.location_address ?? 'Não informado')}
								</InfoRow>
								<InfoRow icon={Ticket} label="Modelo">
									{isFree ? 'Evento gratuito' : 'Evento pago'}
								</InfoRow>
							</div>
						</div>
					</div>

					<div className="flex justify-end">
						<Button variant="ghost" size="sm" onClick={requestDeleteEvent} className="text-destructive hover:bg-destructive/10">
							<Trash2 className="mr-2 size-4" />
							Excluir evento
						</Button>
					</div>
				</TabsContent>

				<TabsContent value="ingressos" className="space-y-4">
					{!isFree && tickets.length === 0 && (
						<p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Este evento é pago e ainda não tem nenhum tipo de ingresso. O público não consegue se inscrever até que
							você cadastre pelo menos um.
						</p>
					)}
					<TicketList
						tickets={tickets}
						isFree={isFree}
						onAdd={handleAddTicket}
						onEdit={handleEditTicket}
						onRemove={handleRemoveTicket}
						emptyHint={
							isFree
								? 'Em eventos gratuitos os ingressos são opcionais — use para separar categorias de inscrição.'
								: undefined
						}
					/>
				</TabsContent>
			</Tabs>

			<TicketFormSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				pricing={isFree ? 'free' : 'paid'}
				eventId={evento_id}
				ticket={editingTicket}
				onSaved={handleTicketSaved}
			/>

			<AlertDialog open={Boolean(ticketToDelete)} onOpenChange={open => !open && setTicketToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ingresso</AlertDialogTitle>
						<AlertDialogDescription>
							O ingresso &ldquo;{ticketToDelete?.title}&rdquo; será removido permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDeleteTicket} loading={busy}>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={eventDeleteOpen} onOpenChange={setEventDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir evento</AlertDialogTitle>
						<AlertDialogDescription>
							&ldquo;{event.title}&rdquo; e seus ingressos serão removidos permanentemente. Esta ação não pode ser desfeita.
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
