import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/server-auth';

export const metadata = {
	title: 'Meus Ingressos | Plataforma de Eventos',
	description: 'Gerencie seus ingressos de eventos',
};

export default async function MeusIngressosPage() {
	// ⭐ SSR Authentication - validates user authentication
	await requireAuth();

	// Redirect to profile page with tickets tab active
	redirect('/perfil?tab=ingressos');
}
