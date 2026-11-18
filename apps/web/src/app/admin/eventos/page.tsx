'use client';
import { Can } from '@/components/auth/PermissionsProvider';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';

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

import { EventsEmptyState } from './_components/EventsEmptyState';
import { EventDraftList } from './_components/EventDraftList';
import { EventsTable } from './_components/EventsTable';
import { PageErrorState } from '@/components/design-system/molecules/PageErrorState';
import { PageLoadingState } from '@/components/design-system/molecules/PageLoadingState';

export default function EventosPage() {
	const { user, isLoading: authLoading } = useServerAuth();
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchEvents = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch('/api/events', { credentials: 'include' });
			if (!response.ok) throw new Error('Não foi possível carregar os eventos.');
			const payload = (await response.json()) as { data: Event[] };
			setEvents(payload.data ?? []);
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Não foi possível carregar os eventos.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (authLoading) return;
		if (user) {
			void fetchEvents();
		} else {
			setLoading(false);
		}
	}, [authLoading, user, fetchEvents]);

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

	if (authLoading || loading) return <PageLoadingState label="Carregando eventos" />;
	if (error)
		return <PageErrorState description={error} onRetry={() => void fetchEvents()} title="Eventos indisponíveis" />;

	return (
		<div className="space-y-8">
			<PageHeader
				title="Meus Eventos"
				description="Acompanhe o desempenho e crie novas experiências."
				actions={
					<Can permission={'events.create'}>
						<Button asChild className="gap-2">
							<Link href="/admin/eventos/novo">
								<Plus className="size-4" />
								Criar evento
							</Link>
						</Button>
					</Can>
				}
			/>

			<Can permission="events.create">
				<EventDraftList enabled={Boolean(user)} />
			</Can>
			{preparedEvents.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card className="">
						<CardHeader className="pb-2">
							<CardDescription>Total de eventos</CardDescription>
							<CardTitle className="text-3xl">{eventStats.total}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Badge variant="outline">Publicados {eventStats.published}</Badge>
							<Badge variant="outline">Rascunhos {eventStats.drafts}</Badge>
						</CardContent>
					</Card>

					<Card className="">
						<CardHeader className="pb-2">
							<CardDescription>Próximos 30 dias</CardDescription>
							<CardTitle className="text-3xl">{eventStats.upcoming}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Clock className="size-4 text-primary" />
							<span>Eventos publicados com data futura</span>
						</CardContent>
					</Card>

					<Card className="">
						<CardHeader className="pb-2">
							<CardDescription>Participantes confirmados</CardDescription>
							<CardTitle className="text-3xl">{eventStats.participants}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Users className="size-4 text-primary" />
							<span>Total de inscrições registradas</span>
						</CardContent>
					</Card>

					<Card className="">
						<CardHeader className="pb-2">
							<CardDescription>Eventos em destaque</CardDescription>
							<CardTitle className="text-3xl">{preparedEvents.filter(({ event }) => event.featured).length}</CardTitle>
						</CardHeader>
						<CardContent className="flex items-center gap-2 pt-0 text-xs text-muted-foreground">
							<Badge variant="secondary">Destaque ativo</Badge>
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
				<EventsEmptyState />
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
		const statusMap: Record<string, { label: string }> = {
			published: {
				label: 'Publicado',
			},
			draft: {
				label: 'Rascunho',
			},
			cancelled: {
				label: 'Cancelado',
			},
			archived: {
				label: 'Arquivado',
			},
		};

		const statusInfo = statusMap[status || 'draft'];

		return <Badge variant="outline">{statusInfo.label}</Badge>;
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
			<Card className="flex h-full flex-col transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
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
						{event.featured ? <Badge variant="outline">Destaque</Badge> : null}
						{event.is_free ? <Badge variant="outline">Gratuito</Badge> : null}
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
						{event.max_attendees ? <Badge variant="outline">Limite {event.max_attendees}</Badge> : null}
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
