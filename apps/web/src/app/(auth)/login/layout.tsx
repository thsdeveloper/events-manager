import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerAuth } from '@/lib/auth/server-auth';

/** Check the actual session on the server, rather than trusting a cookie's presence. */
export default async function LoginLayout({ children }: { children: ReactNode }) {
	if (await getServerAuth()) redirect('/perfil?section=overview');

	return children;
}
