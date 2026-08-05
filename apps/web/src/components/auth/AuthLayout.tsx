'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
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
	const siteName = globals?.title || 'MADEB';
	const siteTagline = globals?.tagline || 'A plataforma completa para gerenciar seus eventos de forma simples e eficiente.';
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<div className="min-h-screen flex">
			{/* Left Side - Visual/Branding */}
			<div
				className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
				style={{
					background: `linear-gradient(to bottom right, ${accentColor}, ${accentColor}dd, ${accentColor}bb)`
				}}
			>
				{/* Decorative Elements */}
				<div
					className="absolute inset-0 opacity-10"
					style={{
						backgroundImage:
							'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
						backgroundSize: '32px 32px',
					}}
				/>
				<div className="absolute top-0 right-0 size-96 bg-white/10 rounded-full blur-3xl" />
				<div className="absolute bottom-0 left-0 size-96 bg-purple-300/20 rounded-full blur-3xl" />

				{/* Content */}
				<div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
					{/* Logo/Brand */}
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

					{/* Center Quote */}
					<div className="max-w-lg space-y-8">
						<blockquote className="space-y-4">
							<p className="text-3xl font-bold leading-relaxed">
								"{siteTagline}"
							</p>
							<footer className="text-white/90">
								<cite className="not-italic font-semibold text-lg">{siteName}</cite>
								<p className="text-sm mt-1 text-white/80">{globals?.description || 'Gestão de Eventos Profissional'}</p>
							</footer>
						</blockquote>

						{/* Competitive Advantage Highlight */}
						<div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
							<div className="flex items-start gap-4">
								<div className="flex-shrink-0 size-12 bg-white/20 rounded-xl flex items-center justify-center">
									<svg className="size-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div className="flex-1">
									<h3 className="text-lg font-bold text-white mb-2">
										🏆 As Menores Taxas do Mercado
									</h3>
									<p className="text-sm text-white/90 leading-relaxed">
										Maximize seus lucros! Somos a plataforma de eventos com as <strong>taxas mais competitivas</strong> do Brasil. Mais dinheiro no seu bolso, eventos de sucesso garantido.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Footer Features */}
					<div className="grid grid-cols-3 gap-6 max-w-xl">
						<div className="text-center">
							<div className="text-2xl font-bold text-white mb-1">Menor Taxa</div>
							<div className="text-xs text-white/70 uppercase tracking-wider">Do Mercado</div>
						</div>
						<div className="text-center border-x border-white/20">
							<div className="text-2xl font-bold text-white mb-1">1000+</div>
							<div className="text-xs text-white/70 uppercase tracking-wider">Eventos</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-white mb-1">4.9★</div>
							<div className="text-xs text-white/70 uppercase tracking-wider">Avaliação</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right Side - Form */}
			<div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#0e1a2b]">
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
						<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
							{title}
						</h1>
						<p className="text-gray-600 dark:text-gray-400 text-lg">
							{subtitle}
						</p>
					</div>

					{children}
				</div>
			</div>
		</div>
	);
}
