'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
	Calendar,
	MapPin,
	Ticket,
	Download,
	Share2,
	Clock,
	CheckCircle2,
	XCircle,
	CalendarPlus,
	Eye
} from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventRegistration } from '@events-manager/contracts';
import { getMediaAssetUrl } from '@/lib/media';

interface TicketCardProps {
	registration: EventRegistration;
	onViewDetails: (registration: EventRegistration) => void;
}

export function TicketCard({ registration, onViewDetails }: TicketCardProps) {
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

	// Generate QR Code on mount
	useEffect(() => {
		if (registration.ticket_code) {
			QRCode.toDataURL(registration.ticket_code, {
				width: 300,
				margin: 1,
				color: {
					dark: '#6366F1',
					light: '#FFFFFF',
				},
			}).then(setQrCodeUrl)
				.catch(console.error);
		}
	}, [registration.ticket_code]);

	const event = registration.event_id;
	const eventDate = event && typeof event === 'object' && 'start_date' in event
		? new Date(event.start_date as string)
		: null;

	const isEventPast = eventDate ? isPast(eventDate) : false;
	const isCheckedIn = registration.check_in_date !== null;

	// Status badge
	const getStatusBadge = () => {
		if (isCheckedIn) {
			return (
				<div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
					<CheckCircle2 className="size-3" />
					Check-in Realizado
				</div>
			);
		}
		if (registration.status === 'cancelled') {
			return (
				<div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
					<XCircle className="size-3" />
					Cancelado
				</div>
			);
		}
		if (isEventPast) {
			return (
				<div className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
					<Clock className="size-3" />
					Evento Finalizado
				</div>
			);
		}
		
return (
			<div className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
				<CheckCircle2 className="size-3" />
				Confirmado
			</div>
		);
	};

	const coverImage = event && typeof event === 'object' && 'cover_image' in event
		? event.cover_image
		: null;

	const eventTitle = event && typeof event === 'object' && 'title' in event
		? event.title
		: 'Evento';

	const eventSlug = event && typeof event === 'object' && 'slug' in event
		? event.slug
		: '';

	const locationName = event && typeof event === 'object' && 'location_name' in event
		? event.location_name
		: null;

	const ticketTitle = registration.ticket_type_id && typeof registration.ticket_type_id === 'object' && 'title' in registration.ticket_type_id
		? registration.ticket_type_id.title
		: 'Ingresso';

	return (
		<div className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-gray-50 shadow-sm transition-all duration-300 hover:shadow-xl dark:from-gray-900 dark:to-gray-800">
			{/* Cover Image with Gradient Overlay */}
			<div className="relative aspect-[16/9] w-full overflow-hidden">
				{coverImage ? (
					<Image
						src={getMediaAssetUrl(coverImage as string)}
						alt={eventTitle as string}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
						<Ticket className="size-20 text-white/50" />
					</div>
				)}

				{/* Status Badge Overlay */}
				<div className="absolute right-3 top-3">
					{getStatusBadge()}
				</div>

				{/* Quantity Badge */}
				{registration.quantity && registration.quantity > 1 && (
					<div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
						{registration.quantity}x Ingressos
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-5">
				{/* Event Title */}
				<Link
					href={`/eventos/${eventSlug}`}
					className="group/link mb-3 block"
				>
					<h3 className="line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover/link:text-indigo-600 dark:text-white">
						{eventTitle}
					</h3>
				</Link>

				{/* Event Details */}
				<div className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
					{eventDate && (
						<div className="flex items-center gap-2">
							<Calendar className="size-4 shrink-0 text-indigo-500" />
							<span>
								{format(eventDate, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
							</span>
						</div>
					)}

					{locationName && (
						<div className="flex items-center gap-2">
							<MapPin className="size-4 shrink-0 text-indigo-500" />
							<span className="line-clamp-1">{locationName}</span>
						</div>
					)}

					<div className="flex items-center gap-2">
						<Ticket className="size-4 shrink-0 text-indigo-500" />
						<span>{ticketTitle}</span>
					</div>
				</div>

				{/* QR Code Preview (Small) */}
				{qrCodeUrl && (
					<div className="mb-4 flex justify-center">
						<div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-2">
							<Image
								src={qrCodeUrl}
								alt="QR Code"
								width={80}
								height={80}
								className="size-20"
							/>
						</div>
					</div>
				)}

				{/* Ticket Code */}
				<div className="mb-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-3 text-center dark:from-indigo-950 dark:to-purple-950">
					<p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Código do Ingresso</p>
					<p className="font-mono text-sm font-bold tracking-wider text-indigo-900 dark:text-indigo-100">
						{registration.ticket_code}
					</p>
				</div>

				{/* Action Button */}
				<button
					onClick={() => onViewDetails(registration)}
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-indigo-700 hover:to-purple-700"
				>
					<Eye className="size-4" />
					Ver Detalhes Completos
				</button>
			</div>
		</div>
	);
}
