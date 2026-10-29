import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchEventBySlug, fetchSiteData } from '@/lib/content/fetchers';
import SiteLayout from '@/components/layout/SiteLayout';
import { EventLandingPage } from '@/features/event-page/components/EventLandingPage';
import { EventLocationView } from '@/components/map/EventLocationView';
import MediaImage from '@/components/shared/MediaImage';
import { Container } from '@/components/design-system/atoms/Container';
import { EventHero } from '@/components/design-system/organisms/EventHero';
import Text, { htmlToPlainText } from '@/components/ui/Text';
import Link from 'next/link';
import {
	Calendar,
	MapPin,
	Clock,
	Users,
	DollarSign,
	Globe,
	Share2,
	Tag,
	Building2,
	Mail,
	Phone,
	AlertCircle,
} from 'lucide-react';
import type { EventTicket } from '@events-manager/contracts';

interface EventPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
	const { slug } = await params;
	try {
		const event = await fetchEventBySlug(slug);

		return {
			title: event.title,
			...(event.visibility === 'unlisted' ? { robots: { index: false, follow: false } } : {}),
			description: event.short_description || htmlToPlainText(event.description ?? '').substring(0, 160),
		};
	} catch (error) {
		return {
			title: 'Evento não encontrado',
		};
	}
}

