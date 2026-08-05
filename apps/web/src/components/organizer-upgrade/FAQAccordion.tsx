'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Search, ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const faqs = [
	{
		id: 1,
		category: 'Aprovação',
		question: 'Quanto tempo leva para minha conta ser aprovada?',
		answer: 'O processo de aprovação geralmente leva de 24 a 48 horas úteis. Nossa equipe analisa cuidadosamente cada solicitação para garantir a qualidade da plataforma. Você receberá um email assim que sua conta for aprovada.'
	},
	{
		id: 2,
		category: 'Aprovação',
		question: 'Quais documentos preciso fornecer?',
		answer: 'Você precisará fornecer informações básicas como nome da organização, email, telefone e CPF/CNPJ. Não é necessário enviar documentos escaneados no momento da solicitação. Caso nossa equipe precise de mais informações, entraremos em contato.'
	},
	{
		id: 3,
		category: 'Custos',
		question: 'Existem taxas para criar uma conta de organizador?',
		answer: 'Não! A criação da conta de organizador é 100% gratuita, sem taxas de adesão ou mensalidades. Cobramos apenas uma pequena porcentagem sobre cada ingresso vendido (taxa de serviço + processamento de pagamento).'
	},
	{
		id: 4,
		category: 'Custos',
		question: 'Quanto custa para vender ingressos?',
		answer: 'Nossa taxa de serviço é de 3% a 5% sobre o valor do ingresso, dependendo do volume de vendas. Além disso, há a taxa de processamento de pagamento da AbacatePay (geralmente 3,99% + R$0,50 por transação). Você pode escolher se absorve essa taxa ou repassa ao comprador.'
	},
	{
		id: 5,
		category: 'Pagamentos',
		question: 'Como e quando recebo meus pagamentos?',
		answer: 'Utilizamos o AbacatePay Connect para processar pagamentos. Os repasses são automáticos e ocorrem de 2 a 7 dias úteis após cada venda, diretamente na sua conta bancária. Você pode acompanhar tudo em tempo real no dashboard financeiro.'
	},
	{
		id: 6,
		category: 'Pagamentos',
		question: 'Preciso ter conta no AbacatePay?',
		answer: 'Sim, você precisará conectar ou criar uma conta AbacatePay Connect. O processo é simples e guiado pela plataforma. A AbacatePay é a líder global em processamento de pagamentos online e garante total segurança para você e seus clientes.'
	},
	{
		id: 7,
		category: 'Eventos',
		question: 'Posso criar eventos gratuitos?',
		answer: 'Sim! Você pode criar tanto eventos pagos quanto gratuitos. Para eventos gratuitos, não cobramos taxa de serviço, apenas uma taxa simbólica de processamento caso haja ingressos com valor zero mas com taxa de reserva.'
	},
	{
		id: 8,
		category: 'Eventos',
		question: 'Existe limite de ingressos ou eventos?',
		answer: 'Não há limite! Você pode criar quantos eventos quiser e vender quantos ingressos precisar. Nossa infraestrutura foi projetada para escalar e suportar desde eventos pequenos até grandes festivais com milhares de participantes.'
	},
	{
		id: 9,
		category: 'Recursos',
		question: 'Quais recursos estão incluídos?',
		answer: 'Você terá acesso a: criação ilimitada de eventos, QR codes para check-in, lista de participantes, envio de emails em massa, análises em tempo real, dashboard completo, suporte prioritário, integração com AbacatePay, geração de relatórios e muito mais.'
	},
	{
		id: 10,
		category: 'Recursos',
		question: 'Posso adicionar membros da equipe?',
		answer: 'Sim! Você pode convidar colaboradores para ajudar na gestão dos eventos. É possível definir diferentes níveis de permissão para cada membro da equipe, controlando o que cada um pode visualizar e editar.'
	},
	{
		id: 11,
		category: 'Suporte',
		question: 'Que tipo de suporte vocês oferecem?',
		answer: 'Organizadores aprovados têm acesso a suporte prioritário via chat, email e WhatsApp, com tempo médio de resposta de menos de 2 horas. Também oferecemos central de ajuda completa, tutoriais em vídeo e onboarding personalizado.'
	},
	{
		id: 12,
		category: 'Cancelamento',
		question: 'Posso cancelar minha conta a qualquer momento?',
		answer: 'Sim, você pode cancelar sua conta de organizador a qualquer momento, sem multas ou taxas de cancelamento. Seus dados serão mantidos por 90 dias para permitir reativação, caso mude de ideia.'
	}
];

