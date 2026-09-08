import type { Metadata } from 'next';
import { ArrowRight, BadgePercent } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { FeeCalculator } from '@/features/fees';

export const metadata: Metadata = {
	title: 'Taxas e calculadora de custos',
	description:
		'Veja exatamente quanto custa vender ingressos na plataforma: taxa de serviço, tarifas por forma de pagamento e quanto sobra para você em cada ingresso.',
};

export default function TaxasPage() {
	return (
		<Container as="section" className="py-10 sm:py-14">
			<header className="max-w-3xl">
				<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
					<BadgePercent className="size-4" aria-hidden="true" />
					Transparência total
				</p>
				<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
					Quanto você paga de taxas
				</h1>
				<p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
					Sem mensalidade, sem fidelidade e sem surpresa no repasse. Informe o valor do ingresso, escolha quem paga a
					taxa de serviço e a forma de pagamento do comprador para ver o valor exato que sobra para você.
				</p>
			</header>

			<div className="mt-8">
				<ReactQueryProvider>
					<FeeCalculator />
				</ReactQueryProvider>
			</div>

			<div className="mt-10 flex flex-col gap-4 rounded-lg bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900">
				<div>
					<p className="font-semibold">Gostou das contas?</p>
					<p className="mt-1 text-sm text-slate-300">Crie sua conta de organizador e publique seu evento hoje.</p>
				</div>
				<Button asChild size="lg">
					<Link href="/perfil/organizador">
						Quero vender ingressos
						<ArrowRight aria-hidden="true" />
					</Link>
				</Button>
			</div>
		</Container>
	);
}
