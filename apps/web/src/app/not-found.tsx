import Link from 'next/link';
import { ArrowUpRight, Home, Ticket } from 'lucide-react';
import { Container } from '@/components/design-system/atoms/Container';
import { Heading } from '@/components/design-system/atoms/Heading';
import { Button } from '@/components/ui/button';

export default function NotFound() {
	return (
		<Container
			as="main"
			id="main-content"
			tabIndex={-1}
			className="flex min-h-[75svh] items-center py-16 sm:py-24"
			aria-labelledby="not-found-title"
		>
			<div className="mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-16">
				<div aria-hidden="true" className="relative isolate mx-auto w-full max-w-sm px-4 py-8">
					<div className="absolute inset-4 -z-10 rotate-6 rounded-3xl bg-primary/10" />
					<div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-sm">
						<div className="flex items-center justify-between border-b border-dashed border-primary/20 px-6 py-4 text-xs font-medium tracking-widest text-muted-foreground">
							<span>FLOUVI / EXPLORAR</span>
							<Ticket className="size-5 text-primary" />
						</div>
						<div className="flex items-center justify-center gap-1 px-5 py-7 text-[clamp(5rem,14vw,7.5rem)] font-semibold leading-none tracking-tighter text-primary">
							<span>4</span>
							<span className="inline-block h-[.76em] w-[.6em] rounded-full border-[.12em] border-current" />
							<span>4</span>
						</div>
						<div className="border-t border-dashed border-primary/20 px-6 py-4">
							<p className="text-sm font-medium">O próximo encontro está por aí.</p>
							<p className="mt-1 text-xs text-muted-foreground">Vamos encontrar o seu caminho?</p>
						</div>
					</div>
				</div>
				<div className="text-center md:text-left">
					<p className="text-sm font-medium text-link">Erro 404</p>
					<Heading id="not-found-title" level="h1" className="mt-3 text-balance">
						Esta página não existe
					</Heading>
					<p className="mt-4 max-w-md text-pretty leading-7 text-muted-foreground">
						Parece que esse endereço ficou fora da programação. Ele pode ter mudado, mas ainda há muita coisa para
						descobrir.
					</p>
					<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
						<Button asChild>
							<Link href="/eventos">
								Explorar eventos
								<ArrowUpRight className="size-4" aria-hidden="true" />
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link href="/">
								<Home className="size-4" aria-hidden="true" />
								Voltar ao início
							</Link>
						</Button>
					</div>
					<p className="mt-7 text-sm text-muted-foreground">
						Precisa de ajuda?{' '}
						<Link href="/contato" className="font-medium text-link underline-offset-4 hover:underline">
							Fale com a gente
						</Link>
						.
					</p>
				</div>
			</div>
		</Container>
	);
}
