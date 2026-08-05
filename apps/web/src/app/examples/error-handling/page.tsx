/**
 * @fileoverview Exemplo de componente client com tratamento de erros via toast
 *
 * Demonstra:
 * - Uso do httpClient com toast automático
 * - Tratamento de diferentes tipos de erro
 * - Customização de toast por requisição
 * - Uso do useToast do shadcn/ui
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { httpClient } from '@/lib/http-client';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export default function ErrorHandlingExample() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  /**
   * Exemplo 1: Toast automático em erro
   */
  async function handleFetchUser() {
    setLoading(true);
    try {
      // Toast será mostrado automaticamente em caso de erro
      const data = await httpClient.get<User>(`/api/examples/users/${userId}`);
      setUser(data);
    } catch (error) {
      // Erro já foi mostrado via toast
      // Opcional: adicionar lógica adicional aqui
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exemplo 2: Desabilitar toast para erro específico
   */
  async function handleFetchUserSilent() {
    setLoading(true);
    try {
      const data = await httpClient.get<User>(`/api/examples/users/${userId}`, {
        toastOnError: false, // Desabilita toast
      });
      setUser(data);
    } catch (error) {
      // Trata erro manualmente
      console.error('Erro ao buscar usuário:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exemplo 3: Customizar toast
   */
  async function handleFetchUserCustom() {
    setLoading(true);
    try {
      const data = await httpClient.get<User>(`/api/examples/users/${userId}`, {
        toastOptions: {
          suppressCodes: ['NOT_FOUND'], // Não mostra toast para 404
          duration: 3000,
        },
      });
      setUser(data);
    } catch (error) {
      // 404 não mostrou toast, outros erros sim
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exemplo 4: Criar usuário com validação
   */
  async function handleCreateUser() {
    setLoading(true);
    try {
      const newUser = await httpClient.post<User>('/api/examples/users', {
        email: 'novo@example.com',
        first_name: 'Novo',
        last_name: 'Usuário',
        password: 'senha123',
        role: 'abc-def-ghi', // UUID fake - vai dar erro de validação
      });
      setUser(newUser);
    } catch (error) {
      // Toast já mostrou erros de validação formatados
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exemplo 5: Deletar usuário
   */
  async function handleDeleteUser() {
    if (!userId) return;

    setLoading(true);
    try {
      await httpClient.delete(`/api/examples/users/${userId}`);
      setUser(null);
      setUserId('');
    } catch (error) {
      // Toast automático em erro
    } finally {
      setLoading(false);
    }
  }

  /**
   * Exemplo 6: Atualizar usuário
   */
  async function handleUpdateUser() {
    if (!userId) return;

    setLoading(true);
    try {
      const updated = await httpClient.put<User>(`/api/examples/users/${userId}`, {
        first_name: 'Nome Atualizado',
      });
      setUser(updated);
    } catch (error) {
      // Toast automático em erro
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Exemplos de Tratamento de Erros</h1>

      <div className="grid gap-6">
        {/* Card de busca */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Usuário</CardTitle>
            <CardDescription>
              Demonstra diferentes formas de tratar erros HTTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input
                id="userId"
                placeholder="Digite o ID do usuário"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleFetchUser} disabled={loading || !userId}>
                Buscar (com toast)
              </Button>

              <Button
                onClick={handleFetchUserSilent}
                disabled={loading || !userId}
                variant="outline"
              >
                Buscar (sem toast)
              </Button>

              <Button
                onClick={handleFetchUserCustom}
                disabled={loading || !userId}
                variant="outline"
              >
                Buscar (toast customizado)
              </Button>
            </div>

            {user && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações com Validação</CardTitle>
            <CardDescription>
              Teste criação, atualização e exclusão com erros de validação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleCreateUser} disabled={loading} variant="default">
                Criar Usuário (vai dar erro de validação)
              </Button>

              <Button
                onClick={handleUpdateUser}
                disabled={loading || !userId}
                variant="secondary"
              >
                Atualizar Usuário
              </Button>

              <Button
                onClick={handleDeleteUser}
                disabled={loading || !userId}
                variant="destructive"
              >
                Deletar Usuário
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card de documentação */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. Toast Automático (padrão)</h3>
              <code className="block bg-muted p-2 rounded">
                {`await httpClient.get('/api/users/123')`}
              </code>
              <p className="text-muted-foreground mt-1">
                Erros mostram toast automaticamente
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Sem Toast</h3>
              <code className="block bg-muted p-2 rounded">
                {`await httpClient.get('/api/users/123', { toastOnError: false })`}
              </code>
              <p className="text-muted-foreground mt-1">
                Você trata o erro manualmente
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Toast Customizado</h3>
              <code className="block bg-muted p-2 rounded">
                {`await httpClient.get('/api/users/123', {
  toastOptions: {
    suppressCodes: ['NOT_FOUND'],
    duration: 3000
  }
})`}
              </code>
              <p className="text-muted-foreground mt-1">
                Customiza comportamento do toast
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
