'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, CreditCard, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface Installment {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
}

interface Registration {
  id: string;
  ticket_code: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  total_installments: number;
  installment_plan_status: string;
  blocked_reason: string | null;
  date_created: string;
  event_id: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    location_name: string;
    featured_image: string | null;
  };
  ticket_type_id: {
    id: string;
    title: string;
    price: number;
  };
  installments: Installment[];
  installment_stats: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  next_installment: Installment | null;
}

interface ApiResponse {
  success: boolean;
  data: Registration[];
  total: number;
  error?: string;
  detail?: string;
}

export default function PendingPaymentsList() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/my-registrations/pending-payments');
      const data: ApiResponse = await response.json();

      if (!response.ok) {
		throw new Error(data.detail || data.error || 'Erro ao carregar pagamentos');
      }

      setRegistrations(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pagamentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Nenhum pagamento pendente</h3>
          <p className="text-muted-foreground mb-6">
            Você não possui parcelas pendentes no momento.
          </p>
          <Link href="/my-registrations">
            <Button variant="outline">Ver Minhas Inscrições</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Inscrições</CardDescription>
            <CardTitle className="text-3xl">{registrations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parcelas Vencidas</CardDescription>
            <CardTitle className="text-3xl text-destructive">
              {registrations.reduce((sum, r) => sum + r.installment_stats.overdue, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parcelas Pendentes</CardDescription>
            <CardTitle className="text-3xl text-warning">
              {registrations.reduce((sum, r) => sum + r.installment_stats.pending, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Registrations List */}
      {registrations.map((registration) => {
        const isOverdue = registration.status === 'payment_overdue';
        const nextInstallment = registration.next_installment;

        return (
          <Card key={registration.id} className={isOverdue ? 'border-destructive' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{registration.event_id.title}</CardTitle>
                  <CardDescription>
                    {registration.ticket_type_id.title} • {registration.total_installments}x de R${' '}
                    {(registration.total_amount / registration.total_installments).toFixed(2)}
                  </CardDescription>
                </div>
                <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                  {isOverdue ? 'Vencida' : 'Pendente'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warning for overdue */}
              {isOverdue && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    Você possui parcelas vencidas. Regularize os pagamentos para liberar acesso ao evento.
                  </AlertDescription>
                </Alert>
              )}

              {/* Installment Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso de Pagamento</span>
                  <span className="font-medium">
                    {registration.installment_stats.paid}/{registration.installment_stats.total} pagas
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (registration.installment_stats.paid / registration.installment_stats.total) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Next Installment Info */}
              {nextInstallment && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="size-4" />
                    Próxima Parcela ({nextInstallment.installment_number}/{nextInstallment.total_installments})
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold">R$ {nextInstallment.amount.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        Vencimento:{' '}
                        {format(new Date(nextInstallment.due_date), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                    </div>
                    <Link href={`/my-registrations/${registration.id}/pay`}>
                      <Button variant={isOverdue ? 'destructive' : 'default'}>
                        {isOverdue ? 'Pagar Agora' : 'Ver Detalhes'}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* All Installments */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <Info className="size-4" />
                  Ver todas as {registration.installments.length} parcelas
                </summary>
                <div className="mt-4 space-y-2">
                  {registration.installments.map((installment) => (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            installment.status === 'paid'
                              ? 'default'
                              : installment.status === 'overdue'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {installment.status === 'paid'
                            ? 'Paga'
                            : installment.status === 'overdue'
                              ? 'Vencida'
                              : 'Pendente'}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            Parcela {installment.installment_number}/{installment.total_installments}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Venc:{' '}
                            {format(new Date(installment.due_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">R$ {installment.amount.toFixed(2)}</div>
                        {installment.paid_at && (
                          <div className="text-xs text-muted-foreground">
                            Pago em {format(new Date(installment.paid_at), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
