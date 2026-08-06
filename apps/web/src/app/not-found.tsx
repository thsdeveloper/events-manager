import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Heading } from '@/components/design-system/atoms/Heading';
import { Button } from '@/components/ui/button';

export default function NotFound() {
	return (
		<section className="flex min-h-[70vh] items-center justify-center px-6 text-center">
			<div className="max-w-xl">
				<p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Erro 404</p>
				<Heading className="mt-3" level="h1">
					Esta página não existe
				</Heading>
				<p className="mt-4 text-pretty leading-7 text-muted-foreground">
					O endereço pode ter mudado ou estar incorreto. Volte ao início para continuar navegando.
				</p>
				<Button asChild className="mt-7">
					<Link href="/">
						<ArrowLeft aria-hidden="true" className="size-4" />
						Voltar ao início
					</Link>
				</Button>
			</div>
		</section>
	);
}
