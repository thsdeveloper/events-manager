/**
 * @fileoverview Error Boundary para página de exemplos
 *
 * Demonstra como tratar erros não capturados usando toast
 */

'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { presentProblemToast } from '@/lib/toast-problem';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { toast } = useToast();

  useEffect(() => {
    // Mostra toast quando erro não capturado ocorre
    presentProblemToast(toast, error, {
      includeRequestId: true,
    });

    // Log do erro para debugging
    console.error('Error boundary caught:', error);
  }, [error, toast]);

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Algo deu errado!</CardTitle>
          <CardDescription>
            Ocorreu um erro não esperado. Você pode tentar novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-mono text-sm">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <Button onClick={reset}>Tentar Novamente</Button>
        </CardContent>
      </Card>
    </div>
  );
}
