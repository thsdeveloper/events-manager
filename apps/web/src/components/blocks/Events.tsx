'use client';

import { useEffect, useState } from 'react';
import MediaImage from '@/components/shared/MediaImage';
import Tagline from '../ui/Tagline';
import Headline from '@/components/ui/Headline';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Clock, Sparkles, Ticket } from 'lucide-react';
import Link from 'next/link';

interface Event {
	id: string;
	title: string;
	slug: string;
	short_description?: string;
	cover_image?: string;
	start_date: string;
	end_date: string;
	location_name?: string;
	location_address?: string;
	event_type: 'in_person' | 'online' | 'hybrid';
	is_free: boolean;
	featured: boolean;
}

interface EventsData {
	id: string;
	headline?: string;
	description?: string;
	events: Event[];
}

interface EventsProps {
	data: EventsData;
}

const Events = ({ data }: EventsProps) => {
	const { headline, description, events, id } = data;

	const [currentIndex, setCurrentIndex] = useState(0);
	const [itemsPerView, setItemsPerView] = useState(1);

	// Responsive items per view
	useEffect(() => {
		const updateItemsPerView = () => {
			if (window.innerWidth >= 1024) {
				setItemsPerView(3);
			} else if (window.innerWidth >= 768) {
				setItemsPerView(2);
			} else {
				setItemsPerView(1);
			}
		};

		updateItemsPerView();
		window.addEventListener('resize', updateItemsPerView);

return () => window.removeEventListener('resize', updateItemsPerView);
	}, []);

	const maxIndex = Math.max(0, events.length - itemsPerView);

	const handlePrev = () => {
		setCurrentIndex((prev) => Math.max(0, prev - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
	};

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

	if (!events || events.length === 0) {
		return null;
	}

	return (
		<section className="relative py-20 overflow-hidden">
			{/* Background Elements */}
			<div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-slate-900 dark:via-purple-900/10 dark:to-slate-900 -z-10" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="text-center mb-16">
					{headline && (
						<div
							className="inline-flex items-center gap-2 mb-4"
						>
							<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 backdrop-blur-sm">
								<Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
								<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400">
									{headline}
								</h2>
							</div>
						</div>
					)}
					{description && (
						<p
							className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
						>
							{description}
						</p>
					)}
				</div>

				<div className="relative">
					{/* Navigation Buttons */}
					{events.length > itemsPerView && (
						<>
							<button
								onClick={handlePrev}
								disabled={currentIndex === 0}
								className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-6 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-3 shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl transition-all duration-300 hover:scale-110"
								aria-label="Anterior"
							>
								<ArrowLeft className="size-6" />
							</button>
							<button
								onClick={handleNext}
								disabled={currentIndex >= maxIndex}
								className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-6 z-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-3 shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-2xl transition-all duration-300 hover:scale-110"
								aria-label="Próximo"
							>
								<ArrowRight className="size-6" />
							</button>
						</>
					)}

					{/* Carousel Container */}
					<div className="overflow-hidden">
						<div
							className="flex transition-transform duration-700 ease-out gap-6"
							style={{
								transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
							}}
						>
							{events.map((event, index) => (
								<div
									key={event.id}
									className="flex-shrink-0"
									style={{
										width: `calc(${100 / itemsPerView}% - ${(itemsPerView - 1) * 24 / itemsPerView}px)`,
										opacity: 0,
										animation: `fadeInUp 0.6s ease-out forwards ${index * 0.1}s`,
									}}
								>
									<Link href={`/eventos/${event.slug}`} className="block group h-full">
										<div className="relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 h-full border border-gray-100 dark:border-gray-700 group-hover:border-purple-500/50 group-hover:-translate-y-2">
											{/* Event Image */}
											<div className="relative h-64 overflow-hidden">
												{event.cover_image ? (
													<>
														<MediaImage
															uuid={event.cover_image}
															alt={event.title}
															fill
															sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
															className="object-cover group-hover:scale-110 transition-transform duration-700"
														/>
														<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
													</>
												) : (
													<div className="size-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center">
														<Calendar className="size-24 text-white opacity-30" />
													</div>
												)}

												{/* Badges */}
												<div className="absolute top-4 inset-x-4 flex items-start justify-between gap-2">
													{event.featured && (
														<div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
															<Sparkles className="size-3" />
															Destaque
														</div>
													)}
													{event.is_free && (
														<div className="ml-auto bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm">
															Gratuito
														</div>
													)}
												</div>

												{/* Event Type Badge - Bottom */}
												<div className="absolute bottom-4 left-4">
													<div className="inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg">
														<div className="size-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" />
														<span className="text-xs font-semibold text-gray-900 dark:text-white capitalize">
															{event.event_type === 'in_person'
																? 'Presencial'
																: event.event_type === 'online'
																	? 'Online'
																	: 'Híbrido'}
														</span>
													</div>
												</div>
											</div>

											{/* Event Info */}
											<div className="p-6 space-y-4">
												<h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-indigo-600 group-hover:bg-clip-text transition-all duration-300">
													{event.title}
												</h3>

												{event.short_description && (
													<p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 leading-relaxed">
														{event.short_description}
													</p>
												)}

												<div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
													<div className="flex items-center gap-2.5">
														<div className="flex-shrink-0 size-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
															<Calendar className="size-4 text-white" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Data & Horário</p>
															<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
																{formatDate(event.start_date)} • {formatTime(event.start_date)}
															</p>
														</div>
													</div>

													{event.location_name && (
														<div className="flex items-center gap-2.5">
															<div className="flex-shrink-0 size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
																<MapPin className="size-4 text-white" />
															</div>
															<div className="flex-1 min-w-0">
																<p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Local</p>
																<p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
																	{event.location_name}
																</p>
															</div>
														</div>
													)}

													<button className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-105">
														<Ticket className="size-5" />
														Ver Detalhes
													</button>
												</div>
											</div>
										</div>
									</Link>
								</div>
							))}
						</div>
					</div>

					{/* Dots Indicator */}
					{events.length > itemsPerView && (
						<div className="flex justify-center gap-2 mt-12">
							{Array.from({ length: maxIndex + 1 }).map((_, index) => (
								<button
									key={index}
									onClick={() => setCurrentIndex(index)}
									className={`h-2 rounded-full transition-all duration-300 ${
										index === currentIndex
											? 'bg-gradient-to-r from-purple-600 to-indigo-600 w-8 shadow-lg shadow-purple-500/50'
											: 'bg-gray-300 dark:bg-gray-600 w-2 hover:w-4'
									}`}
									aria-label={`Ir para slide ${index + 1}`}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Keyframes for animation */}
			<style jsx>{`
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</section>
	);
};

export default Events;
