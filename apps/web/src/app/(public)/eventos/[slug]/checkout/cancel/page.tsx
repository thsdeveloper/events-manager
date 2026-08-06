import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default async function CheckoutCancelPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ checkout_id?: string }>;
}) {
	const { slug } = await params;
	const { checkout_id: checkoutId } = await searchParams;

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<Card className="max-w-2xl w-full">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 size-16 bg-amber-100 rounded-full flex items-center justify-center">
						<XCircle className="size-10 text-amber-600" />
					</div>
					<CardTitle className="text-2xl">Pagamento não concluído</CardTitle>
					<CardDescription>O provedor não confirmou o pagamento desta tentativa</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="bg-muted rounded-lg p-6 space-y-4">
						<div className="flex items-start gap-3">
							<HelpCircle className="size-5 text-muted-foreground mt-0.5" />
							<div>
								<h3 className="font-medium mb-1">O que aconteceu?</h3>
								<p className="text-sm text-muted-foreground">
									Nenhum ingresso será liberado sem a confirmação assinada do provedor. Caso tenha concluído o pagamento
									em outra aba, consulte “Meus ingressos” antes de tentar novamente.
								</p>
							</div>
						</div>
					</div>

					<div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
						<p className="text-sm text-blue-900 dark:text-blue-100">
							<strong>Dica:</strong> Se você teve algum problema durante o checkout, tente novamente ou entre em contato
							com nosso suporte.
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						{checkoutId ? (
							<Button asChild variant="outline" className="flex-1">
								<Link href={`/eventos/${slug}/checkout/success?checkout_id=${encodeURIComponent(checkoutId)}`}>
									Verificar pagamento
								</Link>
							</Button>
						) : null}
						<Button asChild className="flex-1">
							<Link href={`/eventos/${slug}`}>
								<ArrowLeft className="size-4 mr-2" />
								Voltar ao Evento
							</Link>
						</Button>
						<Button asChild variant="outline" className="flex-1">
							<Link href="/eventos">Explorar Eventos</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
