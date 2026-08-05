'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TicketSelection, { TicketSelectionItem } from './TicketSelection';
import InstallmentOptions from './InstallmentOptions';
import type { EventTicket } from '@events-manager/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';
import { useInstallmentCheckout } from '@/hooks/useInstallmentCheckout';
import { AlertCircle } from 'lucide-react';
import {Alert, AlertDescription} from "@/components/ui/alert";

interface EventCheckoutProps {
  eventId: string;
  eventTitle: string;
  tickets: EventTicket[];
  userId?: string;
  defaultParticipantInfo?: {
    name: string;
    email: string;
  };
}

export default function EventCheckout({
  eventId,
  eventTitle,
  tickets,
  userId,
  defaultParticipantInfo,
}: EventCheckoutProps) {
  const router = useRouter();
  const [selectedTickets, setSelectedTickets] = useState<TicketSelectionItem[]>([]);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState<number | null>(1);
  const [participantInfo, setParticipantInfo] = useState({
    name: defaultParticipantInfo?.name || '',
    email: defaultParticipantInfo?.email || '',
    phone: '',
    document: '',
  });

  const { createCheckoutSession, isLoading: isPaymentLoading, error: paymentError } = useCheckout({ eventId, userId });
  const { createInstallmentCheckout, isLoading: isInstallmentLoading, error: installmentError } = useInstallmentCheckout({
    onSuccess: (data) => {
      // Redirecionar para página de pagamento Pix
      router.push(`/my-registrations/${data.registration_id}/pay`);
    },
  });

  const isLoading = isPaymentLoading || isInstallmentLoading;
  const error = paymentError || installmentError;

  const handleTicketSelection = (tickets: TicketSelectionItem[]) => {
    setSelectedTickets(tickets);
    setShowParticipantForm(true);
  };

  // Encontrar ticket selecionado e calcular total
  const selectedTicket = selectedTickets[0]; // Assumindo 1 ticket por vez
  const ticketData = tickets.find(t => t.id === selectedTicket?.ticketId);
  const totalAmount = ticketData?.buyer_price ? ticketData.buyer_price * (selectedTicket?.quantity || 1) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participantInfo.name || !participantInfo.email) {
      return;
    }

    if (!selectedTicket) {
      return;
    }

    try {
      // Se parcelamento > 1, usar API de parcelamento
      if (selectedInstallments && selectedInstallments > 1 && ticketData?.allow_installments) {
        await createInstallmentCheckout(
          selectedTicket,
          selectedInstallments,
          participantInfo
        );
      } else {
        // Pagamento à vista via AbacatePay
        await createCheckoutSession(selectedTickets, participantInfo);
      }
    } catch (err) {
      // Erro já é tratado no hook
      console.error('Erro no checkout:', err);
    }
  };

  const handleBackToTickets = () => {
    setShowParticipantForm(false);
    setSelectedInstallments(1);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{eventTitle}</h1>
        <p className="text-muted-foreground">Selecione seus ingressos</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!showParticipantForm ? (
        <TicketSelection
          eventId={eventId}
          tickets={tickets}
          onCheckout={handleTicketSelection}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Participante</CardTitle>
              <CardDescription>
                Preencha seus dados para finalizar a compra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={participantInfo.name}
                      onChange={(e) =>
                        setParticipantInfo({ ...participantInfo, name: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={participantInfo.email}
                      onChange={(e) =>
                        setParticipantInfo({ ...participantInfo, email: e.target.value })
                      }
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={participantInfo.phone}
                        onChange={(e) =>
                          setParticipantInfo({ ...participantInfo, phone: e.target.value })
                        }
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="document">CPF</Label>
                      <Input
                        id="document"
                        type="text"
                        value={participantInfo.document}
                        onChange={(e) =>
                          setParticipantInfo({ ...participantInfo, document: e.target.value })
                        }
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Opções de Parcelamento dentro do formulário */}
                {ticketData && (
                  <div className="border-t pt-6">
                    <InstallmentOptions
                      totalAmount={totalAmount}
                      maxInstallments={ticketData.max_installments || 4}
                      minAmountForInstallments={ticketData.min_amount_for_installments || 50}
                      allowInstallments={ticketData.allow_installments || false}
                      selectedInstallments={selectedInstallments}
                      onInstallmentChange={setSelectedInstallments}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToTickets}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Processando...' : 'Finalizar Compra'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
