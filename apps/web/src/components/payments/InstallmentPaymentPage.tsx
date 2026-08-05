'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Copy, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';

interface InstallmentPaymentPageProps {
  registrationId: string;
}

interface PaymentData {
  installment: {
    id: string;
    installment_number: number;
    total_installments: number;
    amount: number;
    due_date: string;
    status: string;
  };
  payment: {
    provider_transaction_id: string;
    pix_qr_code: string | null;
    pix_copy_paste: string | null;
    expires_at: string;
    amount: number;
  };
  event: {
    id: string;
    name: string;
  };
}

export default function InstallmentPaymentPage({ registrationId }: InstallmentPaymentPageProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePixCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Primeiro, buscar a próxima parcela pendente da inscrição
      const response = await fetch(`/api/my-registrations/pending-payments`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Erro ao carregar dados de pagamento');
      }

      // Encontrar esta inscrição
      const registration = data.data.find((r: any) => r.id === registrationId);

      if (!registration || !registration.next_installment) {
        throw new Error('Nenhuma parcela pendente encontrada');
      }

      const nextInstallment = registration.next_installment;

      // Gerar Pix para a próxima parcela
      const pixResponse = await fetch(`/api/installments/${nextInstallment.id}/generate-pix`, {
        method: 'POST',
      });

      const pixData = await pixResponse.json();

      if (!pixResponse.ok) {
        throw new Error(pixData.error || 'Erro ao gerar Pix');
      }

      setPaymentData(pixData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generatePixCode();
  }, [registrationId]);

  const handleCopyPixCode = async () => {
    if (!paymentData?.payment.pix_copy_paste) return;

    try {
      await navigator.clipboard.writeText(paymentData.payment.pix_copy_paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading && !paymentData) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Gerando código Pix...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link href="/my-registrations/pending-payments">
            <Button variant="outline">Voltar para Pagamentos Pendentes</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return null;
  }

  const { installment, payment, event } = paymentData;
  const expiresAt = new Date(payment.expires_at);
  const isExpired = expiresAt < new Date();

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pagamento via Pix</h1>
        <p className="text-muted-foreground">{event.name}</p>
      </div>

      {/* Payment Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detalhes da Parcela</CardTitle>
          <CardDescription>
            Parcela {installment.installment_number} de {installment.total_installments}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Valor</div>
              <div className="text-3xl font-bold">R$ {installment.amount.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Vencimento</div>
              <div className="font-semibold">
                {format(new Date(installment.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>

          {isExpired && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>
                Código Pix expirado. Clique no botão abaixo para gerar um novo código.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* QR Code */}
      {payment.pix_qr_code && !isExpired && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="size-5" />
              Pagar com QR Code
            </CardTitle>
            <CardDescription>
              Escaneie o QR Code com o app do seu banco
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg mb-4">
              <Image
                src={`data:image/png;base64,${payment.pix_qr_code}`}
                alt="QR Code Pix"
                width={256}
                height={256}
                className="size-64"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Código expira em {format(expiresAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pix Copy/Paste */}
      {payment.pix_copy_paste && !isExpired && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pix Copia e Cola</CardTitle>
            <CardDescription>
              Copie o código e cole no seu app de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
              {payment.pix_copy_paste}
            </div>
            <Button
              onClick={handleCopyPixCode}
              variant="outline"
              className="w-full"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="size-4 mr-2" />
                  Copiar Código Pix
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/my-registrations/pending-payments" className="flex-1">
          <Button variant="outline" className="w-full">
            Voltar
          </Button>
        </Link>
        {isExpired && (
          <Button onClick={generatePixCode} disabled={isLoading} className="flex-1">
            {isLoading ? 'Gerando...' : 'Gerar Novo Código'}
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <Alert className="mt-6">
        <AlertCircle className="size-4" />
        <AlertDescription>
          <strong>Importante:</strong> Após o pagamento, pode levar alguns minutos para confirmar.
          Você receberá um e-mail assim que o pagamento for confirmado.
        </AlertDescription>
      </Alert>
    </div>
  );
}
