import { notFound } from 'next/navigation';
import { z } from 'zod';
import type { ReceivingAccountOverview } from '@events-manager/contracts';
import { ReceivingAccountPage } from '@/features/receiving-accounts';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { authenticatedBackendFetch, BackendRequestError } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth/server-auth';
export default async function PendingReceivingPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	await requireAuth(`/perfil/organizador/${id}/recebimento`);
	if (!z.string().uuid().safeParse(id).success) notFound();
	try {
		const data = await authenticatedBackendFetch<ReceivingAccountOverview>(`/api/organizer/receiving-accounts/${id}`);

		return (
			<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
				<ReactQueryProvider>
					<ReceivingAccountPage key={id} initialData={data} />
				</ReactQueryProvider>
			</div>
		);
	} catch (error) {
		if (error instanceof BackendRequestError && [403, 404].includes(error.status)) notFound();
		throw error;
	}
}
