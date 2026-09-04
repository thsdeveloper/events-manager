'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
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
	ExternalLink,
	Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventRegistration } from '@events-manager/contracts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface TicketDetailsModalProps {
	registration: EventRegistration;
	onClose: () => void;
}

export function TicketDetailsModal({ registration, onClose }: TicketDetailsModalProps) {
	const { toast } = useToast();
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
	const [isDownloading, setIsDownloading] = useState(false);
	const [copied, setCopied] = useState(false);
	const ticketRef = useRef<HTMLDivElement>(null);

	const event = registration.event_id;
	const eventDate =
		event && typeof event === 'object' && 'start_date' in event ? new Date(event.start_date as string) : null;

	const eventEndDate =
		event && typeof event === 'object' && 'end_date' in event ? new Date(event.end_date as string) : null;

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
			})
				.then(setQrCodeUrl)
				.catch(() => {
					toast({
						title: 'QR Code indisponível',
						description: 'Não foi possível gerar o QR Code deste ingresso.',
						variant: 'destructive',
					});
				});
		}
	}, [registration.ticket_code, toast]);

	const eventTitle = event && typeof event === 'object' && 'title' in event ? event.title : 'Evento';

	const locationName = event && typeof event === 'object' && 'location_name' in event ? event.location_name : null;

	const locationAddress =
		event && typeof event === 'object' && 'location_address' in event ? event.location_address : null;
	const onlineUrl = event && typeof event === 'object' && 'online_url' in event ? event.online_url : null;

	const ticketTitle =
		registration.ticket_type_id &&
		typeof registration.ticket_type_id === 'object' &&
		'title' in registration.ticket_type_id
			? registration.ticket_type_id.title
			: 'Ingresso';

	// Copy ticket code to clipboard
	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(registration.ticket_code || '');
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast({
				title: 'Não foi possível copiar',
				description: 'Selecione o código manualmente e tente outra vez.',
				variant: 'destructive',
			});
		}
	};

	// Download ticket as PDF
	const handleDownloadPDF = async () => {
		if (!ticketRef.current || isDownloading) return;

		setIsDownloading(true);
		try {
			const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
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
		} catch {
			toast({
				title: 'Erro ao gerar PDF',
				description: 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
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
				if (error instanceof DOMException && error.name === 'AbortError') return;
				toast({
					title: 'Não foi possível compartilhar',
					description: 'Tente copiar o link novamente.',
					variant: 'destructive',
				});
			}
		} else {
			try {
				await navigator.clipboard.writeText(window.location.href);
				toast({ title: 'Link copiado', description: 'O link do ingresso está na área de transferência.' });
			} catch {
				toast({
					title: 'Não foi possível copiar o link',
					description: 'Copie o endereço exibido pelo navegador.',
					variant: 'destructive',
				});
			}
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

		window.open(calendarUrl, '_blank', 'noopener,noreferrer');
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				hideCloseButton
				className="block max-h-[95vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg border-0 bg-white p-0 shadow-2xl dark:bg-gray-900"
			>
				<DialogDescription className="sr-only">
					Código, dados do participante e informações do evento deste ingresso.
				</DialogDescription>
				{/* Header */}
				<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
					<DialogTitle className="text-xl font-bold">Detalhes do Ingresso</DialogTitle>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-2 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
						aria-label="Fechar detalhes do ingresso"
					>
						<X className="size-5" />
					</button>
				</div>

				{/* Printable Ticket Content */}
				<div ref={ticketRef} className="bg-white p-8 dark:bg-gray-900">
					{/* Event Title */}
					<h3 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">{eventTitle}</h3>

					{/* QR Code - Center */}
					{qrCodeUrl && (
						<div className="mb-8 flex justify-center">
							<div className="rounded-lg border-4 border-indigo-600 bg-white p-4 shadow-lg">
								<Image src={qrCodeUrl} alt="QR Code do Ingresso" width={250} height={250} className="size-[250px]" />
							</div>
						</div>
					)}

					{/* Ticket Code */}
					<div className="mb-8 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 p-6 text-center dark:from-indigo-950 dark:to-purple-950">
						<p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Código do Ingresso</p>
						<div className="flex items-center justify-center gap-3">
							<p className="font-mono text-2xl font-bold tracking-widest text-indigo-900 dark:text-indigo-100">
								{registration.ticket_code}
							</p>
							<button
								type="button"
								onClick={handleCopyCode}
								className="rounded-lg p-2 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900"
								aria-label="Copiar código do ingresso"
							>
								{copied ? <Check className="size-5 text-green-600" /> : <Copy className="size-5 text-indigo-600" />}
							</button>
						</div>
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Apresente este código na entrada do evento</p>
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
									{format(eventDate, 'HH:mm', { locale: ptBR })}
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
								{locationAddress && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{locationAddress}</p>}
							</div>
						)}

						{typeof onlineUrl === 'string' && /^https?:\/\//i.test(onlineUrl) ? (
							<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800 md:col-span-2">
								<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
									<Globe className="size-5" />
									<span className="font-semibold">Acesso online</span>
								</div>
								<a
									href={onlineUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2 break-all text-sm font-medium text-indigo-700 underline dark:text-indigo-300"
								>
									Abrir transmissão <ExternalLink className="size-4" />
								</a>
							</div>
						) : null}

						<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
							<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<Ticket className="size-5" />
								<span className="font-semibold">Tipo de Ingresso</span>
							</div>
							<p className="text-sm text-gray-700 dark:text-gray-300">{ticketTitle}</p>
							{registration.quantity && registration.quantity > 1 && (
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Quantidade: {registration.quantity}</p>
							)}
						</div>

						<div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
							<div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
								<User className="size-5" />
								<span className="font-semibold">Participante</span>
							</div>
							<p className="text-sm text-gray-700 dark:text-gray-300">{registration.participant_name}</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{registration.participant_email}</p>
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
							<strong>⚠️ Importante:</strong> Guarde este ingresso com cuidado. Você precisará apresentá-lo (impresso ou
							no celular) na entrada do evento.
						</p>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="sticky bottom-0 border-t bg-gray-50 px-6 py-4 dark:bg-gray-800">
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<button
							type="button"
							onClick={handleDownloadPDF}
							disabled={isDownloading}
							className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
						>
							<Download className="size-4" />
							{isDownloading ? 'Gerando...' : 'PDF'}
						</button>

						<button
							type="button"
							onClick={handleShare}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<Share2 className="size-4" />
							Compartilhar
						</button>

						<button
							type="button"
							onClick={handleAddToCalendar}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<CalendarPlus className="size-4" />
							Calendário
						</button>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							<X className="size-4" />
							Fechar
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
