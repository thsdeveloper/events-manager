import type { Metadata } from 'next';

import { requireAuth } from '@/lib/auth/server-auth';
import { TicketsPageClient } from './TicketsPageClient';

export const metadata: Metadata = {
	title: 'Meus ingressos',
	description: 'Consulte e gerencie seus ingressos de eventos.',
};

export default async function MyTicketsPage() {
	await requireAuth('/meus-ingressos');

	return <TicketsPageClient />;
}
