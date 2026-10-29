import type { ReactNode } from 'react';
import { CheckoutHeader } from '@/components/layout/CheckoutHeader';
import Container from '@/components/ui/container';
import { fetchSiteData } from '@/lib/content/fetchers';

interface CheckoutLayoutProps {
	children: ReactNode;
	params: Promise<{ slug: string }>;
}

/**
 * O checkout tem a própria casca: cabeçalho enxuto, sem o menu do site, e um
 * rodapé de uma linha. A pessoa entra para comprar e nada aqui a convida a
 * sair antes de terminar.
 */
export default async function CheckoutLayout({ children, params }: CheckoutLayoutProps) {
	const [{ slug }, { globals }] = await Promise.all([params, fetchSiteData()]);
	const title = globals?.title || 'Events Manager';

	return (
		<>
			<CheckoutHeader backHref={`/eventos/${slug}`} globals={globals} />
			<main className="flex-grow" id="main-content" tabIndex={-1}>
				{children}
			</main>
			<footer className="border-t">
				<Container as="div" className="py-5 text-xs text-muted-foreground">
					{`© ${new Date().getFullYear()} ${title}. Pagamento processado em ambiente seguro.`}
				</Container>
			</footer>
		</>
	);
}
