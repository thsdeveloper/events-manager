'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
	X,
	Download,
	Share2,
	CalendarPlus,
	MapPin,
	Calendar,
	Clock,
	Ticket,
	User,
	Mail,
	Phone,
	CreditCard,
	Check,
	Copy,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventRegistration } from '@events-manager/contracts';

interface TicketDetailsModalProps {
	registration: EventRegistration;
	onClose: () => void;
}

export function TicketDetailsModal({ registration, onClose }: TicketDetailsModalProps) {
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
	const [isDownloading, setIsDownloading] = useState(false);
	const [copied, setCopied] = useState(false);
	const ticketRef = useRef<HTMLDivElement>(null);

	const event = registration.event_id;
	const eventDate = event && typeof event === 'object' && 'start_date' in event
		? new Date(event.start_date as string)
		: null;

	const eventEndDate = event && typeof event === 'object' && 'end_date' in event
		? new Date(event.end_date as string)
		: null;

	// Generate high-quality QR Code
	useEffect(() => {
		if (registration.ticket_code) {
			QRCode.toDataURL(registration.ticket_code, {
				width: 600,
				margin: 2,
				color: {
					dark: '#6366F1',
					light: '#FFFFFF',
				},
			}).then(setQrCodeUrl)
				.catch(console.error);
		}
	}, [registration.ticket_code]);

	const eventTitle = event && typeof event === 'object' && 'title' in event
		? event.title
		: 'Evento';

	const locationName = event && typeof event === 'object' && 'location_name' in event
		? event.location_name
		: null;

	const locationAddress = event && typeof event === 'object' && 'location_address' in event
		? event.location_address
		: null;

	const ticketTitle = registration.ticket_type_id && typeof registration.ticket_type_id === 'object' && 'title' in registration.ticket_type_id
		? registration.ticket_type_id.title
		: 'Ingresso';

	// Copy ticket code to clipboard
	const handleCopyCode = async () => {
		await navigator.clipboard.writeText(registration.ticket_code || '');
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// Download ticket as PDF
	const handleDownloadPDF = async () => {
		if (!ticketRef.current || isDownloading) return;

		setIsDownloading(true);
		try {
			const canvas = await html2canvas(ticketRef.current, {
				scale: 2,
				logging: false,
				backgroundColor: '#ffffff',
			});

			const imgData = canvas.toDataURL('image/png');
			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4',
			});

			const imgWidth = 190;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;

			pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
			pdf.save(`ingresso-${registration.ticket_code}.pdf`);
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('Erro ao gerar PDF. Tente novamente.');
		} finally {
			setIsDownloading(false);
		}
	};

	// Share ticket
	const handleShare = async () => {
		const shareData = {
			title: `Ingresso - ${eventTitle}`,
			text: `Meu ingresso para ${eventTitle}`,
			url: window.location.href,
		};

		if (navigator.share && navigator.canShare(shareData)) {
			try {
				await navigator.share(shareData);
			} catch (error) {
				console.log('Share cancelled');
			}
		} else {
			// Fallback: copy link
			await navigator.clipboard.writeText(window.location.href);
			alert('Link copiado para área de transferência!');
		}
	};

	// Add to calendar
	const handleAddToCalendar = () => {
		if (!eventDate) return;

		const startDate = format(eventDate, "yyyyMMdd'T'HHmmss");
		const endDate = eventEndDate
			? format(eventEndDate, "yyyyMMdd'T'HHmmss")
			: format(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000), "yyyyMMdd'T'HHmmss"); // +2h default

		const location = locationAddress || locationName || '';
		const description = `Ingresso: ${ticketTitle}\\nCódigo: ${registration.ticket_code}`;

		const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle as string)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

		window.open(calendarUrl, '_blank');
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
			<div
				className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
					<h2 className="text-xl font-bold">Detalhes do Ingresso</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-2 transition-colors hover:bg-white/20"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Printable Ticket Content */}
				<div ref={ticketRef} className="bg-white p-8 dark:bg-gray-900">
					{/* Event Title */}
					<h3 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
						{eventTitle}
					</h3>

					{/* QR Code - Center */}
					{qrCodeUrl && (
						<div className="mb-8 flex justify-center">
							<div className="rounded-2xl border-4 border-indigo-600 bg-white p-4 shadow-lg">
								<Image
									src={qrCodeUrl}
									alt="QR Code do Ingresso"
									width={250}
									height={250}
									className="size-[250px]"
								/>
							</div>
						</div>
					)}

					{/* Ticket Code */}
					<div className="mb-8 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center dark:from-indigo-950 dark:to-purple-950">
						<p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
							Código do Ingresso
						</p>
						<div className="flex items-center justify-center gap-3">
							<p className="font-mono text-2xl font-bold tracking-widest text-indigo-900 dark:text-indigo-100">
								{registration.ticket_code}
							</p>
							<button
								onClick={handleCopyCode}
								className="rounded-lg p-2 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900"
								title="Copiar código"
							>
								{copied ? (
									<Check className="size-5 text-green-600" />
								) : (
									<Copy className="size-5 text-indigo-600" />
								)}
							</button>
						</div>
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							Apresente este código na entrada do evento
						</p>
					</div>

					{/* Event Details Grid */}
					<div className="mb-6 grid gap-4 md:grid-cols-2">
						{eventDate && (
							<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
								<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<Calendar className="size-5" />
									<span className="font-semibold">Data e Hora</span>
								</div>
								<p className="text-sm text-gray-700 dark:text-gray-300">
									{format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
								</p>
								<p className="text-sm font-semibold text-gray-900 dark:text-white">
									{format(eventDate, "HH:mm", { locale: ptBR })}
								</p>
							</div>
						)}

						{locationName && (
							<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
								<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<MapPin className="size-5" />
									<span className="font-semibold">Local</span>
								</div>
								<p className="text-sm text-gray-700 dark:text-gray-300">{locationName}</p>
								{locationAddress && (
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
										{locationAddress}
									</p>
								)}
							</div>
						)}

						<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
							<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<Ticket className="size-5" />
								<span className="font-semibold">Tipo de Ingresso</span>
							</div>
							<p className="text-sm text-gray-700 dark:text-gray-300">{ticketTitle}</p>
							{registration.quantity && registration.quantity > 1 && (
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Quantidade: {registration.quantity}
								</p>
							)}
						</div>

						<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
							<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<User className="size-5" />
								<span className="font-semibold">Participante</span>
							</div>
							<p className="text-sm text-gray-700 dark:text-gray-300">
								{registration.participant_name}
							</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{registration.participant_email}
							</p>
						</div>

						{registration.total_amount && (
							<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
								<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<CreditCard className="size-5" />
									<span className="font-semibold">Valor Pago</span>
								</div>
								<p className="text-lg font-bold text-gray-900 dark:text-white">
									{new Intl.NumberFormat('pt-BR', {
										style: 'currency',
										currency: 'BRL',
									}).format(Number(registration.total_amount))}
								</p>
							</div>
						)}

						{registration.date_created && (
							<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
								<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<Clock className="size-5" />
									<span className="font-semibold">Comprado em</span>
								</div>
								<p className="text-sm text-gray-700 dark:text-gray-300">
									{format(new Date(registration.date_created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
								</p>
							</div>
						)}
					</div>

					{/* Important Note */}
					<div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
						<p className="text-sm text-amber-900 dark:text-amber-100">
							<strong>⚠️ Importante:</strong> Guarde este ingresso com cuidado. Você precisará
							apresentá-lo (impresso ou no celular) na entrada do evento.
						</p>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="sticky bottom-0 border-t bg-gray-50 px-6 py-4 dark:bg-gray-800">
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<button
							onClick={handleDownloadPDF}
							disabled={isDownloading}
							className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
						>
							<Download className="size-4" />
							{isDownloading ? 'Gerando...' : 'PDF'}
						</button>

						<button
							onClick={handleShare}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<Share2 className="size-4" />
							Compartilhar
						</button>

						<button
							onClick={handleAddToCalendar}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<CalendarPlus className="size-4" />
							Calendário
						</button>

						<button
							onClick={onClose}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<X className="size-4" />
							Fechar
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
