import Container from '@/components/ui/container';
import type { CheckoutStatus } from '@events-manager/contracts';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Tickets, XCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckoutRegistrationList } from '@/features/checkout/components/CheckoutRegistrationList';
import { PurchaseSuccess } from '@/features/checkout/components/PurchaseSuccess';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth/server-auth';

interface CheckoutSuccessPageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{
		checkout_id?: string;
		mock?: string;
		registration_id?: string;
	}>;
}

const STATUS_CONTENT = {
	attention: {
		description: 'Alguns ingressos desta compra exigem revisão. Consulte sua área de ingressos.',
		icon: AlertTriangle,
		iconClass: 'bg-rose-100 text-rose-700',
		title: 'Compra com pendência',
	},
	cancelled: {
		description: 'A compra foi cancelada ou reembolsada e não gerou ingressos ativos.',
		icon: XCircle,
		iconClass: 'bg-slate-100 text-slate-700',
		title: 'Compra cancelada',
	},
	confirmed: {
		description: 'O pagamento foi confirmado e seus ingressos já estão disponíveis.',
		icon: CheckCircle2,
		iconClass: 'bg-emerald-100 text-emerald-700',
		title: 'Compra confirmada',
	},
	pending: {
		description:
			'Ainda não recebemos a confirmação do provedor. Se você já pagou, clique em "Atualizar status": a confirmação é conferida na hora.',
		icon: Clock3,
		iconClass: 'bg-amber-100 text-amber-700',
		title: 'Pagamento em processamento',
	},
} satisfies Record<
	CheckoutStatus['status'],
	{ description: string; icon: typeof Clock3; iconClass: string; title: string }
>;

export default async function CheckoutSuccessPage({ params, searchParams }: CheckoutSuccessPageProps) {
	const [{ slug }, query] = await Promise.all([params, searchParams]);
	await requireAuth(`/eventos/${slug}/checkout/success`);

	const locator = query.registration_id
		? `registration_id=${encodeURIComponent(query.registration_id)}`
		: query.checkout_id
			? `checkout_id=${encodeURIComponent(query.checkout_id)}`
			: null;
	if (!locator) redirect(`/eventos/${slug}`);

	let checkout: CheckoutStatus;
	try {
		checkout = await authenticatedBackendFetch<CheckoutStatus>(`/api/payments/checkout/status?${locator}`);
	} catch {
		redirect(`/eventos/${slug}?checkout_status=unavailable`);
	}

	const content = STATUS_CONTENT[checkout.status];
	const StatusIcon = content.icon;
	const currentUrl = `/eventos/${slug}/checkout/success?${locator}`;
	if (checkout.status === 'confirmed') {
		return (
			<Container className="py-8 sm:py-12">
				<PurchaseSuccess
					purchaseId={query.checkout_id ?? query.registration_id!}
					detailsId={checkout.registrations[0]?.id}
				>
					{checkout.registrations.length ? <CheckoutRegistrationList registrations={checkout.registrations} /> : null}
				</PurchaseSuccess>
			</Container>
		);
	}

	return (
		<Container className="flex min-h-[70vh] items-center py-8">
			<Card className="w-full">
				<CardHeader className="text-center">
					<div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${content.iconClass}`}>
						<StatusIcon className="size-9" aria-hidden="true" />
					</div>
					<CardTitle className="text-2xl">{content.title}</CardTitle>
					<CardDescription>{content.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<CheckoutRegistrationList registrations={checkout.registrations} />

					{checkout.status === 'pending' ? (
						<Button asChild variant="outline" className="w-full">
							<a href={currentUrl}>
								<RefreshCw className="mr-2 size-4" />
								Atualizar status
							</a>
						</Button>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row">
						<Button asChild className="flex-1">
							<Link href="/perfil?section=ingressos">
								<Tickets className="mr-2 size-4" />
								Meus ingressos
							</Link>
						</Button>
						<Button asChild variant="outline" className="flex-1">
							<Link href="/eventos">Explorar eventos</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}
