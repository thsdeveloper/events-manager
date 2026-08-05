import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to manage authentication token
 * Fetches token once and caches it
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasFetched = useRef(false);
  const router = useRouter();

  const handleUnauthorized = () => {
    setToken(null);
    setError('Sessão expirada. Redirecionando para login...');
    setIsRedirecting(true);
    router.push('/login?redirect=/admin/participantes');
  };

  useEffect(() => {
    // Only fetch once
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchToken() {
      try {
        const response = await fetch('/api/auth/token');

        if (response.status === 401) {
          handleUnauthorized();
          
return;
        }

        if (!response.ok) {
          setError('Não autenticado');
          
return;
        }

        const data = await response.json();

        if (data.token) {
          setToken(data.token);
        } else {
          setError('Token não encontrado');
        }
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Erro ao obter autenticação');
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, []);

  return { token, isLoading, error, isRedirecting };
}
