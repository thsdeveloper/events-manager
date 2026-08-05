'use client';

import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Shield, Sparkles, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HeroSectionProps {
	onGetStarted: () => void;
	onLearnMore: () => void;
}

export function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.6 }}
			className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 md:p-12 text-white"
		>
			{/* Background Pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute inset-0" style={{
					backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
					backgroundSize: '32px 32px'
				}} />
			</div>

			{/* Floating Elements */}
			<motion.div
				animate={{
					y: [0, -10, 0],
					rotate: [0, 5, 0]
				}}
				transition={{
					duration: 4,
					repeat: Infinity,
					ease: "easeInOut"
				}}
				className="absolute top-8 right-8 size-20 rounded-2xl bg-white/10 backdrop-blur-sm"
			/>
			<motion.div
				animate={{
					y: [0, 10, 0],
					rotate: [0, -5, 0]
				}}
				transition={{
					duration: 5,
					repeat: Infinity,
					ease: "easeInOut",
					delay: 1
				}}
				className="absolute bottom-12 left-12 size-16 rounded-full bg-white/10 backdrop-blur-sm"
			/>

			<div className="relative z-10 max-w-3xl">
				{/* Badge */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2 }}
					className="flex flex-wrap gap-3 mb-6"
				>
					<Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 hover:from-green-500 hover:to-emerald-600 shadow-lg">
						<TrendingDown className="size-3 mr-1" />
						Menor taxa do mercado: 5,99%
					</Badge>
					<Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
						<Shield className="size-3 mr-1" />
						Plataforma verificada e segura
					</Badge>
				</motion.div>

				{/* Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
				>
					Transforme suas ideias em{' '}
					<span className="relative inline-block">
						<span className="relative z-10">eventos inesquecíveis</span>
						<motion.span
							initial={{ width: 0 }}
							animate={{ width: '100%' }}
							transition={{ delay: 0.8, duration: 0.6 }}
							className="absolute bottom-2 left-0 h-3 bg-yellow-400/30 -z-0"
						/>
					</span>
				</motion.h1>

				{/* Subheadline */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed"
				>
					Publique eventos, venda ingressos e gerencie tudo em um só lugar com a{' '}
					<strong className="text-green-300">menor taxa do Brasil: apenas 5,99%</strong>.
					Junte-se a <strong className="text-white">+500 organizadores</strong> que já economizam com o EventsFlow.
				</motion.p>

				{/* Features Quick List */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8"
				>
					{[
						'Apenas 5,99% por transação',
						'Aprovação em até 48h',
						'Pagamentos automáticos',
						'Suporte dedicado 24/7'
					].map((feature, index) => (
						<motion.div
							key={feature}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.6 + index * 0.1 }}
							className="flex items-center gap-2 text-white/90"
						>
							<CheckCircle2 className="size-5 text-green-300 flex-shrink-0" />
							<span className="text-sm md:text-base font-medium">{feature}</span>
						</motion.div>
					))}
				</motion.div>

				{/* CTAs */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.7 }}
					className="flex flex-col sm:flex-row gap-4"
				>
					<Button
						size="lg"
						onClick={onGetStarted}
						className="bg-white text-purple-600 hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 group"
					>
						<Sparkles className="size-5 mr-2 group-hover:rotate-12 transition-transform" />
						Solicitar acesso agora
					</Button>
					<Button
						size="lg"
						variant="outline"
						onClick={onLearnMore}
						className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
					>
						<Building2 className="size-5 mr-2" />
						Ver como funciona
					</Button>
				</motion.div>

				{/* Trust Signal */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.9 }}
					className="mt-6 text-sm text-white/70"
				>
					✓ Sem cartão de crédito • ✓ Configuração em 5 minutos • ✓ Cancele quando quiser
				</motion.p>
			</div>

			{/* Decorative Icon */}
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ delay: 0.5, duration: 0.8 }}
				className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2"
			>
				<div className="relative">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
						className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl"
					/>
					<Building2 className="relative size-32 text-white/20" />
				</div>
			</motion.div>
		</motion.div>
	);
}
