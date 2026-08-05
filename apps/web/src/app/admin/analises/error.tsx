'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Analytics Error:', error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto mt-20">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <div>
              <CardTitle>Erro ao Carregar Análises</CardTitle>
              <CardDescription>
                Ocorreu um problema ao buscar os dados analíticos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Detalhes do Erro</AlertTitle>
            <AlertDescription className="mt-2">
              {error.message || 'Erro desconhecido ao carregar dados'}
            </AlertDescription>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                ID do erro: {error.digest}
              </p>
            )}
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Possíveis causas:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Problema de conexão com a API local ou o Supabase</li>
              <li>Dados corrompidos ou schema incompatível</li>
              <li>Permissões insuficientes para acessar os dados</li>
              <li>Timeout na requisição dos dados</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={reset} variant="default" className="flex-1">
              <RefreshCcw className="mr-2 size-4" />
              Tentar Novamente
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/admin">
                <Home className="mr-2 size-4" />
                Voltar ao Início
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 text-sm">
            <p className="font-medium mb-2">💡 Dicas de solução:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>1. Verifique se o Supabase local e a API Fastify estão rodando</li>
              <li>2. Confirme suas permissões de acesso aos dados</li>
              <li>3. Tente atualizar a página (F5)</li>
              <li>4. Se o problema persistir, entre em contato com o suporte</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
