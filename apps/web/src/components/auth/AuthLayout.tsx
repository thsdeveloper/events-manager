'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarCheck2, ChartNoAxesCombined, Sparkles, TicketCheck } from 'lucide-react';
import { ReactNode } from 'react';
import { useGlobals } from '@/hooks/useGlobals';
import Image from 'next/image';
import { getMediaAssetUrl } from '@/lib/media';

interface AuthLayoutProps {
	children: ReactNode;
	title: string;
	subtitle: string;
	showBackButton?: boolean;
}

export function AuthLayout({ children, title, subtitle, showBackButton = true }: AuthLayoutProps) {
	const globals = useGlobals();
	const logoUrl = globals?.logo ? getMediaAssetUrl(globals.logo) : null;
	const siteName = globals?.title || 'Events Manager';
	const siteTagline =
		globals?.tagline || 'A plataforma completa para gerenciar seus eventos de forma simples e eficiente.';
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<div className="flex min-h-screen">
			<div
				className="relative hidden overflow-hidden lg:flex lg:w-1/2"
				style={{
					background: `linear-gradient(to bottom right, ${accentColor}, ${accentColor}dd, ${accentColor}bb)`,
				}}
			>
				<div
					className="absolute inset-0 opacity-10"
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
						backgroundSize: '32px 32px',
					}}
				/>
				<div className="absolute right-0 top-0 size-96 rounded-full bg-white/10 blur-3xl" />
				<div className="absolute bottom-0 left-0 size-96 rounded-full bg-white/10 blur-3xl" />

				<div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
					<div>
						<Link href="/" className="inline-flex items-center gap-3 text-white hover:text-white/90 transition-colors">
							{logoUrl ? (
								<Image
									src={logoUrl}
									alt={siteName}
									width={180}
									height={60}
									className="h-12 w-auto brightness-0 invert"
								/>
							) : (
								<>
									<div className="flex items-center justify-center size-12 rounded-xl bg-white/20 backdrop-blur-sm">
										<Sparkles className="size-7" />
									</div>
									<span className="text-2xl font-bold">{siteName}</span>
								</>
							)}
						</Link>
					</div>

					<div className="max-w-lg space-y-8">
						<div className="space-y-4">
							<p className="text-4xl font-bold leading-tight">{siteTagline}</p>
							<p className="text-base leading-7 text-white/80">
								{globals?.description || 'Uma operação organizada para quem publica eventos e para quem participa.'}
							</p>
						</div>
						<ul className="space-y-3" aria-label="Recursos da plataforma">
							{[
								{ icon: CalendarCheck2, label: 'Crie e publique eventos em um fluxo guiado' },
								{ icon: TicketCheck, label: 'Gerencie ingressos, participantes e check-in' },
								{ icon: ChartNoAxesCombined, label: 'Acompanhe vendas e operação em painéis claros' },
							].map(({ icon: Icon, label }) => (
								<li
									key={label}
									className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
								>
									<Icon aria-hidden="true" className="size-5 shrink-0" />
									<span className="text-sm font-medium text-white/95">{label}</span>
								</li>
							))}
						</ul>
					</div>

					<p className="text-sm text-white/70">
						Acesse sua conta com uma sessão segura e protegida por cookie HTTP-only.
					</p>
				</div>
			</div>

			<div className="flex flex-1 items-center justify-center bg-background p-6 sm:p-8">
				<div className="w-full max-w-md">
					{showBackButton && (
						<div className="mb-8">
							<Link
								href="/"
								className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors hover:opacity-80"
								style={{ color: globals ? accentColor : undefined }}
							>
								<ArrowLeft className="size-4" />
								<span>Voltar ao site</span>
							</Link>
						</div>
					)}

					<div className="mb-8">
						<h1 className="mb-3 text-4xl font-bold text-foreground">{title}</h1>
						<p className="text-lg text-muted-foreground">{subtitle}</p>
					</div>

					{children}
				</div>
			</div>
		</div>
	);
}