const categories = Array.from(new Set(faqs.map(faq => faq.category)));

export function FAQAccordion() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, { once: true, amount: 0.2 });
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [openItems, setOpenItems] = useState<number[]>([]);

	const toggleItem = (id: number) => {
		setOpenItems(prev =>
			prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
		);
	};

	// Filter FAQs based on search and category
	const filteredFaqs = faqs.filter(faq => {
		const matchesSearch =
			searchTerm === '' ||
			faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
			faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = selectedCategory === null || faq.category === selectedCategory;

		return matchesSearch && matchesCategory;
	});

	return (
		<section ref={containerRef} className="py-16">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.6 }}
				className="text-center mb-12"
			>
				<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold mb-6">
					<HelpCircle className="size-4" />
					Dúvidas frequentes
				</div>
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
					Perguntas e respostas
				</h2>
				<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
					Tudo que você precisa saber para começar como organizador
				</p>
			</motion.div>

			{/* Search Bar */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ delay: 0.2, duration: 0.6 }}
				className="max-w-2xl mx-auto mb-8"
			>
				<div className="relative">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
					<Input
						type="text"
						placeholder="Buscar por palavra-chave..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-12 h-14 text-base border-2 border-gray-200 dark:border-gray-800 focus:border-purple-500 dark:focus:border-purple-500 rounded-xl"
					/>
				</div>
			</motion.div>

			{/* Category Filters */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ delay: 0.3, duration: 0.6 }}
				className="flex flex-wrap gap-2 justify-center mb-8"
			>
				<Button
					variant={selectedCategory === null ? 'default' : 'outline'}
					size="sm"
					onClick={() => setSelectedCategory(null)}
					className="rounded-full"
				>
					Todas
				</Button>
				{categories.map(category => (
					<Button
						key={category}
						variant={selectedCategory === category ? 'default' : 'outline'}
						size="sm"
						onClick={() => setSelectedCategory(category)}
						className="rounded-full"
					>
						{category}
					</Button>
				))}
			</motion.div>

			{/* FAQ Items */}
			<div className="max-w-3xl mx-auto space-y-4">
				{filteredFaqs.length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="text-center py-12"
					>
						<HelpCircle className="size-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">
							Nenhuma pergunta encontrada para "{searchTerm}"
						</p>
					</motion.div>
				) : (
					filteredFaqs.map((faq, index) => (
						<motion.div
							key={faq.id}
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
						>
							<Card className="border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300">
								<button
									onClick={() => toggleItem(faq.id)}
									className="w-full text-left p-6 flex items-start justify-between gap-4 group"
									aria-expanded={openItems.includes(faq.id)}
								>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
												{faq.category}
											</span>
										</div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
											{faq.question}
										</h3>
									</div>
									<motion.div
										animate={{ rotate: openItems.includes(faq.id) ? 180 : 0 }}
										transition={{ duration: 0.3 }}
										className="flex-shrink-0"
									>
										<ChevronDown className="size-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
									</motion.div>
								</button>

								<AnimatePresence>
									{openItems.includes(faq.id) && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.3 }}
											className="overflow-hidden"
										>
											<CardContent className="px-6 pb-6 pt-0">
												<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
													{faq.answer}
												</p>
											</CardContent>
										</motion.div>
									)}
								</AnimatePresence>
							</Card>
						</motion.div>
					))
				)}
			</div>

			{/* Contact Support */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ delay: 0.8, duration: 0.6 }}
				className="mt-12 max-w-2xl mx-auto"
			>
				<Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
					<CardContent className="p-8 text-center">
						<MessageCircle className="size-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
						<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
							Ainda tem dúvidas?
						</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-6">
							Nossa equipe está pronta para ajudar você a começar
						</p>
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<Button asChild className="gap-2">
								<Link href="/suporte">
									<MessageCircle className="size-4" />
									Falar com suporte
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/docs">
									Ver documentação
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</section>
	);
}
