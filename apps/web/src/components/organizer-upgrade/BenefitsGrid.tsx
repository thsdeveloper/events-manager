'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Calendar, CreditCard, LineChart, Users, TicketCheck, Shield, WalletCards } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const benefits = [
	{
		icon: Calendar,
		title: 'Criação guiada',
		description: 'Organize informações, agenda, local, imagens e publicação em um fluxo passo a passo.',
		metric: 'Do rascunho à publicação',
		color: 'from-purple-500 to-indigo-500',
	},
	{
		icon: CreditCard,
		title: 'Checkout integrado',
		description: 'Venda ingressos com os métodos disponibilizados pelo gateway configurado na plataforma.',
		metric: 'PIX e cartão',
		color: 'from-blue-500 to-cyan-500',
	},
	{
		icon: LineChart,
		title: 'Análises operacionais',
		description: 'Acompanhe vendas, check-ins e performance dos eventos.',
		metric: 'Filtros e exportação',
		color: 'from-green-500 to-emerald-500',
	},
	{
		icon: Users,
		title: 'Gestão de participantes',
		description: 'Consulte inscrições, edite dados, faça check-in e reenvie a confirmação individual.',
		metric: 'Operação centralizada',
		color: 'from-orange-500 to-amber-500',
	},
	{
		icon: TicketCheck,
		title: 'Controle de ingressos',
		description: 'Defina preços, períodos de venda, limites por compra e disponibilidade.',
		metric: 'Estoque consistente',
		color: 'from-yellow-500 to-orange-500',
	},
	{
		icon: Shield,
		title: 'Sessões protegidas',
		description: 'Autenticação por cookies HTTP-only e autorização por perfil em todas as operações privadas.',
		metric: 'Acesso por função',
		color: 'from-red-500 to-pink-500',
	},
	{
		icon: WalletCards,
		title: 'Repasses rastreáveis',
		description: 'Cadastre a chave PIX, acompanhe o status e consulte o histórico de repasses.',
		metric: 'Saldo e comprovantes',
		color: 'from-pink-500 to-rose-500',
	},
];

export function BenefitsGrid() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, { once: true, amount: 0.2 });

	return (
		<section ref={containerRef}>
			<motion.div animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-12">
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
					Tudo que você precisa para
					<br />
					<span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
						gerenciar eventos profissionalmente
					</span>
				</h2>
				<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
					Ferramentas poderosas que facilitam cada etapa, da criação ao pós-evento
				</p>
			</motion.div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{benefits.map((benefit, index) => {
					const Icon = benefit.icon;

					return (
						<motion.div
							key={benefit.title}
							initial={{ opacity: 0, y: 30 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{
								duration: 0.5,
								delay: index * 0.1,
							}}
						>
							<Card className="group h-full border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
								<CardContent className="p-6">
									{/* Icon with gradient */}
									<motion.div
										whileHover={{ scale: 1.1, rotate: 5 }}
										transition={{ type: 'spring', stiffness: 400, damping: 10 }}
										className={`size-14 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 shadow-lg`}
									>
										<Icon className="size-7 text-white" />
									</motion.div>

									{/* Title */}
									<h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{benefit.title}</h3>

									{/* Description */}
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{benefit.description}</p>

									{/* Metric Badge */}
									<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
										<span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{benefit.metric}</span>
									</div>

									{/* Hover Effect - More Details */}
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										whileHover={{ opacity: 1, height: 'auto' }}
										className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 overflow-hidden"
									>
										<p className="text-xs text-gray-500 dark:text-gray-400">Saiba mais →</p>
									</motion.div>
								</CardContent>
							</Card>
						</motion.div>
					);
				})}
			</div>
		</section>
	);
}
