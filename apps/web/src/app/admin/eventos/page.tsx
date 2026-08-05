'use client';

import Link from 'next/link';
import { Plus, Calendar, Users, Clock, LayoutGrid, Table2, MapPin, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { Event } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { EventsTable } from './_components/EventsTable';

export default function EventosPage() {
	const { user } = useServerAuth();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchEvents = useCallback(async () => {
		try {
			const response = await fetch('/api/events', { credentials: 'include' });
			if (!response.ok) throw new Error('Não foi possível carregar os eventos.');
			const payload = (await response.json()) as { data: Event[] };
			setEvents(payload.data ?? []);
		} catch (error) {
			console.error('Error fetching events:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (user) {
			fetchEvents();
		} else {
			setLoading(false);
		}
	}, [user, fetchEvents]);

	const preparedEvents = useMemo(
		() =>
			events.map((event) => ({
				event,
				participantsCount: Array.isArray(event.registrations) ? event.registrations.length : 0,
			})),
		[events],
	);

	const eventStats = useMemo(() => {
		if (preparedEvents.length === 0) {
			return {
				total: 0,
				published: 0,
				drafts: 0,
				upcoming: 0,
				participants: 0,
			};
		}

		const now = Date.now();

		const totals = preparedEvents.reduce(
			(acc, item) => {
				acc.total += 1;
				acc.participants += item.participantsCount;

				if (item.event.status === 'published') {
					acc.published += 1;
				} else if (item.event.status === 'draft') {
					acc.drafts += 1;
				}

				const eventStart = item.event.start_date ? new Date(item.event.start_date).getTime() : undefined;
				if (eventStart && eventStart > now && item.event.status === 'published') {
					acc.upcoming += 1;
				}

				return acc;
			},
			{
				total: 0,
				published: 0,
				drafts: 0,
				upcoming: 0,
				participants: 0,
			},
		);

		return totals;
	}, [preparedEvents]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full size-8 border-b-2 border-accent"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Carregando eventos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="space-y-1">
					<h1 className="text-3xl font-bold tracking-tight text-foreground">Meus Eventos</h1>
					<p className="text-muted-foreground">Acompanhe o desempenho e crie novas experiências.</p>
				</div>
				<Button asChild className="gap-2">
					<Link href="/admin/eventos/novo">
						<Plus className="size-4" />
						Criar evento
					</Link>
				</Button>
			</div>

			{preparedEvents.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card className="border-dashed">
						<CardHeader className="pb-2">
							<CardDescription>Total de eventos</CardDescription>
							<CardTitle className="text-3xl">{eventStats.total}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Badge variant="outline" className="border-transparent bg-muted/60 text-muted-foreground">
								Publicados {eventStats.published}
							</Badge>
							<Badge variant="outline" className="border-transparent bg-muted/60 text-muted-foreground">
								Rascunhos {eventStats.drafts}
							</Badge>
						</CardContent>
					</Card>

					<Card className="border-dashed">
						<CardHeader className="pb-2">
							<CardDescription>Próximos 30 dias</CardDescription>
							<CardTitle className="text-3xl">{eventStats.upcoming}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Clock className="size-4 text-primary" />
							<span>Eventos publicados com data futura</span>
						</CardContent>
					</Card>

					<Card className="border-dashed">
						<CardHeader className="pb-2">
							<CardDescription>Participantes confirmados</CardDescription>
							<CardTitle className="text-3xl">{eventStats.participants}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Users className="size-4 text-primary" />
							<span>Total de inscrições registradas</span>
						</CardContent>
					</Card>

					<Card className="border-dashed">
						<CardHeader className="pb-2">
							<CardDescription>Eventos em destaque</CardDescription>
							<CardTitle className="text-3xl">
								{preparedEvents.filter(({ event }) => event.featured).length}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Badge variant="secondary" className="border-transparent">
								Destaque ativo
							</Badge>
							<span>Usado para destacar na vitrine</span>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Events List */}
			{preparedEvents.length > 0 ? (
				<Tabs defaultValue="table" className="w-full">
					<TabsList className="mb-4 grid w-full max-w-[400px] grid-cols-2">
						<TabsTrigger value="table" className="gap-2">
							<Table2 className="size-4" />
							Tabela
						</TabsTrigger>
						<TabsTrigger value="grid" className="gap-2">
							<LayoutGrid className="size-4" />
							Cards
						</TabsTrigger>
					</TabsList>

					<TabsContent value="table" className="mt-0">
						<EventsTable data={preparedEvents} onEventDeleted={fetchEvents} />
					</TabsContent>

					<TabsContent value="grid" className="mt-0">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
							{preparedEvents.map(({ event, participantsCount }) => (
								<EventCard key={event.id} event={event} participantsCount={participantsCount} />
							))}
						</div>
					</TabsContent>
				</Tabs>
			) : (
				/* Empty State */
				<Card className="grid place-items-center border-dashed py-16 text-center">
					<CardHeader className="items-center">
						<div className="rounded-full border border-dashed border-border/80 p-4">
							<Calendar className="size-10 text-muted-foreground" />
						</div>
						<CardTitle className="text-xl">Nenhum evento criado ainda</CardTitle>
						<CardDescription>Crie seu primeiro evento e acompanhe tudo por aqui.</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button asChild className="gap-2">
							<Link href="/admin/eventos/novo">
								<Plus className="size-4" />
								Criar primeiro evento
							</Link>
						</Button>
					</CardFooter>
				</Card>
			)}
		</div>
	);
}

interface EventCardProps {
	event: Event;
	participantsCount: number;
}

function EventCard({ event, participantsCount }: EventCardProps) {
	const formatDate = (dateString: string) => {
		if (!dateString) {
			return 'Data a definir';
		}

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
				className:
					'border-transparent bg-emerald-500/10 text-emerald-700 shadow-none dark:bg-emerald-400/10 dark:text-emerald-200',
			},
			draft: {
				label: 'Rascunho',
				className:
					'border-transparent bg-muted text-muted-foreground shadow-none dark:bg-muted/40 dark:text-muted-foreground',
			},
			cancelled: {
				label: 'Cancelado',
				className:
					'border-transparent bg-red-500/10 text-red-600 shadow-none dark:bg-red-500/20 dark:text-red-200',
			},
			archived: {
				label: 'Arquivado',
				className:
					'border-transparent bg-amber-500/10 text-amber-700 shadow-none dark:bg-amber-500/20 dark:text-amber-200',
			},
		};

		const statusInfo = statusMap[status || 'draft'];

return (
			<Badge
				variant="outline"
				className={cn('whitespace-nowrap border border-transparent text-xs font-medium', statusInfo.className)}
			>
				{statusInfo.label}
			</Badge>
		);
	};

	const getLocation = () => {
		if (event.event_type === 'online') {
			return 'Evento Online';
		}
		if (event.event_type === 'hybrid') {
			return `${event.location_address || 'Híbrido'} (Online e Presencial)`;
		}

return event.location_address || event.location_name || 'Local a definir';
	};

	const eventTypeMap: Record<string, string> = {
		online: 'Online',
		hybrid: 'Híbrido',
		in_person: 'Presencial',
	};

	const eventTypeLabel = eventTypeMap[event.event_type ?? ''] || 'Evento';
	const description = event.short_description || event.description || 'Sem descrição cadastrada.';

	return (
		<Link href={`/admin/eventos/${event.id}`} className="group h-full">
			<Card className="flex h-full flex-col transition-all hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
				<CardHeader className="space-y-3">
					<div className="flex items-start justify-between gap-3">
						<div className="space-y-1">
							<CardTitle className="line-clamp-2 text-lg leading-tight group-hover:text-primary">
								{event.title}
							</CardTitle>
							<CardDescription className="line-clamp-2 text-sm">{description}</CardDescription>
						</div>
						{getStatusBadge(event.status)}
					</div>

					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary" className="capitalize">
							{eventTypeLabel}
						</Badge>
						{event.featured ? (
							<Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
								Destaque
							</Badge>
						) : null}
						{event.is_free ? (
							<Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-emerald-600">
								Gratuito
							</Badge>
						) : null}
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="space-y-2 text-sm text-muted-foreground">
						<div className="flex items-center gap-2">
							<Calendar className="size-4 text-primary" />
							<span className="line-clamp-1">{formatDate(event.start_date)}</span>
						</div>
						<div className="flex items-center gap-2">
							<MapPin className="size-4 text-primary" />
							<span className="line-clamp-1">{getLocation()}</span>
						</div>
					</div>

					<Separator />

					<div className="flex items-center justify-between text-sm">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Users className="size-4 text-primary" />
							<span>
								{participantsCount} participante{participantsCount !== 1 ? 's' : ''}
							</span>
						</div>
						{event.max_attendees ? (
							<Badge variant="outline" className="border-transparent bg-muted/60 text-xs text-muted-foreground">
								Limite {event.max_attendees}
							</Badge>
						) : null}
					</div>
				</CardContent>

				<CardFooter className="mt-auto flex items-center justify-between pt-4 text-sm text-muted-foreground">
					<span className="font-medium">Ver detalhes</span>
					<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
				</CardFooter>
			</Card>
		</Link>
	);
}
