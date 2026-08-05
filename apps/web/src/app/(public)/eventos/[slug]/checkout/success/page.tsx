import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail, Download } from 'lucide-react';
import Link from 'next/link';

async function getCheckoutSession(sessionId: string) {
  // A confirmação definitiva é realizada pelo webhook assinado do provedor.
  // e buscar os dados da inscrição pela API
  return {
    sessionId,
    // Aqui virão os dados reais do Supabase por meio da API
  };
}

interface SuccessContentProps {
  searchParams: Promise<{ session_id?: string }>;
}

async function SuccessContent({ searchParams }: SuccessContentProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect('/eventos');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 size-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Sua compra foi processada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="size-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Verifique seu e-mail</h3>
                <p className="text-sm text-muted-foreground">
                  Enviamos a confirmação e os ingressos para o e-mail cadastrado.
                  Não se esqueça de verificar sua caixa de spam.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="size-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Baixe seus ingressos</h3>
                <p className="text-sm text-muted-foreground">
                  Você pode visualizar e baixar seus ingressos a qualquer momento
                  na sua área de "Meus Ingressos".
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              ID da Transação: <code className="text-xs bg-muted px-2 py-1 rounded">{sessionId}</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/meus-ingressos">Ver Meus Ingressos</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/eventos">Explorar Mais Eventos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
