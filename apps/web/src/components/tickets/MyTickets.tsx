'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Ticket, Download } from 'lucide-react';
import { getMediaAssetUrl } from '@/lib/media';

interface Registration {
	id: string;
	ticket_code: string;
	quantity: number;
	total_amount: number;
	participant_name: string;
	participant_email: string;
	status: string;
	payment_status: string;
	date_created: string;
	event_id: {
		id: string;
		title: string;
		slug: string;
		event_date: string;
		location?: string;
		cover_image?: string;
	};
	ticket_type_id: {
		id: string;
		title: string;
	};
}

interface MyTicketsProps {
	registrations: Registration[];
}

export default function MyTickets({ registrations }: MyTicketsProps) {
	const [selectedTicket, setSelectedTicket] = useState<Registration | null>(null);

	const handleViewTicket = (registration: Registration) => {
		setSelectedTicket(registration);
	};

	const handlePrintTicket = () => {
		if (!selectedTicket) return;

		// Create a simple HTML ticket for printing
		const ticketHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>Ingresso - ${selectedTicket.event_id.title}</title>
				<style>
					@media print {
						body { margin: 0; }
						.no-print { display: none; }
					}
					body {
						font-family: Arial, sans-serif;
						max-width: 600px;
						margin: 40px auto;
						padding: 20px;
					}
					.ticket {
						border: 2px solid #667eea;
						border-radius: 12px;
						padding: 30px;
						background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
					}
					h1 { color: #667eea; margin: 0 0 20px; }
					.info { margin: 10px 0; }
					.code {
						font-family: monospace;
						font-size: 24px;
						font-weight: bold;
						background: #fff;
						padding: 15px;
						border-radius: 4px;
						text-align: center;
						margin: 20px 0;
						letter-spacing: 2px;
					}
				</style>
			</head>
			<body>
				<div class="ticket">
					<h1>${selectedTicket.event_id.title}</h1>
					<div class="info"><strong>Data:</strong> ${new Date(selectedTicket.event_id.event_date).toLocaleDateString('pt-BR', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}</div>
					${selectedTicket.event_id.location ? `<div class="info"><strong>Local:</strong> ${selectedTicket.event_id.location}</div>` : ''}
					<div class="info"><strong>Tipo:</strong> ${selectedTicket.ticket_type_id.title}</div>
					<div class="info"><strong>Quantidade:</strong> ${selectedTicket.quantity}</div>
					<div class="info"><strong>Participante:</strong> ${selectedTicket.participant_name}</div>
					<div class="code">${selectedTicket.ticket_code}</div>
					<p style="text-align: center; color: #666; margin-top: 30px;">
						Apresente este código na entrada do evento
					</p>
				</div>
				<script>
					window.onload = function() { window.print(); }
				</script>
			</body>
			</html>
		`;

		const printWindow = window.open('', '_blank');
		if (printWindow) {
			printWindow.document.write(ticketHtml);
			printWindow.document.close();
		}
	};

	if (registrations.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
				<Ticket className="mx-auto mb-4 size-12 text-gray-400" />
				<h3 className="mb-2 text-lg font-semibold">Nenhum ingresso encontrado</h3>
				<p className="mb-6 text-muted-foreground">
					Você ainda não comprou nenhum ingresso. Explore os eventos disponíveis!
				</p>
				<Link
					href="/eventos"
					className="inline-block rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
				>
					Ver Eventos
				</Link>
			</div>
		);
	}

	return (
		<>
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{registrations.map((registration) => (
					<div
						key={registration.id}
						className="overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
					>
						{registration.event_id.cover_image && (
							<div className="relative aspect-video w-full">
								<Image
									src={getMediaAssetUrl(registration.event_id.cover_image)}
									alt={registration.event_id.title}
									fill
									className="object-cover"
								/>
							</div>
						)}
						<div className="p-4">
							<h3 className="mb-2 text-lg font-semibold">{registration.event_id.title}</h3>
							<div className="mb-4 space-y-2 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<Calendar className="size-4" />
									<span>
										{new Date(registration.event_id.event_date).toLocaleDateString('pt-BR', {
											day: '2-digit',
											month: 'short',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</span>
								</div>
								{registration.event_id.location && (
									<div className="flex items-center gap-2">
										<MapPin className="size-4" />
										<span className="line-clamp-1">{registration.event_id.location}</span>
									</div>
								)}
								<div className="flex items-center gap-2">
									<Ticket className="size-4" />
									<span>{registration.ticket_type_id.title} (x{registration.quantity})</span>
								</div>
							</div>
							<div className="mb-3 rounded bg-muted p-2 text-center font-mono text-sm font-semibold">
								{registration.ticket_code}
							</div>
							<button
								onClick={() => handleViewTicket(registration)}
								className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
							>
								Ver Ingresso
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Ticket Modal */}
			{selectedTicket && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
					onClick={() => setSelectedTicket(null)}
				>
					<div
						className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="mb-6 border-b pb-4">
							<h2 className="text-2xl font-bold">{selectedTicket.event_id.title}</h2>
							<p className="text-sm text-muted-foreground">
								{new Date(selectedTicket.event_id.event_date).toLocaleDateString('pt-BR', {
									weekday: 'long',
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>

						<div className="mb-6 space-y-3">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Tipo:</span>
								<span className="font-medium">{selectedTicket.ticket_type_id.title}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Quantidade:</span>
								<span className="font-medium">{selectedTicket.quantity}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Participante:</span>
								<span className="font-medium">{selectedTicket.participant_name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Código:</span>
								<span className="font-mono font-semibold">{selectedTicket.ticket_code}</span>
							</div>
						</div>

						<div className="mb-6 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 p-8 text-center">
							<div className="mb-4 text-6xl font-mono font-bold tracking-wider text-purple-900">
								{selectedTicket.ticket_code}
							</div>
							<p className="text-sm text-purple-700">
								Apresente este código na entrada do evento
							</p>
						</div>

						<div className="flex gap-3">
							<button
								onClick={handlePrintTicket}
								className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-white hover:bg-purple-700"
							>
								<Download className="size-4" />
								Imprimir Ingresso
							</button>
							<button
								onClick={() => setSelectedTicket(null)}
								className="rounded-lg border px-4 py-3 hover:bg-muted"
							>
								Fechar
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
