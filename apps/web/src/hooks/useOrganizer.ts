'use client';

import type { Organizer } from '@events-manager/contracts';
import { useCallback, useEffect, useState } from 'react';
import { useServerAuth } from './useServerAuth';

export function useOrganizer() {
  const { user } = useServerAuth();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizer = useCallback(async () => {
    if (!user) {
      setLoading(false);
      
return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/organizer/profile');
      if (!response.ok) throw new Error('Não foi possível carregar o perfil de organizador.');
      setOrganizer((await response.json()).organizer ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchOrganizer();
  }, [fetchOrganizer]);

  return { organizer, loading, error, refetch: fetchOrganizer };
}
