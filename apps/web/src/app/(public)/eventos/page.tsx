import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, MapPin, Search, Ticket } from 'lucide-react';
import type { MediaFile } from '@events-manager/contracts';
import MediaImage from '@/components/shared/MediaImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { backendFetch } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'Eventos',
	description: 'Encontre os próximos eventos publicados na plataforma.',
};

interface PublicEvent {
	category_id?: { color?: string | null; name: string } | null;
	cover_image?: MediaFile | null;
	event_type: 'hybrid' | 'in_person' | 'online';
	featured: boolean;
	id: string;
	is_free: boolean;
	location_name?: string | null;
	short_description?: string | null;
	slug: string;
	start_date: string;
	title: string;
}

interface EventListResponse {
	data: PublicEvent[];
	pagination: { limit: number; page: number; pageCount: number; total: number };
}

function pageHref(page: number, search: string) {
	const query = new URLSearchParams();
	if (search) query.set('search', search);
	if (page > 1) query.set('page', String(page));
	const suffix = query.toString();

	return suffix ? `/eventos?${suffix}` : '/eventos';
}

export default async function EventsPage({
	searchParams,
}: {
	searchParams: Promise<{ page?: string; search?: string }>;
}) {
	const params = await searchParams;
	const search = params.search?.trim().slice(0, 100) ?? '';
	const requestedPage = Number(params.page);
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const response = await backendFetch<EventListResponse>(
		`/api/events/public?${new URLSearchParams({ page: String(page), limit: '12', search }).toString()}`,
		{ revalidate: 30 },
	);

	return (
		<main id="main-content" className="mx-auto min-h-[70vh] max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<header className="max-w-3xl">
				<Badge variant="secondary">Agenda pública</Badge>
				<h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Encontre seu próximo evento</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					Consulte eventos publicados e confira datas, formato e disponibilidade de ingressos.
				</p>
			</header>

			<form className="mt-8 flex max-w-xl gap-2" action="/eventos" method="get">
				<div className="relative flex-1">
					<Search
						aria-hidden="true"
						className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						className="pl-9"
						defaultValue={search}
						name="search"
						placeholder="Buscar pelo nome do evento"
						type="search"
					/>
				</div>
				<Button type="submit">Buscar</Button>
			</form>

			<div className="mt-6 flex items-center justify-between border-b pb-4 text-sm text-muted-foreground">
				<p>{response.pagination.total} evento(s) encontrado(s)</p>
				{search ? (
					<Button asChild variant="ghost" size="sm">
						<Link href="/eventos">Limpar busca</Link>
					</Button>
				) : null}
			</div>

			{response.data.length ? (
				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{response.data.map((event) => (
						<Link
							key={event.id}
							href={`/eventos/${event.slug}`}
							className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
						>
							<div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/80 to-violet-500">
								{event.cover_image ? (
									<MediaImage
										uuid={event.cover_image}
										alt=""
										fill
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
										className="object-cover transition duration-500 group-hover:scale-105"
									/>
								) : (
									<div className="flex size-full items-center justify-center">
										<Ticket className="size-14 text-white/70" />
									</div>
								)}
								<div className="absolute left-3 top-3 flex gap-2">
									{event.featured ? <Badge>Destaque</Badge> : null}
									{event.is_free ? <Badge className="bg-emerald-600">Gratuito</Badge> : null}
								</div>
							</div>
							<div className="space-y-4 p-5">
								<div>
									{event.category_id?.name ? (
										<p className="text-xs font-semibold uppercase tracking-wide text-primary">
											{event.category_id.name}
										</p>
									) : null}
									<h2 className="mt-1 line-clamp-2 text-xl font-bold group-hover:text-primary">{event.title}</h2>
								</div>
								{event.short_description ? (
									<p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{event.short_description}</p>
								) : null}
								<div className="space-y-2 text-sm text-muted-foreground">
									<p className="flex items-center gap-2">
										<CalendarDays className="size-4 text-primary" />
										{new Date(event.start_date).toLocaleString('pt-BR', {
											dateStyle: 'medium',
											timeStyle: 'short',
										})}
									</p>
									<p className="flex items-center gap-2">
										<MapPin className="size-4 text-primary" />
										{event.event_type === 'online' ? 'Online' : event.location_name || 'Local a definir'}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="mt-12 rounded-2xl border border-dashed p-12 text-center">
					<CalendarDays className="mx-auto size-10 text-muted-foreground" />
					<h2 className="mt-4 text-xl font-semibold">Nenhum evento disponível</h2>
					<p className="mt-2 text-muted-foreground">Tente outra busca ou volte mais tarde.</p>
				</div>
			)}

			{response.pagination.pageCount > 1 ? (
				<nav aria-label="Paginação de eventos" className="mt-10 flex items-center justify-center gap-3">
					<Button asChild variant="outline" disabled={page <= 1}>
						<Link aria-disabled={page <= 1} href={pageHref(Math.max(1, page - 1), search)}>
							Anterior
						</Link>
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {response.pagination.page} de {response.pagination.pageCount}
					</span>
					<Button asChild variant="outline" disabled={page >= response.pagination.pageCount}>
						<Link
							aria-disabled={page >= response.pagination.pageCount}
							href={pageHref(Math.min(response.pagination.pageCount, page + 1), search)}
						>
							Próxima
						</Link>
					</Button>
				</nav>
			) : null}
		</main>
	);
}
