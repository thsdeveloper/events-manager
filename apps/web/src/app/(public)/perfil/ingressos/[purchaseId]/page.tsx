import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/server-auth';
import { PurchaseDetails } from '@/features/tickets/components/PurchaseDetails';
export const metadata: Metadata = { title: 'Minha compra e ingressos', robots: { index: false, follow: false } };
export default async function PurchasePage({ params }: { params: Promise<{ purchaseId: string }> }) {
	const { purchaseId } = await params;
	await requireAuth(`/perfil/ingressos/${purchaseId}`);

	return <PurchaseDetails purchaseId={purchaseId} />;
}