export default async function EventPage({ params }: EventPageProps) {
	const { slug } = await params;
	let event;

	try {
		event = await fetchEventBySlug(slug);
	} catch (error) {
		notFound();
	}

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);

		return date.toLocaleDateString('pt-BR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		});
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);

		return date.toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateRange = () => {
		const startDate = new Date(event.start_date);
		const endDate = new Date(event.end_date);

		const isSameDay = startDate.toDateString() === endDate.toDateString();

		if (isSameDay) {
			return `${startDate.getDate()} de ${startDate.toLocaleDateString('pt-BR', { month: 'long' })}`;
		} else {
			return `${startDate.getDate()} a ${endDate.getDate()} de ${endDate.toLocaleDateString('pt-BR', { month: 'long' })}`;
		}
	};

	const formatTimeRange = () => {
		const startTime = formatTime(event.start_date);
		const endTime = formatTime(event.end_date);
		const startDate = new Date(event.start_date);
		const endDate = new Date(event.end_date);

		const isSameDay = startDate.toDateString() === endDate.toDateString();

		if (isSameDay) {
			return `${startDate.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${startTime}`;
		} else {
			return `${startDate.toLocaleDateString('pt-BR', { weekday: 'long' })} e ${endDate.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${startTime}`;
		}
	};

	// Check if event has active tickets
	const tickets = (event.tickets ?? []).filter((ticket): ticket is EventTicket => typeof ticket !== 'string');
	const hasTickets = tickets.length > 0;
	const eventOrganizer = typeof event.organizer_id !== 'string' ? event.organizer_id : null;
	const eventCategory = typeof event.category_id !== 'string' ? event.category_id : null;

	// Landing publicada pelo organizador: a página é dele, sem a casca do site.
	if (event.page) {
		return <EventLandingPage event={event} layout={event.page} />;
	}

	const { globals, headerNavigation, footerNavigation } = await fetchSiteData();

	return (
		<SiteLayout headerNavigation={headerNavigation} footerNavigation={footerNavigation} globals={globals}>
			<main className="flex-grow" id="main-content" tabIndex={-1}>
				<div className="min-h-screen bg-gradient-to-b from-purple-50/50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
					<EventHero
						category={eventCategory ?? null}
						coverImage={event.cover_image}
						dateLabel={formatDateRange()}
						formatLabel={
							event.event_type === 'in_person' ? 'Presencial' : event.event_type === 'online' ? 'Online' : 'Híbrido'
						}
						isFree={Boolean(event.is_free)}
						timeLabel={formatTimeRange()}
						title={event.title}
					/>

					{/* Main Content */}
					<Container className="py-12">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							{/* Left Column - Event Details */}
							<div className="lg:col-span-2 space-y-8">
								{/* Description */}
								<div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8 md:p-10 border border-gray-100 dark:border-gray-700">
									<h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">
										Sobre o evento
									</h2>
									{event.short_description && (
										<p className="mb-4 text-base font-medium leading-relaxed text-gray-700">
											{event.short_description}
										</p>
									)}
									{/* Tamanho base de leitura: o texto longo em `prose-lg` ficava pesado. */}
									{event.description && (
										<Text
											className="prose-base max-w-none text-gray-600 prose-p:leading-relaxed"
											content={event.description}
										/>
									)}

									{/* Tags */}
									{event.tags && Array.isArray(event.tags) && event.tags.length > 0 && (
										<div className="mt-6 pt-6 border-t border-gray-200">
											<div className="flex flex-wrap gap-2">
												{event.tags.map((tag, index) => (
													<span
														key={index}
														className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
													>
														<Tag className="size-3" />
														{tag}
													</span>
												))}
											</div>
										</div>
									)}
								</div>

								{/* Location */}
								{(event.location_name || event.location_address) && (
									<div className="bg-white rounded-lg shadow-sm p-8">
										<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
											<MapPin className="size-6 text-purple-600" />
											Local
										</h2>
										{event.location_name && (
											<p className="text-lg font-semibold text-gray-900 mb-2">{event.location_name}</p>
										)}
										{event.location_address && <p className="text-gray-600">{event.location_address}</p>}
										{typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
											<EventLocationView
												position={{ latitude: event.latitude, longitude: event.longitude }}
												locationName={event.location_name}
											/>
										)}
									</div>
								)}

								{/* Online access */}
								{event.event_type === 'online' || event.event_type === 'hybrid' ? (
									<div className="bg-white rounded-lg shadow-sm p-8">
										<h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
											<Globe className="size-6 text-purple-600" />
											Acesso online
										</h2>
										<p className="text-gray-600">
											O link de acesso fica disponível nos detalhes do ingresso após a confirmação.
										</p>
									</div>
								) : null}

								{/* Organizer Info */}
								{eventOrganizer && (
									<div className="bg-white rounded-lg shadow-sm p-8">
										<h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
											<Building2 className="size-6 text-purple-600" />
											Organizador
										</h2>
										<div className="flex items-start gap-6">
											{eventOrganizer.logo && (
												<div className="flex-shrink-0">
													<MediaImage
														uuid={eventOrganizer.logo}
														alt={eventOrganizer.name || 'Organizador'}
														width={80}
														height={80}
														className="rounded-lg object-cover"
													/>
												</div>
											)}
											<div className="flex-1">
												<h3 className="text-xl font-bold text-gray-900 mb-2">{eventOrganizer.name}</h3>
												{eventOrganizer.description && (
													<Text className="prose-sm mb-4 text-gray-600" content={eventOrganizer.description} />
												)}
												<div className="space-y-2">
													{eventOrganizer.email && (
														<div className="flex items-center gap-2 text-sm text-gray-600">
															<Mail className="size-4 text-purple-600" />
															<a href={`mailto:${eventOrganizer.email}`} className="hover:text-purple-600">
																{eventOrganizer.email}
															</a>
														</div>
													)}
													{eventOrganizer.phone && (
														<div className="flex items-center gap-2 text-sm text-gray-600">
															<Phone className="size-4 text-purple-600" />
															<a href={`tel:${eventOrganizer.phone}`} className="hover:text-purple-600">
																{eventOrganizer.phone}
															</a>
														</div>
													)}
													{eventOrganizer.website && (
														<div className="flex items-center gap-2 text-sm text-gray-600">
															<Globe className="size-4 text-purple-600" />
															<a
																href={eventOrganizer.website}
																target="_blank"
																rel="noopener noreferrer"
																className="hover:text-purple-600"
															>
																{eventOrganizer.website}
															</a>
														</div>
													)}
												</div>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Right Column - Sidebar */}
							<div className="lg:col-span-1">
								<div className="sticky top-8 space-y-6">
									{/* Pricing Card */}
									<div className="bg-white rounded-lg shadow-lg p-8">
										<div className="text-center mb-6">
											{event.is_free ? (
												<div>
													<p className="text-sm text-gray-600 mb-2">Entrada</p>
													<p className="text-4xl font-bold text-green-600">Gratuita</p>
												</div>
											) : hasTickets ? (
												<div>
													<p className="text-sm text-gray-600 mb-2">Ingressos a partir de</p>
													<p className="text-4xl font-bold text-gray-900">
														R${' '}
														{Math.min(
															...(event.tickets?.map((t: any) => Number(t.buyer_price || t.price)) || [0]),
														).toFixed(2)}
													</p>
													<p className="text-xs text-gray-500 mt-1">Já inclui taxa de conveniência</p>
												</div>
											) : (
												<div>
													<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
														<AlertCircle className="size-6 text-amber-600 mx-auto mb-2" />
														<p className="text-sm text-amber-800 font-medium">Ingressos indisponíveis</p>
													</div>
												</div>
											)}
										</div>

										{event.is_free ? (
											<button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg">
												Inscrever-se gratuitamente
											</button>
										) : hasTickets ? (
											<>
												<Link
													href={`/eventos/${slug}/checkout`}
													className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg inline-block text-center"
												>
													Comprar ingressos
												</Link>
												<p className="text-center text-sm text-gray-500 mt-4">Parcele em até 12x</p>
											</>
										) : (
											<button
												disabled
												className="w-full bg-gray-300 text-gray-500 font-bold py-4 px-6 rounded-lg cursor-not-allowed text-lg"
											>
												Compra indisponível
											</button>
										)}
									</div>

									{/* Event Info */}
									<div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
										<div className="flex items-start gap-3">
											<Calendar className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
											<div>
												<p className="font-semibold text-gray-900 mb-1">Data e Hora</p>
												<p className="text-sm text-gray-600">
													{formatDate(event.start_date)} às {formatTime(event.start_date)}
												</p>
												{event.end_date && (
													<p className="text-sm text-gray-600">
														até {formatDate(event.end_date)} às {formatTime(event.end_date)}
													</p>
												)}
											</div>
										</div>

										{event.max_attendees && (
											<div className="flex items-start gap-3">
												<Users className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
												<div>
													<p className="font-semibold text-gray-900 mb-1">Capacidade</p>
													<p className="text-sm text-gray-600">
														{event.max_attendees.toLocaleString('pt-BR')} participantes
													</p>
												</div>
											</div>
										)}

										<div className="flex items-start gap-3">
											<Globe className="size-5 text-purple-600 mt-0.5 flex-shrink-0" />
											<div>
												<p className="font-semibold text-gray-900 mb-1">Tipo</p>
												<p className="text-sm text-gray-600 capitalize">
													{event.event_type === 'in_person'
														? 'Presencial'
														: event.event_type === 'online'
															? 'Online'
															: 'Híbrido'}
												</p>
											</div>
										</div>

										{(event.registration_start || event.registration_end) && (
											<div className="pt-4 border-t border-gray-100">
												<p className="font-semibold text-gray-900 mb-2 text-sm">Período de Inscrições</p>
												{event.registration_start && (
													<p className="text-xs text-gray-600">Início: {formatDate(event.registration_start)}</p>
												)}
												{event.registration_end && (
													<p className="text-xs text-gray-600">Término: {formatDate(event.registration_end)}</p>
												)}
											</div>
										)}
									</div>

									{/* Share Button */}
									<button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
										<Share2 className="size-5" />
										Compartilhar
									</button>
								</div>
							</div>
						</div>
					</Container>
				</div>
			</main>
		</SiteLayout>
	);
}
