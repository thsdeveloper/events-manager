import type { OrganizerDashboard } from '@events-manager/contracts';
import { CalendarDays, CircleDollarSign, MapPin, Ticket, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '../molecules/EmptyState';
import { MetricCard } from '../molecules/MetricCard';
import { Heading } from '../atoms/Heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency, formatDateTime, formatInteger } from '@/lib/formatters';

const statusLabels: Record<OrganizerDashboard['recentEvents'][number]['status'], string> = {
	archived: 'Arquivado',
	cancelled: 'Cancelado',
	draft: 'Rascunho',
	published: 'Publicado',
};

export function OrganizerDashboardOverview({ dashboard }: { dashboard: OrganizerDashboard }) {
	const { metrics, recentEvents } = dashboard;

	return (
		<div className="space-y-8">
			<section aria-labelledby="dashboard-metrics-heading" className="space-y-4">
				<Heading as="h2" className="sr-only" id="dashboard-metrics-heading" level="h2">
					Indicadores do organizador
				</Heading>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<MetricCard
						helper={`${formatInteger(metrics.publishedEvents)} publicados · ${formatInteger(metrics.upcomingEvents)} futuros`}
						icon={<CalendarDays aria-hidden="true" className="size-5" />}
						label="Total de eventos"
						value={formatInteger(metrics.totalEvents)}
					/>
					<MetricCard
						helper="Inscrições não canceladas"
						icon={<UsersRound aria-hidden="true" className="size-5" />}
						label="Participantes"
						tone="info"
						value={formatInteger(metrics.participants)}
					/>
					<MetricCard
						helper="Estoque confirmado como vendido"
						icon={<Ticket aria-hidden="true" className="size-5" />}
						label="Ingressos vendidos"
						tone="success"
						value={formatInteger(metrics.ticketsSold)}
					/>
					<MetricCard
						helper="Pagamentos com status pago"
						icon={<CircleDollarSign aria-hidden="true" className="size-5" />}
						label="Receita bruta"
						tone="warning"
						value={formatCurrency(metrics.grossRevenue)}
					/>
				</div>
			</section>

			<section aria-labelledby="recent-events-heading">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
						<div>
							<Heading id="recent-events-heading" level="h3">
								Eventos recentes
							</Heading>
							<p className="mt-1 text-sm text-muted-foreground">
								Acompanhe datas, público e vendas dos últimos eventos.
							</p>
						</div>
						<Button asChild size="sm" variant="outline">
							<Link href="/admin/eventos">Ver todos</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{recentEvents.length ? (
							<ul className="divide-y" role="list">
								{recentEvents.map((event: OrganizerDashboard['recentEvents'][number]) => (
									<li key={event.id}>
										<Link
											className="group grid gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
											href={`/admin/eventos/${event.id}`}
										>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="truncate font-semibold text-foreground group-hover:text-primary">
														{event.title}
													</h3>
													<Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
														{statusLabels[event.status]}
													</Badge>
												</div>
												<div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
													<span className="inline-flex items-center gap-1.5">
														<CalendarDays aria-hidden="true" className="size-4" />
														{formatDateTime(event.startDate)}
													</span>
													<span className="inline-flex items-center gap-1.5">
														<MapPin aria-hidden="true" className="size-4" />
														{event.location}
													</span>
												</div>
											</div>
											<div className="flex items-center gap-5 text-sm sm:justify-end">
												<span>
													<strong className="block text-base text-foreground">
														{formatInteger(event.participantCount)}
													</strong>
													<span className="text-muted-foreground">participantes</span>
												</span>
												<span>
													<strong className="block text-base text-foreground">
														{formatInteger(event.ticketsSold)}
													</strong>
													<span className="text-muted-foreground">vendidos</span>
												</span>
											</div>
										</Link>
									</li>
								))}
							</ul>
						) : (
							<EmptyState
								action={
									<Button asChild>
										<Link href="/admin/eventos/novo">Criar primeiro evento</Link>
									</Button>
								}
								description="Quando você publicar eventos, os principais números aparecerão automaticamente nesta visão geral."
								icon={<CalendarDays aria-hidden="true" className="size-6" />}
								title="Sua agenda começa aqui"
							/>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
