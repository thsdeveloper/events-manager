'use client';

import Link from 'next/link';
import {
	ArrowLeft,
	Edit,
	Users,
	UserCheck,
	Settings,
	Calendar,
	MapPin,
	Globe,
	DollarSign,
	Tag,
	Star,
	Ticket,
	Plus,
	TrendingUp,
	AlertCircle,
	CheckCircle,
	XCircle,
	Trash2,
	ExternalLink,
	Loader2,
	type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Event, EventTicket } from '@events-manager/contracts';
import TicketFormModal from '@/components/admin/TicketFormModal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
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

interface EventoDetalhesClientProps {
	initialEvent: Event;
	evento_id: string;
}

export default function EventoDetalhesClient({ initialEvent, evento_id }: EventoDetalhesClientProps) {
	const { toast } = useToast();
	const router = useRouter();
	const event = initialEvent;
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [ticketType, setTicketType] = useState<'paid' | 'free'>('paid');
	const [editingTicket, setEditingTicket] = useState<EventTicket | null>(null);
	const [ticketToDelete, setTicketToDelete] = useState<EventTicket | null>(null);
	const [eventDeleteOpen, setEventDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const reloadEventData = () => {
		// Refresh the page to get updated data from server
		router.refresh();
	};

	const handleCreateTicket = (type: 'paid' | 'free') => {
		if (event?.is_free) {
			toast({
				title: 'Não permitido',
				description: 'Este evento está marcado como gratuito. Não é possível cadastrar ingressos em eventos gratuitos.',
				variant: 'destructive',
			});

			return;
		}
		setTicketType(type);
		setEditingTicket(null);
		setIsModalOpen(true);
	};

	const handleEditTicket = (ticket: EventTicket) => {
		setEditingTicket(ticket);
		setTicketType(parseFloat(String(ticket.price || '0')) > 0 ? 'paid' : 'free');
		setIsModalOpen(true);
	};

	const handleTicketSaved = async () => {
		setIsModalOpen(false);
		setEditingTicket(null);
		reloadEventData();
	};

	const handleDeleteTicket = async (ticket: EventTicket) => {
		// Verificar se o ingresso já tem vendas
		if (ticket.quantity_sold && ticket.quantity_sold > 0) {
			toast({
				title: 'Não é possível excluir',
				description: `Este ingresso já possui ${ticket.quantity_sold} venda(s). Você pode desativá-lo ao invés de excluir.`,
				variant: 'destructive',
			});

			return;
		}

		setTicketToDelete(ticket);
	};

	const confirmDeleteTicket = async () => {
		if (!ticketToDelete) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/admin/ingressos/${ticketToDelete.id}`, { method: 'DELETE' });
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail ?? 'Erro ao excluir ingresso');
			}

			toast({
				title: 'Sucesso',
				description: 'Ingresso excluído com sucesso!',
				variant: 'success',
			});

			reloadEventData();
			setTicketToDelete(null);
		} catch (error) {
			toast({
				title: 'Erro',
				description: error instanceof Error ? error.message : 'Erro ao excluir ingresso',
				variant: 'destructive',
			});
		} finally {
			setDeleting(false);
		}
	};

	const handleDeleteEvent = async () => {
		if (!event) return;

		const participantsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;
		const tickets = (event.tickets || []) as EventTicket[];
		const totalSold = tickets.reduce((sum, ticket) => sum + (ticket.quantity_sold ?? 0), 0);

		// Verificar se há ingressos vendidos ou participantes
		if (totalSold > 0 || participantsCount > 0) {
			toast({
				title: 'Não é possível excluir',
				description: `Este evento possui ${totalSold > 0 ? `${totalSold} ingresso(s) vendido(s)` : ''}${totalSold > 0 && participantsCount > 0 ? ' e ' : ''}${participantsCount > 0 ? `${participantsCount} participante(s) registrado(s)` : ''}. Você pode arquivá-lo ao invés de excluir.`,
				variant: 'destructive',
			});

			return;
		}

		setEventDeleteOpen(true);
	};

	const confirmDeleteEvent = async () => {
		setDeleting(true);
		try {
			const response = await fetch(`/api/events/${evento_id}`, { method: 'DELETE' });
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail ?? 'Erro ao excluir evento');
			}

			toast({
				title: 'Sucesso',
				description: 'Evento excluído com sucesso!',
				variant: 'success',
			});

			router.push('/admin/eventos');
		} catch (error) {
			toast({
				title: 'Erro',
				description: error instanceof Error ? error.message : 'Erro ao excluir evento',
				variant: 'destructive',
			});
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);

		return date.toLocaleDateString('pt-BR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const getStatusBadge = (status?: string) => {
		const statusMap: Record<string, { label: string; className: string }> = {
			published: {
				label: 'Publicado',
				className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
			},
			draft: {
				label: 'Rascunho',
				className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
			},
			cancelled: {
				label: 'Cancelado',
				className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
			},
			archived: {
				label: 'Arquivado',
				className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
			},
		};

		const statusInfo = statusMap[status || 'draft'];

		return <span className={`px-3 py-1 text-sm font-medium rounded ${statusInfo.className}`}>{statusInfo.label}</span>;
	};

	const participantsCount = Array.isArray(event.registrations) ? event.registrations.length : 0;
	const tickets = (event.tickets || []) as EventTicket[];

	// Calcular estatísticas dos ingressos
	const ticketStats = {
		total: tickets.length,
		active: tickets.filter((t) => t.status === 'active').length,
		soldOut: tickets.filter((t) => t.status === 'sold_out').length,
		totalQuantity: tickets.reduce((sum, t) => sum + (t.quantity ?? 0), 0),
		totalSold: tickets.reduce((sum, t) => sum + (t.quantity_sold ?? 0), 0),
		totalRevenue: tickets.reduce((sum, t) => sum + (t.quantity_sold ?? 0) * parseFloat(String(t.price ?? '0')), 0),
	};

	const getTicketStatusBadge = (status?: string) => {
		const statusMap: Record<string, { label: string; icon: LucideIcon; className: string }> = {
			active: {
				label: 'Ativo',
				icon: CheckCircle,
				className:
					'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800',
			},
			sold_out: {
				label: 'Esgotado',
				icon: AlertCircle,
				className:
					'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800',
			},
			inactive: {
				label: 'Inativo',
				icon: XCircle,
				className:
					'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-800',
			},
		};

		const statusInfo = statusMap[status || 'inactive'];
		const Icon = statusInfo.icon;

		return (
			<span
				className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}
			>
				<Icon className="size-3.5" />
				{statusInfo.label}
			</span>
		);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						href="/admin/eventos"
						className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<ArrowLeft className="size-5" />
					</Link>
					<div>
						<div className="flex items-center gap-3">
							<h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
							{getStatusBadge(event.status)}
						</div>
						<p className="text-gray-600 dark:text-gray-400 mt-1">{event.slug}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href={`/eventos/${event.slug}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
					>
						<ExternalLink className="size-4" />
						Ver Página Pública
					</Link>
					<Link
						href={`/admin/eventos/${evento_id}/editar`}
						className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
					>
						<Edit className="size-4" />
						Editar
					</Link>
					<button
						onClick={handleDeleteEvent}
						className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						<Trash2 className="size-4" />
						Excluir
					</button>
				</div>
			</div>

			{/* Event Info */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Informações do Evento</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<Calendar className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Data de Início</p>
								<p className="font-medium text-gray-900 dark:text-white">{formatDate(event.start_date)}</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<Calendar className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Data de Término</p>
								<p className="font-medium text-gray-900 dark:text-white">{formatDate(event.end_date)}</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<MapPin className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Tipo de Evento</p>
								<p className="font-medium text-gray-900 dark:text-white capitalize">
									{event.event_type === 'in_person' && 'Presencial'}
									{event.event_type === 'online' && 'Online'}
									{event.event_type === 'hybrid' && 'Híbrido'}
								</p>
							</div>
						</div>

						{event.location_address && (
							<div className="flex items-start gap-3">
								<MapPin className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Localização</p>
									<p className="font-medium text-gray-900 dark:text-white">{event.location_address}</p>
								</div>
							</div>
						)}

						{event.online_url && (
							<div className="flex items-start gap-3">
								<Globe className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Link Online</p>
									<a
										href={event.online_url}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium text-accent hover:underline"
									>
										{event.online_url}
									</a>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<Users className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Participantes</p>
								<p className="font-medium text-gray-900 dark:text-white">
									{participantsCount}
									{event.max_attendees && ` / ${event.max_attendees} vagas`}
								</p>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<DollarSign className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">Tipo</p>
								<p className="font-medium text-gray-900 dark:text-white">{event.is_free ? 'Gratuito' : 'Pago'}</p>
							</div>
						</div>

						{event.featured && (
							<div className="flex items-start gap-3">
								<Star className="size-5 text-yellow-500 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400">Destaque</p>
									<p className="font-medium text-gray-900 dark:text-white">Evento em destaque</p>
								</div>
							</div>
						)}

						{event.tags && event.tags.length > 0 && (
							<div className="flex items-start gap-3">
								<Tag className="size-5 text-gray-400 mt-0.5 flex-shrink-0" />
								<div>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tags</p>
									<div className="flex flex-wrap gap-2">
										{event.tags.map((tag, index) => (
											<span
												key={index}
												className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{event.description && (
					<div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Descrição</h3>
						<p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{event.description}</p>
					</div>
				)}
			</div>

			{/* Gerenciamento de Ingressos */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div className="p-6 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="size-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
								<Ticket className="size-5 text-purple-600 dark:text-purple-400" />
							</div>
							<div>
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gerenciamento de Ingressos</h2>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{event.is_free
										? 'Evento gratuito - entrada livre'
										: `${ticketStats.total} ${ticketStats.total === 1 ? 'tipo de ingresso' : 'tipos de ingressos'}`}
								</p>
							</div>
						</div>
						{!event.is_free && (
							<button
								onClick={() => handleCreateTicket('paid')}
								className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors shadow-sm"
							>
								<Plus className="size-4" />
								Novo Ingresso
							</button>
						)}
					</div>

					{event.is_free && (
						<div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								ℹ️ <strong>Evento Gratuito:</strong> Este evento está configurado como gratuito. Não é possível criar
								ingressos para eventos gratuitos. Os participantes podem se inscrever diretamente sem custo.
							</p>
						</div>
					)}

					{/* Estatísticas dos Ingressos */}
					{!event.is_free && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
							<div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
								<div className="flex items-center gap-3">
									<div className="size-10 bg-blue-500 rounded-lg flex items-center justify-center">
										<Ticket className="size-5 text-white" />
									</div>
									<div>
										<p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total de Tipos</p>
										<p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{ticketStats.total}</p>
									</div>
								</div>
							</div>

							<div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-100 dark:border-green-900">
								<div className="flex items-center gap-3">
									<div className="size-10 bg-green-500 rounded-lg flex items-center justify-center">
										<CheckCircle className="size-5 text-white" />
									</div>
									<div>
										<p className="text-sm text-green-600 dark:text-green-400 font-medium">Ingressos Vendidos</p>
										<p className="text-2xl font-bold text-green-900 dark:text-green-100">
											{ticketStats.totalSold} / {ticketStats.totalQuantity}
										</p>
									</div>
								</div>
							</div>

							<div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
								<div className="flex items-center gap-3">
									<div className="size-10 bg-purple-500 rounded-lg flex items-center justify-center">
										<TrendingUp className="size-5 text-white" />
									</div>
									<div>
										<p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Disponíveis</p>
										<p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
											{ticketStats.totalQuantity - ticketStats.totalSold}
										</p>
									</div>
								</div>
							</div>

							<div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-100 dark:border-amber-900">
								<div className="flex items-center gap-3">
									<div className="size-10 bg-amber-500 rounded-lg flex items-center justify-center">
										<DollarSign className="size-5 text-white" />
									</div>
									<div>
										<p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Receita</p>
										<p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
											R$ {ticketStats.totalRevenue.toFixed(2)}
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Lista de Ingressos */}
				{!event.is_free && (
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{tickets.length === 0 ? (
							<div className="p-12 text-center">
								<div className="size-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
									<Ticket className="size-8 text-gray-400" />
								</div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum ingresso cadastrado</h3>
								<p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
									Comece criando tipos de ingressos para seu evento. Você pode criar diferentes categorias com preços e
									quantidades variadas.
								</p>
								<button
									onClick={() => handleCreateTicket('paid')}
									className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors shadow-sm"
								>
									<Plus className="size-5" />
									Criar Primeiro Ingresso
								</button>
							</div>
						) : (
							tickets.map((ticket) => {
								const available = Math.max((ticket.quantity ?? 0) - (ticket.quantity_sold ?? 0), 0);
								const totalQuantity = ticket.quantity ?? 0;
								const percentageSold = totalQuantity > 0 ? ((ticket.quantity_sold ?? 0) / totalQuantity) * 100 : 0;
								const isAlmostSoldOut = percentageSold >= 80 && percentageSold < 100;

								return (
									<div key={ticket.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[rgb(20,28,39)] transition-colors">
										<div className="flex items-start justify-between gap-4">
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-3 mb-2">
													<h3 className="text-lg font-semibold text-gray-900 dark:text-white">{ticket.title}</h3>
													{getTicketStatusBadge(ticket.status)}
													{isAlmostSoldOut && ticket.status === 'active' && (
														<span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full border border-orange-200 dark:border-orange-800">
															<AlertCircle className="size-3" />
															Últimas unidades
														</span>
													)}
												</div>

												{ticket.description && (
													<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{ticket.description}</p>
												)}

												<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
													<div>
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preço</p>
														<p className="text-lg font-bold text-gray-900 dark:text-white">
															{parseFloat(String(ticket.price || '0')) === 0
																? 'Gratuito'
																: `R$ ${parseFloat(String(ticket.price || '0')).toFixed(2)}`}
														</p>
														{(ticket.service_fee_type ?? 'passed_to_buyer') === 'passed_to_buyer' &&
															parseFloat(String(ticket.price || '0')) > 0 && (
																<p className="text-xs text-gray-500 dark:text-gray-400">+ taxa de serviço</p>
															)}
													</div>

													<div>
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Disponíveis</p>
														<p className="text-lg font-bold text-gray-900 dark:text-white">{available}</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">de {ticket.quantity ?? 0}</p>
													</div>

													<div>
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendidos</p>
														<p className="text-lg font-bold text-gray-900 dark:text-white">
															{ticket.quantity_sold ?? 0}
														</p>
														<p className="text-xs text-gray-500 dark:text-gray-400">
															{percentageSold.toFixed(0)}% vendido
														</p>
													</div>

													<div>
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Visibilidade</p>
														<p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
															{ticket.visibility === 'public' && 'Público'}
															{ticket.visibility === 'invited_only' && 'Convidados'}
															{ticket.visibility === 'manual' && 'Manual'}
														</p>
													</div>
												</div>

												{/* Barra de Progresso */}
												<div className="mt-4">
													<div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
														<span>Progresso de vendas</span>
														<span>{percentageSold.toFixed(1)}%</span>
													</div>
													<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
														<div
															className={`h-full transition-all duration-500 ${
																percentageSold >= 100
																	? 'bg-red-500'
																	: percentageSold >= 80
																		? 'bg-orange-500'
																		: 'bg-green-500'
															}`}
															style={{ width: `${Math.min(percentageSold, 100)}%` }}
														/>
													</div>
												</div>
											</div>

											<div className="flex flex-col gap-2">
												<button
													onClick={() => handleEditTicket(ticket)}
													className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
													title="Editar ingresso"
												>
													<Edit className="size-4" />
												</button>
												<button
													onClick={() => handleDeleteTicket(ticket)}
													className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
													title="Excluir ingresso"
												>
													<Trash2 className="size-4" />
												</button>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				)}
			</div>

			{/* Quick Actions */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link
					href={`/admin/eventos/${evento_id}/participantes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
							<Users className="size-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">Participantes</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">Gerenciar participantes</p>
						</div>
					</div>
				</Link>

				<Link
					href={`/admin/eventos/${evento_id}/inscricoes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
							<UserCheck className="size-6 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">Inscrições</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">Ver inscrições</p>
						</div>
					</div>
				</Link>

				<Link
					href={`/admin/eventos/${evento_id}/configuracoes`}
					className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-accent transition-colors"
				>
					<div className="flex items-center gap-4">
						<div className="size-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
							<Settings className="size-6 text-purple-600 dark:text-purple-400" />
						</div>
						<div>
							<h3 className="font-semibold text-gray-900 dark:text-white">Configurações</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400">Ajustes do evento</p>
						</div>
					</div>
				</Link>
			</div>

			{/* Modal de Criação/Edição de Ingresso */}
			<TicketFormModal
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setEditingTicket(null);
				}}
				eventId={evento_id}
				ticketType={ticketType}
				editingTicket={editingTicket}
				onTicketSaved={handleTicketSaved}
			/>

			<AlertDialog
				open={Boolean(ticketToDelete)}
				onOpenChange={(open) => !open && !deleting && setTicketToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir ingresso?</AlertDialogTitle>
						<AlertDialogDescription>
							O ingresso “{ticketToDelete?.title}” será removido permanentemente. Esta ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Manter ingresso</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleting}
							onClick={(event) => {
								event.preventDefault();
								void confirmDeleteTicket();
							}}
						>
							{deleting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
							Excluir ingresso
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={eventDeleteOpen} onOpenChange={(open) => !deleting && setEventDeleteOpen(open)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir evento?</AlertDialogTitle>
						<AlertDialogDescription>
							O evento “{event.title}” e seus ingressos sem vendas serão removidos permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Manter evento</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleting}
							onClick={(dialogEvent) => {
								dialogEvent.preventDefault();
								void confirmDeleteEvent();
							}}
						>
							{deleting && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
							Excluir evento
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
