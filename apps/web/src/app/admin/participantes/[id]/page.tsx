'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, CheckCircle, CreditCard, FileText, Loader2, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CancelRegistrationDialog } from '../_components/CancelRegistrationDialog';
import { CheckInDialog } from '../_components/CheckInDialog';
import { EditParticipantDialog } from '../_components/EditParticipantDialog';
import { ResendEmailDialog } from '../_components/ResendEmailDialog';
import type { ParticipantDetails } from '../_lib/types';
import {
	formatCurrency,
	formatDate,
	getInitials,
	paymentMethodLabels,
	paymentStatusBadgeClasses,
	paymentStatusLabels,
	statusBadgeClasses,
	statusLabels,
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
		if (!participant?.ticket_code || isDownloading) return;
		setIsDownloading(true);

		try {
			const [{ default: QRCode }, { jsPDF }] = await Promise.all([import('qrcode'), import('jspdf')]);
			const qrCode = await QRCode.toDataURL(participant.ticket_code, { margin: 1, width: 600 });
			const pdf = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });

			pdf.setFontSize(20);
			pdf.text(participant.event_id.title, 20, 25);
			pdf.setFontSize(12);
			pdf.text(`Participante: ${participant.participant_name}`, 20, 40);
			pdf.text(`Ingresso: ${participant.ticket_type_id?.title ?? 'Ingresso'}`, 20, 48);
			pdf.text(`Código: ${participant.ticket_code}`, 20, 56);
			pdf.text(`Data: ${formatDate(participant.event_id.start_date, 'dd/MM/yyyy HH:mm')}`, 20, 64);
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
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !participant) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild variant="ghost" size="icon">
						<Link
							aria-label="Voltar"
							href="/admin/participantes"
							className="rounded-lg p-2 transition-colors hover:bg-muted dark:hover:bg-gray-700"
						>
							<ArrowLeft className="size-5" />
						</Link>
					</Button>
					<h1 className="text-3xl font-bold text-foreground ">Detalhes do Participante</h1>
				</div>

				<div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-800 dark:bg-rose-900/20">
					<p className="font-medium text-rose-900 dark:text-rose-200">{error || 'Participante não encontrado'}</p>
					<Button variant="outline" className="mt-4" onClick={() => router.push('/admin/participantes')}>
						Voltar para lista
					</Button>
				</div>
			</div>
		);
	}

	const initials = getInitials(participant.participant_name);
	const avatar = participant.user_id?.avatar;

	return (
		<div className="space-y-6">
			{/* Header com Navegação */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-4">
					<Button asChild variant="ghost" size="icon">
						<Link
							aria-label="Voltar"
							href="/admin/participantes"
							className="rounded-lg p-2 transition-colors hover:bg-muted dark:hover:bg-gray-700"
						>
							<ArrowLeft className="size-5" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-bold text-foreground sm:text-3xl ">Detalhes do Participante</h1>
						<p className="mt-1 text-sm text-muted-foreground ">
							<Link href="/admin/participantes" className="hover:underline">
								Participantes
							</Link>
							{' / '}
							<span className="font-medium">{participant.participant_name}</span>
						</p>
					</div>
				</div>

				{/* Ações Principais - Responsivo */}
				<div className="flex flex-wrap gap-2 sm:flex-nowrap">
					<Button
						variant="outline"
						size="sm"
						className="flex-1 sm:flex-initial"
						onClick={() => setActiveDialog('resend')}
					>
						Reenviar Email
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="flex-1 sm:flex-initial"
						onClick={() => setActiveDialog('edit')}
					>
						Editar
					</Button>
					<Button
						variant="destructive"
						size="sm"
						className="flex-1 sm:flex-initial"
						onClick={() => setActiveDialog('cancel')}
						disabled={participant.status === 'cancelled'}
					>
						Cancelar Inscrição
					</Button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Coluna Principal */}
				<div className="space-y-6 lg:col-span-2">
					{/* Seção: Informações Pessoais */}
					<Card className="rounded-lg border border-border bg-card p-6  ">
						<div className="mb-4 flex items-center gap-2">
							<User className="size-5 text-muted-foreground " />
							<h2 className="text-lg font-semibold text-foreground ">Informações Pessoais</h2>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<Avatar className="size-16">
									{avatar && <AvatarImage src={avatar} alt={participant.participant_name} />}
									<AvatarFallback className="text-lg">{initials}</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="text-xl font-bold text-foreground ">{participant.participant_name}</h3>
									<p className="text-sm text-muted-foreground ">{participant.participant_email}</p>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Telefone</p>
									<p className="text-base text-foreground ">{participant.participant_phone || '—'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Documento</p>
									<p className="text-base text-foreground ">{participant.participant_document || '—'}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Código do Ingresso</p>
									<p className="font-mono text-base text-foreground ">{participant.ticket_code}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Status</p>
									<Badge className={`${statusBadgeClasses[participant.status || '']} mt-1`}>
										{statusLabels[participant.status || ''] || participant.status}
									</Badge>
								</div>
							</div>
						</div>
					</Card>

					{/* Seção: Detalhes da Inscrição */}
					<Card className="rounded-lg border border-border bg-card p-6  ">
						<div className="mb-4 flex items-center gap-2">
							<Calendar className="size-5 text-muted-foreground " />
							<h2 className="text-lg font-semibold text-foreground ">Detalhes da Inscrição</h2>
						</div>

						<div className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground ">Evento</p>
								<p className="text-lg font-semibold text-foreground ">{participant.event_id.title}</p>
								<p className="text-sm text-muted-foreground ">
									{formatDate(participant.event_id.start_date, 'dd MMM yyyy, HH:mm')}
									{participant.event_id.end_date &&
										` - ${formatDate(participant.event_id.end_date, 'dd MMM yyyy, HH:mm')}`}
								</p>
								{participant.event_id.location_name && (
									<p className="text-sm text-muted-foreground ">{participant.event_id.location_name}</p>
								)}
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Tipo de Ingresso</p>
									<p className="text-base text-foreground ">{participant.ticket_type_id?.title || '—'}</p>
									{participant.ticket_type_id?.description && (
										<p className="text-sm text-muted-foreground ">{participant.ticket_type_id.description}</p>
									)}
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Quantidade</p>
									<p className="text-base text-foreground ">{participant.quantity}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Data de Inscrição</p>
									<p className="text-base text-foreground ">
										{formatDate(participant.date_created || '', 'dd MMM yyyy, HH:mm')}
									</p>
								</div>
								{participant.date_updated && (
									<div>
										<p className="text-sm font-medium text-muted-foreground ">Última Atualização</p>
										<p className="text-base text-foreground ">
											{formatDate(participant.date_updated, 'dd MMM yyyy, HH:mm')}
										</p>
									</div>
								)}
							</div>
						</div>
					</Card>

					{/* Seção: Pagamento */}
					<Card className="rounded-lg border border-border bg-card p-6  ">
						<div className="mb-4 flex items-center gap-2">
							<CreditCard className="size-5 text-muted-foreground " />
							<h2 className="text-lg font-semibold text-foreground ">Pagamento</h2>
						</div>

						<div className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Status do Pagamento</p>
									<Badge className={`${paymentStatusBadgeClasses[participant.payment_status || '']} mt-1`}>
										{paymentStatusLabels[participant.payment_status || ''] || participant.payment_status}
									</Badge>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Método de Pagamento</p>
									<p className="text-base text-foreground ">
										{participant.payment_method
											? paymentMethodLabels[participant.payment_method] || participant.payment_method
											: '—'}
									</p>
								</div>
							</div>

							<div className="rounded-lg bg-muted/40 p-4 ">
								<div className="grid gap-3">
									<div className="flex justify-between">
										<span className="text-muted-foreground ">Preço Unitário</span>
										<span className="font-medium text-foreground ">{formatCurrency(participant.unit_price)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground ">Quantidade</span>
										<span className="font-medium text-foreground ">{participant.quantity}</span>
									</div>
									{(participant.service_fee ?? 0) > 0 && (
										<div className="flex justify-between">
											<span className="text-muted-foreground ">Taxa de Serviço</span>
											<span className="font-medium text-foreground ">{formatCurrency(participant.service_fee)}</span>
										</div>
									)}
									<div className="border-t border-border pt-3 ">
										<div className="flex justify-between">
											<span className="text-lg font-semibold text-foreground ">Total</span>
											<span className="text-lg font-bold text-foreground ">
												{formatCurrency(participant.total_amount)}
											</span>
										</div>
									</div>
								</div>
							</div>

							{participant.provider_transaction_id && (
								<div>
									<p className="text-sm font-medium text-muted-foreground ">ID do Pagamento</p>
									<p className="font-mono text-sm text-foreground ">{participant.provider_transaction_id}</p>
								</div>
							)}
						</div>
					</Card>

					{/* Seção: Informações Adicionais */}
					{participant.additional_info && Object.keys(participant.additional_info).length > 0 && (
						<Card className="rounded-lg border border-border bg-card p-6  ">
							<div className="mb-4 flex items-center gap-2">
								<FileText className="size-5 text-muted-foreground " />
								<h2 className="text-lg font-semibold text-foreground ">Informações Adicionais</h2>
							</div>

							<div className="space-y-3">
								{Object.entries(participant.additional_info as Record<string, unknown>).map(([key, value]) => (
									<div key={key}>
										<p className="text-sm font-medium text-muted-foreground ">
											{key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
										</p>
										<p className="text-base text-foreground ">
											{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
										</p>
									</div>
								))}
							</div>
						</Card>
					)}
				</div>

				{/* Coluna Lateral */}
				<div className="space-y-6">
					{/* Seção: Check-in */}
					<Card className="rounded-lg border border-border bg-card p-6  ">
						<div className="mb-4 flex items-center gap-2">
							<CheckCircle className="size-5 text-muted-foreground " />
							<h2 className="text-lg font-semibold text-foreground ">Check-in</h2>
						</div>

						{participant.check_in_date ? (
							<div className="space-y-3">
								<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
									<CheckCircle className="size-5" />
									<span className="font-medium">Check-in realizado</span>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Data e Hora</p>
									<p className="text-base text-foreground ">
										{formatDate(participant.check_in_date, 'dd MMM yyyy, HH:mm')}
									</p>
								</div>
								<Button variant="outline" className="w-full" size="sm" onClick={() => setActiveDialog('checkin')}>
									Desfazer Check-in
								</Button>
							</div>
						) : (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground ">Check-in ainda não realizado</p>
								<Button
									className="w-full bg-emerald-600 hover:bg-emerald-700"
									size="sm"
									onClick={() => setActiveDialog('checkin')}
									disabled={participant.status === 'cancelled'}
								>
									Fazer Check-in
								</Button>
							</div>
						)}
					</Card>

					{/* Seção: Ações Rápidas */}
					<Card className="rounded-lg border border-border bg-card p-6  ">
						<div className="mb-4 flex items-center gap-2">
							<Settings className="size-5 text-muted-foreground " />
							<h2 className="text-lg font-semibold text-foreground ">Ações</h2>
						</div>

						<div className="space-y-2">
							<Button
								variant="outline"
								className="w-full justify-start"
								size="sm"
								onClick={() => setActiveDialog('resend')}
							>
								Reenviar Email de Confirmação
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start"
								size="sm"
								onClick={handleDownloadTicket}
								disabled={isDownloading || !participant.ticket_code}
							>
								{isDownloading ? 'Gerando PDF...' : 'Baixar Ingresso (PDF)'}
							</Button>
							<Button
								variant="outline"
								className="w-full justify-start"
								size="sm"
								onClick={() => setActiveDialog('edit')}
							>
								Editar Dados
							</Button>
							<Button
								variant="destructive"
								className="w-full justify-start"
								size="sm"
								onClick={() => setActiveDialog('cancel')}
								disabled={participant.status === 'cancelled'}
							>
								Cancelar Inscrição
							</Button>
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
