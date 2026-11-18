'use client';
import { Can } from '@/components/auth/PermissionsProvider';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';

import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Calendar, CreditCard, CheckCircle, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CancelRegistrationDialog } from '../_components/CancelRegistrationDialog';
import { CheckInDialog } from '../_components/CheckInDialog';
import { EditParticipantDialog } from '../_components/EditParticipantDialog';
import { ResendEmailDialog } from '../_components/ResendEmailDialog';
import type { ParticipantDetails } from '../_lib/types';
import {
	deriveTicketStatus,
	formatDate,
	formatCurrency,
	getInitials,
	getParticipantFullName,
	statusLabels,
	paymentStatusLabels,
	paymentMethodLabels,
} from '../_lib/utils';

export default function ParticipantDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const { toast } = useToast();

	const [participant, setParticipant] = useState<ParticipantDetails | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [activeDialog, setActiveDialog] = useState<'cancel' | 'checkin' | 'edit' | 'resend' | null>(null);

	const participantId = params?.id as string;

	useEffect(() => {
		if (!participantId) return;

		let cancelled = false;

		async function loadParticipant() {
			setIsLoading(true);
			setError(null);

			try {
				const response = await fetch(`/api/admin/participantes/${participantId}`, { credentials: 'include' });

				if (cancelled) return;

				if (response.status === 401) {
					router.replace(`/login?redirect=${encodeURIComponent(`/admin/participantes/${participantId}`)}`);

					return;
				}

				const json = await response.json();

				if (!response.ok) {
					setError(json.detail || 'Erro ao carregar participante');
				} else {
					setParticipant(json.data);
				}
			} catch {
				if (cancelled) return;
				setError('Erro ao carregar participante');
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		}

		loadParticipant();

		return () => {
			cancelled = true;
		};
	}, [participantId, refreshTrigger, router]);

	const handleActionSuccess = () => {
		setActiveDialog(null);
		setRefreshTrigger((current) => current + 1);
	};

	const handleDownloadTicket = async () => {
		if (!participant || isDownloading) return;
		setIsDownloading(true);

		try {
			const [{ default: QRCode }, { jsPDF }] = await Promise.all([import('qrcode'), import('jspdf')]);
			const qrCode = await QRCode.toDataURL(participant.ticket_code, { margin: 1, width: 600 });
			const pdf = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });

			pdf.setFontSize(20);
			pdf.text(participant.event.title, 20, 25);
			pdf.setFontSize(12);
			pdf.text(`Participante: ${getParticipantFullName(participant)}`, 20, 40);
			pdf.text(`Ingresso: ${participant.ticket_type?.title ?? 'Ingresso'}`, 20, 48);
			pdf.text(`Código: ${participant.ticket_code}`, 20, 56);
			pdf.text(`Data: ${formatDate(participant.event.start_date, 'dd/MM/yyyy HH:mm')}`, 20, 64);
			pdf.addImage(qrCode, 'PNG', 65, 78, 80, 80);
			pdf.setFontSize(10);
			pdf.text('Apresente este código na entrada do evento.', 67, 168);
			pdf.save(`ingresso-${participant.ticket_code}.pdf`);
		} catch {
			toast({
				title: 'Não foi possível gerar o PDF',
				description: 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
		} finally {
			setIsDownloading(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Spinner className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !participant) {
		return (
			<div className="space-y-6">
				<PageHeader title="Detalhes do Ingresso" />

				<Card className="p-8 text-center">
					<p className="font-medium text-destructive ">{error || 'Ingresso não encontrado'}</p>
					<Button variant="outline" className="mt-4" onClick={() => router.push('/admin/participantes')}>
						Voltar para lista
					</Button>
				</Card>
			</div>
		);
	}

	const attendeeName = getParticipantFullName(participant);
	const { registration, event } = participant;
	const status = deriveTicketStatus(participant);
	const avatar = participant.is_buyer ? registration.user?.avatar : null;
	const isCancelled = registration.status === 'cancelled';

	return (
		<div className="space-y-6">
			{/* Header com Navegação */}
			<PageHeader
				title="Detalhes do Ingresso"
				description={<>Participantes / {attendeeName}</>}
				actions={
					<div className="flex flex-wrap gap-2 sm:flex-nowrap">
						<Can permission={'participants.update'} eventId={participant.event.id}>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-initial"
								onClick={() => setActiveDialog('resend')}
								disabled={!participant.attendee_email}
							>
								Reenviar Email
							</Button>
						</Can>
						<Can permission={'participants.update'} eventId={participant.event.id}>
							<Button
								variant="outline"
								size="sm"
								className="flex-1 sm:flex-initial"
								onClick={() => setActiveDialog('edit')}
							>
								{participant.attendee_name ? 'Editar' : 'Informar participante'}
							</Button>
						</Can>
						<Can permission={'participants.cancel'} eventId={participant.event.id}>
							<Button
								variant="destructive"
								size="sm"
								className="flex-1 sm:flex-initial"
								onClick={() => setActiveDialog('cancel')}
								disabled={isCancelled}
							>
								Cancelar Pedido
							</Button>
						</Can>
					</div>
				}
			/>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Coluna Principal */}
				<div className="space-y-6 lg:col-span-2">
					{/* Seção: Participante do ingresso */}
					<Card className="p-6">
						<div className="mb-4 flex items-center gap-2">
							<User className="size-5 text-muted-foreground dark:text-muted-foreground" />
							<h2 className="text-lg font-semibold text-foreground">Participante</h2>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<Avatar className="size-16">
									{avatar && <AvatarImage src={avatar} alt={attendeeName} />}
									<AvatarFallback className="text-lg">
										{participant.attendee_name ? getInitials(participant.attendee_name) : '?'}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3
										className={`text-xl font-bold ${
											participant.attendee_name ? 'text-foreground' : 'italic text-muted-foreground '
										}`}
									>
										{attendeeName}
									</h3>
									{participant.attendee_email ? (
										<p className="text-sm text-muted-foreground dark:text-muted-foreground">
											{participant.attendee_email}
										</p>
									) : (
										<p className="text-sm text-muted-foreground dark:text-muted-foreground">
											Quem comprou ainda não informou quem vai usar este ingresso.
										</p>
									)}
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Telefone</p>
									<p className="text-base text-foreground">{participant.attendee_phone || '—'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Documento</p>
									<p className="text-base text-foreground">{participant.attendee_document || '—'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
										Código do Ingresso
									</p>
									<p className="font-mono text-base text-foreground">{participant.ticket_code}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Status</p>
									<Badge variant="secondary">{statusLabels[status] || status}</Badge>
								</div>
							</div>
						</div>
					</Card>

					{/* Seção: Ingresso e evento */}
					<Card className="p-6">
						<div className="mb-4 flex items-center gap-2">
							<Calendar className="size-5 text-muted-foreground dark:text-muted-foreground" />
							<h2 className="text-lg font-semibold text-foreground">Ingresso e Evento</h2>
						</div>

						<div className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Evento</p>
								<p className="text-lg font-semibold text-foreground">{event.title}</p>
								<p className="text-sm text-muted-foreground dark:text-muted-foreground">
									{formatDate(event.start_date, 'dd MMM yyyy, HH:mm')}
									{event.end_date && ` - ${formatDate(event.end_date, 'dd MMM yyyy, HH:mm')}`}
								</p>
								{event.location_name && (
									<p className="text-sm text-muted-foreground dark:text-muted-foreground">{event.location_name}</p>
								)}
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
										Tipo de Ingresso
									</p>
									<p className="text-base text-foreground">{participant.ticket_type?.title || '—'}</p>
									{participant.ticket_type?.description && (
										<p className="text-sm text-muted-foreground dark:text-muted-foreground">
											{participant.ticket_type.description}
										</p>
									)}
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Unidade</p>
									<p className="text-base text-foreground">
										Ingresso {participant.sequence} de {registration.quantity}
									</p>
								</div>
								{participant.named_at && (
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
											Participante informado em
										</p>
										<p className="text-base text-foreground">
											{formatDate(participant.named_at, 'dd MMM yyyy, HH:mm')}
										</p>
									</div>
								)}
							</div>
						</div>
					</Card>

					{/* Seção: Pedido e pagamento */}
					<Can permission={'finance.read'} eventId={participant.event.id}>
						<Card className="p-6">
							<div className="mb-4 flex items-center gap-2">
								<CreditCard className="size-5 text-muted-foreground dark:text-muted-foreground" />
								<h2 className="text-lg font-semibold text-foreground">Pedido e Pagamento</h2>
							</div>

							<div className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Comprado por</p>
										<p className="text-base text-foreground">{registration.participant_name}</p>
										<p className="text-sm text-muted-foreground dark:text-muted-foreground">
											{registration.participant_email}
										</p>
									</div>
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
											Data da Compra
										</p>
										<p className="text-base text-foreground">
											{formatDate(registration.date_created, 'dd MMM yyyy, HH:mm')}
										</p>
									</div>
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
											Status do Pagamento
										</p>
										<Badge variant="secondary">
											{paymentStatusLabels[registration.payment_status || ''] || registration.payment_status}
										</Badge>
									</div>
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
											Método de Pagamento
										</p>
										<p className="text-base text-foreground">
											{registration.payment_method
												? paymentMethodLabels[registration.payment_method] || registration.payment_method
												: '—'}
										</p>
									</div>
								</div>

								<div className="rounded-lg bg-muted p-4">
									<div className="grid gap-3">
										<div className="flex justify-between">
											<span className="text-muted-foreground dark:text-muted-foreground">Preço Unitário</span>
											<span className="font-medium text-foreground">{formatCurrency(participant.unit_price)}</span>
										</div>
										{participant.service_fee > 0 && (
											<div className="flex justify-between">
												<span className="text-muted-foreground dark:text-muted-foreground">Taxa de Serviço</span>
												<span className="font-medium text-foreground">{formatCurrency(participant.service_fee)}</span>
											</div>
										)}
										{participant.discount > 0 && (
											<div className="flex justify-between">
												<span className="text-muted-foreground dark:text-muted-foreground">Desconto</span>
												<span className="font-medium text-foreground">- {formatCurrency(participant.discount)}</span>
											</div>
										)}
										<div className="border-t border-border pt-3">
											<div className="flex justify-between">
												<span className="text-lg font-semibold text-foreground">Este ingresso</span>
												<span className="text-lg font-bold text-foreground">
													{formatCurrency(participant.total_amount)}
												</span>
											</div>
											<div className="mt-1 flex justify-between text-sm">
												<span className="text-muted-foreground dark:text-muted-foreground">
													Pedido inteiro ({registration.quantity} ingresso{registration.quantity > 1 ? 's' : ''})
												</span>
												<span className="text-foreground">{formatCurrency(registration.total_amount)}</span>
											</div>
										</div>
									</div>
								</div>

								{registration.receipt_url && (
									<a
										href={registration.receipt_url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:underline "
									>
										<FileText className="size-4" />
										Ver comprovante de pagamento
									</a>
								)}

								{registration.notes && (
									<div>
										<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
											Observações do pedido
										</p>
										<p className="whitespace-pre-line text-base text-foreground">{registration.notes}</p>
									</div>
								)}
							</div>
						</Card>
					</Can>
				</div>

				{/* Coluna Lateral */}
				<div className="space-y-6">
					{/* Seção: Check-in */}
					<Card className="p-6">
						<div className="mb-4 flex items-center gap-2">
							<CheckCircle className="size-5 text-muted-foreground dark:text-muted-foreground" />
							<h2 className="text-lg font-semibold text-foreground">Check-in</h2>
						</div>

						{participant.check_in_date ? (
							<div className="space-y-3">
								<div className="flex items-center gap-2 text-muted-foreground ">
									<CheckCircle className="size-5" />
									<span className="font-medium">Check-in realizado</span>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Data e Hora</p>
									<p className="text-base text-foreground">
										{formatDate(participant.check_in_date, 'dd MMM yyyy, HH:mm')}
									</p>
								</div>
								<Can
									permission={participant.check_in_date ? 'checkin.undo' : 'checkin.execute'}
									eventId={participant.event.id}
								>
									<Button variant="outline" className="w-full" size="sm" onClick={() => setActiveDialog('checkin')}>
										Desfazer Check-in
									</Button>
								</Can>
							</div>
						) : (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground dark:text-muted-foreground">
									{participant.attendee_name
										? 'Check-in ainda não realizado'
										: 'Informe o participante antes do check-in'}
								</p>
								<Can
									permission={participant.check_in_date ? 'checkin.undo' : 'checkin.execute'}
									eventId={participant.event.id}
								>
									<Button
										variant="default"
										className="w-full"
										size="sm"
										onClick={() => setActiveDialog('checkin')}
										disabled={isCancelled || !participant.attendee_name}
									>
										Fazer Check-in
									</Button>
								</Can>
							</div>
						)}
					</Card>

					{/* Seção: Ações Rápidas */}
					<Card className="p-6">
						<div className="mb-4 flex items-center gap-2">
							<Settings className="size-5 text-muted-foreground dark:text-muted-foreground" />
							<h2 className="text-lg font-semibold text-foreground">Ações</h2>
						</div>

						<div className="space-y-2">
							<Can permission={'participants.update'} eventId={participant.event.id}>
								<Button
									variant="outline"
									className="w-full justify-start"
									size="sm"
									onClick={() => setActiveDialog('resend')}
									disabled={!participant.attendee_email}
								>
									{participant.is_buyer ? 'Reenviar Recibo da Compra' : 'Reenviar Ingresso'}
								</Button>
							</Can>
							<Button
								variant="outline"
								className="w-full justify-start"
								size="sm"
								onClick={handleDownloadTicket}
								disabled={isDownloading}
							>
								{isDownloading ? 'Gerando PDF...' : 'Baixar Ingresso (PDF)'}
							</Button>
							<Can permission={'participants.update'} eventId={participant.event.id}>
								<Button
									variant="outline"
									className="w-full justify-start"
									size="sm"
									onClick={() => setActiveDialog('edit')}
								>
									{participant.attendee_name ? 'Editar Participante' : 'Informar Participante'}
								</Button>
							</Can>
							<Can permission={'participants.cancel'} eventId={participant.event.id}>
								<Button
									variant="destructive"
									className="w-full justify-start"
									size="sm"
									onClick={() => setActiveDialog('cancel')}
									disabled={isCancelled}
								>
									Cancelar Pedido
								</Button>
							</Can>
						</div>
					</Card>
				</div>
			</div>

			<CheckInDialog
				participant={participant}
				open={activeDialog === 'checkin'}
				onOpenChange={(open) => setActiveDialog(open ? 'checkin' : null)}
				onSuccess={handleActionSuccess}
			/>
			<EditParticipantDialog
				participant={participant}
				open={activeDialog === 'edit'}
				onOpenChange={(open) => setActiveDialog(open ? 'edit' : null)}
				onSuccess={handleActionSuccess}
			/>
			<CancelRegistrationDialog
				participant={participant}
				open={activeDialog === 'cancel'}
				onOpenChange={(open) => setActiveDialog(open ? 'cancel' : null)}
				onSuccess={handleActionSuccess}
			/>
			<ResendEmailDialog
				participant={participant}
				open={activeDialog === 'resend'}
				onOpenChange={(open) => setActiveDialog(open ? 'resend' : null)}
				onSuccess={handleActionSuccess}
			/>
		</div>
	);
}
