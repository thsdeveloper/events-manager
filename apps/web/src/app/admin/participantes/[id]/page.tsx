'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, User, Calendar, CreditCard, CheckCircle, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthToken } from '../_hooks/useAuthToken';
import { useToast } from '@/hooks/use-toast';
import type { ParticipantDetails } from '../_lib/types';
import {
  formatDate,
  formatCurrency,
  getInitials,
  statusLabels,
  statusBadgeClasses,
  paymentStatusLabels,
  paymentStatusBadgeClasses,
  paymentMethodLabels,
} from '../_lib/utils';

export default function ParticipantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isLoading: isLoadingToken } = useAuthToken();
  const { toast } = useToast();

  const [participant, setParticipant] = useState<ParticipantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const participantId = params?.id as string;

  useEffect(() => {
    if (!token || !participantId) {
      if (!isLoadingToken) {
        setIsLoading(false);
      }
      
return;
    }

    let cancelled = false;

    async function loadParticipant() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/participantes/${participantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (cancelled) return;

        const json = await response.json();

        if (!response.ok) {
          setError(json.error || 'Erro ao carregar participante');
        } else {
          setParticipant(json.data);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading participant:', error);
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
  }, [token, isLoadingToken, participantId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/participantes"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detalhes do Participante</h1>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-800 dark:bg-rose-900/20">
          <p className="font-medium text-rose-900 dark:text-rose-200">
            {error || 'Participante não encontrado'}
          </p>
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
          <Link
            href="/admin/participantes"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">Detalhes do Participante</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
            Reenviar Email
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
            Editar
          </Button>
          <Button variant="destructive" size="sm" className="flex-1 sm:flex-initial">
            Cancelar Inscrição
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* Seção: Informações Pessoais */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <User className="size-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações Pessoais</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {avatar && <AvatarImage src={avatar} alt={participant.participant_name} />}
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {participant.participant_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{participant.participant_email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefone</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {participant.participant_phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Documento</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {participant.participant_document || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Código do Ingresso</p>
                  <p className="font-mono text-base text-gray-900 dark:text-white">
                    {participant.ticket_code}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                  <Badge className={`${statusBadgeClasses[participant.status || '']} mt-1`}>
                    {statusLabels[participant.status || ''] || participant.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Seção: Detalhes da Inscrição */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes da Inscrição</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Evento</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {participant.event_id.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(participant.event_id.start_date, 'dd MMM yyyy, HH:mm')}
                  {participant.event_id.end_date &&
                    ` - ${formatDate(participant.event_id.end_date, 'dd MMM yyyy, HH:mm')}`}
                </p>
                {participant.event_id.location_name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {participant.event_id.location_name}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Ingresso</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {participant.ticket_type_id?.title || '—'}
                  </p>
                  {participant.ticket_type_id?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {participant.ticket_type_id.description}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quantidade</p>
                  <p className="text-base text-gray-900 dark:text-white">{participant.quantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data de Inscrição</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {formatDate(participant.date_created || '', 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                {participant.date_updated && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Última Atualização</p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {formatDate(participant.date_updated, 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção: Pagamento */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="size-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pagamento</h2>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status do Pagamento</p>
                  <Badge
                    className={`${paymentStatusBadgeClasses[participant.payment_status || '']} mt-1`}
                  >
                    {paymentStatusLabels[participant.payment_status || ''] || participant.payment_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Método de Pagamento</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {participant.payment_method
                      ? paymentMethodLabels[participant.payment_method] || participant.payment_method
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Preço Unitário</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(participant.unit_price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quantidade</span>
                    <span className="font-medium text-gray-900 dark:text-white">{participant.quantity}</span>
                  </div>
                  {(participant.service_fee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Taxa de Serviço</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(participant.service_fee)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(participant.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {participant.provider_transaction_id && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ID do Pagamento</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {participant.provider_transaction_id}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seção: Informações Adicionais */}
          {participant.additional_info && Object.keys(participant.additional_info).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="size-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações Adicionais</h2>
              </div>

              <div className="space-y-3">
                {Object.entries(participant.additional_info as Record<string, any>).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Seção: Check-in */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle className="size-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Check-in</h2>
            </div>

            {participant.check_in_date ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="size-5" />
                  <span className="font-medium">Check-in realizado</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Data e Hora</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {formatDate(participant.check_in_date, 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  Desfazer Check-in
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Check-in ainda não realizado</p>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm">
                  Fazer Check-in
                </Button>
              </div>
            )}
          </div>

          {/* Seção: Ações Rápidas */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="size-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ações</h2>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                Reenviar Email de Confirmação
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Baixar Ingresso (PDF)
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                Editar Dados
              </Button>
              <Button variant="destructive" className="w-full justify-start" size="sm">
                Cancelar Inscrição
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
