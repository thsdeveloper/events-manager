import type { CheckoutStatus } from '@events-manager/contracts';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Tickets, XCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
		description: 'O provedor ainda está processando o pagamento. Esta página pode ser atualizada com segurança.',
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

	return (
		<div className="flex min-h-[70vh] items-center justify-center p-6">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${content.iconClass}`}>
						<StatusIcon className="size-9" aria-hidden="true" />
					</div>
					<CardTitle className="text-2xl">{content.title}</CardTitle>
					<CardDescription>{content.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3 rounded-lg bg-muted p-5">
						{checkout.registrations.map((registration) => (
							<div
								key={registration.id}
								className="flex items-start justify-between gap-4 rounded-md bg-background p-4"
							>
								<div>
									<p className="font-medium">{registration.event.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">
										Status: {registration.paymentStatus ?? registration.status}
									</p>
								</div>
								{registration.ticketCode ? (
									<code className="rounded bg-muted px-2 py-1 text-xs">{registration.ticketCode}</code>
								) : null}
							</div>
						))}
					</div>

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
		</div>
	);
}
