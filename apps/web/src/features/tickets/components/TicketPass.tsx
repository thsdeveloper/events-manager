'use client';
import { useEffect, useRef, useState } from 'react';
import type { NominalTicket } from '@events-manager/contracts';
import { CalendarDays, Check, Download, ExternalLink, LockKeyhole, MapPin, UserRoundPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTicketAccess } from '../ticket-access';
import { purchaseDate } from '../purchases';

/** A real admission pass. The QR encodes the issued ticket, never the purchase identifier. */
export function TicketPass({
	ticket,
	index = 1,
	onChangeAttendee,
}: {
	ticket: NominalTicket;
	index?: number;
	onChangeAttendee?(ticket: NominalTicket): void;
}) {
	const { canUseTicket, notice, paymentConfirmed } = getTicketAccess(ticket);
	const [qr, setQr] = useState('');
	const [error, setError] = useState('');
	const [downloading, setDownloading] = useState(false);
	const pass = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let active = true;
		setQr('');
		if (canUseTicket)
			import('qrcode')
				.then(({ default: QRCode }) =>
					QRCode.toDataURL(ticket.ticket_code, { width: 320, margin: 2, color: { dark: '#231A33', light: '#FFFFFF' } }),
				)
				.then((url) => (active ? setQr(url) : undefined))
				.catch(() => {
					if (active) setError('Não foi possível gerar o QR Code. Atualize a página.');
				});

		return () => {
			active = false;
		};
	}, [canUseTicket, ticket.ticket_code]);
	async function download() {
		if (!pass.current || !canUseTicket || downloading) return;
		setDownloading(true);
		setError('');
		try {
			const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
			const canvas = await html2canvas(pass.current, { scale: 2, logging: false, backgroundColor: '#ffffff' });
			const pdf = new jsPDF();
			const width = Math.min(190, (277 * canvas.width) / canvas.height);
			pdf.addImage(
				canvas.toDataURL('image/png'),
				'PNG',
				(210 - width) / 2,
				10,
				width,
				(canvas.height * width) / canvas.width,
			);
			pdf.save(`ingresso-${ticket.ticket_code}.pdf`);
		} catch {
			setError('Não foi possível baixar o ingresso. Tente novamente.');
		} finally {
			setDownloading(false);
		}
	}

	return (
		<article aria-label={`Ingresso ${index}`} className="min-w-0">
			<div ref={pass} className="overflow-hidden rounded-3xl border border-[#E4DAF7] bg-white text-[#231A33] shadow-sm">
				<div className="flex items-center justify-between bg-[#231A33] px-6 py-4 text-white">
					<span className="text-sm font-semibold tracking-widest">
						FLOUVI · INGRESSO {String(index).padStart(2, '0')}
					</span>
					<span className="rounded-full bg-white/10 px-3 py-1 text-xs">
						{ticket.is_buyer ? 'Seu ingresso' : 'Convidado'}
					</span>
				</div>
				<div className="grid sm:grid-cols-[1fr_190px]">
					<div className="min-w-0 space-y-5 p-6">
						<div>
							<p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
								{ticket.ticket_type?.title ?? 'Ingresso'}
							</p>
							<h3 className="text-xl font-semibold leading-tight">{ticket.event.title}</h3>
						</div>
						<div className="space-y-2 text-sm text-muted-foreground">
							<p className="flex items-center gap-2">
								<CalendarDays className="size-4 shrink-0" />
								{purchaseDate(ticket.event.start_date)}
							</p>
							<p className="flex items-center gap-2">
								<MapPin className="size-4 shrink-0" />
								{ticket.event.event_type === 'online'
									? 'Evento online'
									: ticket.event.location_name || 'Local a confirmar'}
							</p>
						</div>
						<div role="group" aria-label="Participante">
							<p className="text-xs text-muted-foreground">Participante</p>
							<p className="mt-1 break-words text-lg font-semibold">
								{ticket.attendee_name || 'Participante a informar'}
							</p>
							<p className="break-all text-sm text-muted-foreground">{ticket.attendee_email}</p>
							{!ticket.is_buyer && ticket.can_edit_attendee && onChangeAttendee ? (
								<div className="mt-4" data-html2canvas-ignore="true">
									<Button
										variant={ticket.attendee_name ? 'outline' : 'default'}
										className={
											ticket.attendee_name
												? 'w-full sm:w-auto'
												: 'h-11 w-full bg-[#743DF5] text-white hover:bg-[#6530DF] sm:w-auto'
										}
										onClick={() => onChangeAttendee(ticket)}
									>
										<UserRoundPen className="size-4" />
										{ticket.attendee_name ? 'Alterar participante' : 'Informar participante'}
									</Button>
								</div>
							) : null}
						</div>
						{canUseTicket && ticket.event.online_url ? (
							<Button asChild variant="outline" size="sm">
								<a href={ticket.event.online_url} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="size-4" />
									Acessar evento online
								</a>
							</Button>
						) : null}
					</div>
					<div className="relative flex flex-col items-center justify-center gap-2 border-t-2 border-dashed border-[#E4DAF7] bg-[#F3EEFF]/40 px-5 py-6 sm:border-l-2 sm:border-t-0">
						{canUseTicket ? (
							<>
								{qr ? (
									<img
										src={qr}
										alt={`QR Code de ${ticket.attendee_name}`}
										width={150}
										height={150}
										className="rounded-xl bg-white p-1"
									/>
								) : (
									<p role="status" className="text-xs">
										Preparando QR Code…
									</p>
								)}
								<span className="break-all text-center font-mono text-[10px]">{ticket.ticket_code}</span>
								<p className="flex items-center gap-1 text-xs font-medium text-primary">
									<Check className="size-3" />
									{ticket.check_in_date ? 'Check-in realizado' : 'Pronto para o evento'}
								</p>
							</>
						) : (
							<>
								<span className="flex size-14 items-center justify-center rounded-full bg-white">
									<LockKeyhole className="size-6 text-primary" />
								</span>
								<p className="text-center text-sm font-medium">{notice?.label ?? 'Informe o participante'}</p>
								<p className="text-center text-xs leading-relaxed text-muted-foreground">
									{paymentConfirmed
										? 'O QR Code aparece depois de informar nome e e-mail.'
										: 'O QR Code aparece após a quitação da compra.'}
								</p>
							</>
						)}
					</div>
				</div>
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-2">
				{canUseTicket ? (
					<Button variant="outline" size="sm" onClick={download} disabled={downloading || !qr}>
						<Download className="size-4" />
						{downloading ? 'Preparando PDF…' : 'Baixar ingresso'}
					</Button>
				) : null}
			</div>
			{error ? (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{error}
				</p>
			) : null}
		</article>
	);
}
