import type { Metadata } from 'next';

import { requireAuth } from '@/lib/auth/server-auth';
import { ProfilePageClient } from './_components/ProfilePageClient';

export const metadata: Metadata = {
	title: 'Minha conta',
	description: 'Gerencie seus dados pessoais, segurança e preferências.',
};

export default async function ProfilePage() {
	const auth = await requireAuth('/perfil');

	return <ProfilePageClient initialUser={auth.user} />;
}
