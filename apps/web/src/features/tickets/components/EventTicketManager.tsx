'use client';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCallback, useEffect, useState } from 'react';
import type { EventTicket, EventTicketGroupDraft } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/fees';
import { TicketList, type TicketGroupOption } from './TicketList';
import { TicketFormSheet } from './TicketFormSheet';
import { TicketGroupingEditor } from './TicketGroupingEditor';
import { ticketMetrics, type TicketStockRegistration } from '../metrics';
import type { TicketDraft } from '../types';
interface StoredGroup extends TicketGroupOption {
	sort?: number;
}
interface Props {
	eventId: string;
	tickets: EventTicket[];
	registrations?: TicketStockRegistration[];
	isFree: boolean;
	onChanged?: () => void;
}
const asDraft = (ticket: EventTicket): TicketDraft => ({
	id: ticket.id,
	title: ticket.title,
	description: ticket.description,
	price: Number(ticket.price),
	quantity: ticket.quantity,
	service_fee_type: ticket.service_fee_type,
	visibility: ticket.visibility ?? 'public',
	group_id: ticket.group_id,
	admission_type: ticket.admission_type ?? 'standard',
	sale_start_date: ticket.sale_start_date,
	sale_end_date: ticket.sale_end_date,
	min_quantity_per_purchase: ticket.min_quantity_per_purchase ?? 1,
	max_quantity_per_purchase: ticket.max_quantity_per_purchase ?? 5,
	allow_installments: ticket.allow_installments ?? false,
	allow_pix_installments: ticket.allow_pix_installments ?? false,
	max_pix_installments: ticket.max_pix_installments ?? null,
	min_amount_for_pix_installments: ticket.min_amount_for_pix_installments ?? 0,
	max_installments: ticket.max_installments,
	min_amount_for_installments: ticket.min_amount_for_installments,
});
const groupDraft = (group: StoredGroup): EventTicketGroupDraft => ({
	client_id: group.id,
	title: group.title,
	parent_client_id: group.parent_id ?? null,
	sort: group.sort ?? 0,
});
async function request(url: string, init?: RequestInit) {
	const response = await fetch(url, {
		credentials: 'include',
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	const body = await response.json().catch(() => null);
	if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar as alterações.');

	return body;
}
export function EventTicketManager({ eventId, tickets, registrations = [], isFree, onChanged }: Props) {
	const [items, setItems] = useState<TicketDraft[]>(() =>
		[...tickets].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map(asDraft),
	);
	const { can } = usePermissions();
	const groupEditing =
		can('tickets.create', eventId) && can('tickets.update', eventId) && can('tickets.delete', eventId);
	const [groups, setGroups] = useState<StoredGroup[]>([]);
	const [drafts, setDrafts] = useState<EventTicketGroupDraft[]>([]);
	const [busy, setBusy] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<TicketDraft | null>(null);
	const [removing, setRemoving] = useState<TicketDraft | null>(null);
	const endpoint = '/api/admin/eventos/' + eventId + '/grupos';
	const loadGroups = useCallback(async () => {
		setLoading(true);
		try {
			const body = await request(endpoint);
			const rows = body?.data ?? [];
			setGroups(rows);
			setDrafts(rows.map(groupDraft));
		} finally {
			setLoading(false);
		}
	}, [endpoint]);
	useEffect(() => {
		void loadGroups().catch((cause) => setError(cause.message));
	}, [loadGroups]);
	useEffect(() => {
		setItems([...tickets].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map(asDraft));
	}, [tickets]);
	const metrics = ticketMetrics(registrations);
	const available = tickets.reduce(
		(sum, ticket) => sum + Math.max(0, ticket.quantity - Number(ticket.quantity_sold ?? 0)),
		0,
	);
	const dirty = JSON.stringify(drafts) !== JSON.stringify(groups.map(groupDraft));
	async function saveGroups() {
		setBusy(true);
		setError(null);
		try {
			const ids = new Map(groups.map((group) => [group.id, group.id]));
			for (const draft of [
				...drafts.filter((group) => !group.parent_client_id),
				...drafts.filter((group) => group.parent_client_id),
			]) {
				const old = groups.find((group) => group.id === draft.client_id);
				const payload = {
					title: draft.title,
					parent_id: draft.parent_client_id ? ids.get(draft.parent_client_id) : null,
					sort: draft.sort ?? 0,
				};
				if (old) {
					if (old.title !== payload.title || old.parent_id !== payload.parent_id || old.sort !== payload.sort)
						await request(endpoint + '/' + old.id, { method: 'PATCH', body: JSON.stringify(payload) });
				} else {
					const created = await request(endpoint, {
						method: 'POST',
						body: JSON.stringify({ ...payload, event_id: eventId }),
					});
					ids.set(draft.client_id, created.id);
				}
			}
			const removed = groups
				.filter((group) => !drafts.some((draft) => draft.client_id === group.id))
				.sort((a, b) => Number(Boolean(b.parent_id)) - Number(Boolean(a.parent_id)));
			for (const group of removed) await request(endpoint + '/' + group.id, { method: 'DELETE' });
			await loadGroups();
			onChanged?.();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Erro ao salvar grupos.');
			await loadGroups().catch(() => undefined);
		} finally {
			setBusy(false);
		}
	}
	async function reorder(next: TicketDraft[]) {
		const previous = items;
		setItems(next);
		setBusy(true);
		setError(null);
		try {
			await request('/api/admin/eventos/' + eventId + '/ingressos/ordem', {
				method: 'POST',
				body: JSON.stringify({ ticket_ids: next.map((ticket) => ticket.id) }),
			});
			onChanged?.();
		} catch (cause) {
			setItems(previous);
			setError(cause instanceof Error ? cause.message : 'Erro ao ordenar.');
		} finally {
			setBusy(false);
		}
	}
	async function duplicate(ticket: TicketDraft) {
		setBusy(true);
		setError(null);
		try {
			await request('/api/admin/ingressos/' + ticket.id + '/duplicate', { method: 'POST' });
			onChanged?.();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Erro ao duplicar.');
		} finally {
			setBusy(false);
		}
	}
	function remove(ticket: TicketDraft) {
		if (Number(tickets.find((row) => row.id === ticket.id)?.quantity_sold ?? 0) > 0) {
			setError('Este ingresso possui vendas ou reservas. Desative-o para preservar os pedidos.');

			return;
		}
		setRemoving(ticket);
	}
	async function confirmRemove() {
		if (!removing?.id) return;
		setBusy(true);
		setError(null);
		try {
			await request('/api/admin/ingressos/' + removing.id, { method: 'DELETE' });
			setItems(items.filter((ticket) => ticket.id !== removing.id));
			setRemoving(null);
			onChanged?.();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Erro ao remover.');
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-5">
			<div className="grid gap-3 sm:grid-cols-5">
				{[
					{ label: 'Vendidos confirmados', value: metrics.sold },
					{ label: 'Reservas pendentes', value: metrics.reserved },
					{ label: 'Cancelados / liberados', value: metrics.cancelled },
					{ label: 'Disponíveis', value: available },
					{ label: 'Recebido', value: formatCurrency(metrics.revenue) },
				]
					.filter((metric) => metric.label !== 'Recebido' || can('finance.read', eventId))
					.map((metric) => (
						<Card key={metric.label} className="p-3">
							<p className="text-xs text-muted-foreground">{metric.label}</p>
							<p className="text-xl font-semibold">{metric.value}</p>
						</Card>
					))}
			</div>
			{error && (
				<Alert variant="destructive" role="alert" className="border text-sm">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{loading ? (
				<p role="status">Carregando grupos...</p>
			) : (
				<>
					<TicketGroupingEditor groups={drafts} onChange={setDrafts} disabled={busy || !groupEditing} />
					{dirty && groupEditing && (
						<div className="flex items-center gap-3">
							<Button type="button" onClick={() => void saveGroups()} disabled={busy}>
								Salvar grupos
							</Button>
							<Button type="button" variant="ghost" onClick={() => setDrafts(groups.map(groupDraft))} disabled={busy}>
								Descartar alterações dos grupos
							</Button>
						</div>
					)}
				</>
			)}
			<fieldset disabled={busy}>
				<TicketList
					permissions={{
						create: can('tickets.create', eventId),
						update: can('tickets.update', eventId),
						remove: can('tickets.delete', eventId),
					}}
					tickets={items}
					isFree={isFree}
					groups={groups}
					onAdd={() => {
						setEditing(null);
						setOpen(true);
					}}
					onEdit={(ticket) => {
						setEditing(ticket);
						setOpen(true);
					}}
					onRemove={remove}
					onReorder={(next) => void reorder(next)}
					onDuplicate={(ticket) => void duplicate(ticket)}
				/>
			</fieldset>
			<TicketFormSheet
				open={open}
				onOpenChange={setOpen}
				pricing={isFree ? 'free' : 'paid'}
				eventId={eventId}
				ticket={editing}
				groups={groups}
				onSaved={() => {
					setEditing(null);
					onChanged?.();
				}}
			/>
			<AlertDialog
				open={Boolean(removing)}
				onOpenChange={(value) => {
					if (!value) setRemoving(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ingresso</AlertDialogTitle>
						<AlertDialogDescription>
							O tipo de ingresso {removing?.title} será removido. Ingressos com vendas ou reservas não podem ser
							excluídos.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								void confirmRemove();
							}}
							disabled={busy}
						>
							Excluir ingresso
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
