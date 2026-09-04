'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Calendar, MapPin, Ticket, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventRegistration } from '@events-manager/contracts';
import { getMediaAssetUrl } from '@/lib/media';

interface TicketCardProps {
	registration: EventRegistration;
	onViewDetails: (registration: EventRegistration) => void;
	/**
	 * `list` renders a short horizontal row. Both views used to share the tall
	 * card, which made "list" just a single stacked column of the same block.
	 */
	variant?: 'grid' | 'list';
}

const STATUS_STYLES = {
	checkedIn: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
	cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
	past: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
	confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
} as const;

export function TicketCard({ registration, onViewDetails, variant = 'grid' }: TicketCardProps) {
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

	useEffect(() => {
		if (registration.ticket_code) {
			QRCode.toDataURL(registration.ticket_code, {
				width: 300,
				margin: 1,
				color: { dark: '#6366F1', light: '#FFFFFF' },
			})
				.then(setQrCodeUrl)
				.catch(console.error);
		}
	}, [registration.ticket_code]);

	const event = registration.event_id;
	const eventDate =
		event && typeof event === 'object' && 'start_date' in event ? new Date(event.start_date as string) : null;

	const isEventPast = eventDate ? isPast(eventDate) : false;
	const isCheckedIn = registration.check_in_date !== null;

	const status = isCheckedIn
		? { tone: STATUS_STYLES.checkedIn, icon: CheckCircle2, label: 'Check-in' }
		: registration.status === 'cancelled'
			? { tone: STATUS_STYLES.cancelled, icon: XCircle, label: 'Cancelado' }
			: isEventPast
				? { tone: STATUS_STYLES.past, icon: Clock, label: 'Finalizado' }
				: { tone: STATUS_STYLES.confirmed, icon: CheckCircle2, label: 'Confirmado' };
	const StatusIcon = status.icon;

	const coverImage = event && typeof event === 'object' && 'cover_image' in event ? event.cover_image : null;
	const eventTitle = event && typeof event === 'object' && 'title' in event ? event.title : 'Evento';
	const eventSlug = event && typeof event === 'object' && 'slug' in event ? event.slug : '';
	const locationName =
		event && typeof event === 'object' && 'location_name' in event ? event.location_name : null;
	const ticketTitle =
		registration.ticket_type_id &&
		typeof registration.ticket_type_id === 'object' &&
		'title' in registration.ticket_type_id
			? registration.ticket_type_id.title
			: 'Ingresso';

	const statusBadge = (
		<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.tone}`}>
			<StatusIcon className="size-3" />
			{status.label}
		</span>
	);

	const cover = (
		<>
			{coverImage ? (
				<Image src={getMediaAssetUrl(coverImage as string)} alt={eventTitle as string} fill className="object-cover" />
			) : (
				<div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
					<Ticket className="size-8 text-white/60" />
				</div>
			)}
		</>
	);

	if (variant === 'list') {
		return (
			<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60">
				<div className="relative size-14 shrink-0 overflow-hidden rounded-lg">{cover}</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<Link
							href={`/eventos/${eventSlug}`}
							className="truncate text-sm font-semibold text-slate-950 hover:text-violet-700 dark:text-white dark:hover:text-violet-300"
						>
							{eventTitle}
						</Link>
						{statusBadge}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
						{eventDate && (
							<span className="flex items-center gap-1">
								<Calendar className="size-3.5 shrink-0" />
								{format(eventDate, "dd MMM 'às' HH:mm", { locale: ptBR })}
							</span>
						)}
						{locationName && (
							<span className="flex min-w-0 items-center gap-1">
								<MapPin className="size-3.5 shrink-0" />
								<span className="truncate">{locationName}</span>
							</span>
						)}
						<span className="font-mono">{registration.ticket_code}</span>
					</div>
				</div>

				<button
					type="button"
					onClick={() => onViewDetails(registration)}
					className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
				>
					Detalhes
				</button>
			</div>
		);
	}

	return (
		<div className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
			<div className="relative h-24 w-full shrink-0 overflow-hidden">
				{cover}
				<div className="absolute right-2 top-2">{statusBadge}</div>
				{registration.quantity && registration.quantity > 1 && (
					<div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
						{registration.quantity}x
					</div>
				)}
			</div>

			<div className="flex flex-1 flex-col p-3">
				<Link href={`/eventos/${eventSlug}`} className="block">
					<h3 className="line-clamp-2 text-sm font-semibold text-slate-950 transition-colors hover:text-violet-700 dark:text-white dark:hover:text-violet-300">
						{eventTitle}
					</h3>
				</Link>

				<div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
					{eventDate && (
						<div className="flex items-center gap-1.5">
							<Calendar className="size-3.5 shrink-0 text-violet-500" />
							<span className="truncate">{format(eventDate, "dd MMM 'às' HH:mm", { locale: ptBR })}</span>
						</div>
					)}
					{locationName && (
						<div className="flex items-center gap-1.5">
							<MapPin className="size-3.5 shrink-0 text-violet-500" />
							<span className="truncate">{locationName}</span>
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<Ticket className="size-3.5 shrink-0 text-violet-500" />
						<span className="truncate">{ticketTitle}</span>
					</div>
				</div>

				{/* QR beside the code rather than centred above it: at this size it is a
				    reference, and the full-size one lives in the details modal. */}
				<div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950/50">
					{qrCodeUrl && (
						<Image src={qrCodeUrl} alt="QR Code do ingresso" width={40} height={40} className="size-10 rounded" />
					)}
					<div className="min-w-0">
						<p className="text-[10px] uppercase tracking-wide text-slate-400">Código</p>
						<p className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
							{registration.ticket_code}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={() => onViewDetails(registration)}
					className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
				>
					<Eye className="size-3.5" />
					Ver detalhes
				</button>
			</div>
		</div>
	);
}
