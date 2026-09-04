'use client';

import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const faqs = [
	{
		id: 1,
		category: 'Aprovação',
		question: 'Quanto tempo leva para minha conta ser aprovada?',
		answer:
			'O prazo depende da revisão da plataforma. O status da solicitação fica visível no seu perfil; quando o acesso for ativado, o painel de organizador será liberado.',
	},
	{
		id: 2,
		category: 'Aprovação',
		question: 'Quais documentos preciso fornecer?',
		answer:
			'Informe o nome da organização, um e-mail válido e uma descrição da atividade. Telefone, site e documento podem ser solicitados conforme a operação e a configuração de pagamentos.',
	},
	{
		id: 3,
		category: 'Custos',
		question: 'Como consulto as taxas aplicadas aos ingressos?',
		answer:
			'As taxas são definidas na configuração atual da plataforma e entram no cálculo do preço ao comprador. O resumo do checkout e o painel financeiro mostram os valores aplicados à operação.',
	},
	{
		id: 4,
		category: 'Custos',
		question: 'Posso absorver ou repassar a taxa de serviço?',
		answer:
			'Sim. Cada tipo de ingresso permite escolher se a taxa da plataforma será absorvida pelo organizador ou incorporada ao preço pago pelo comprador.',
	},
	{
		id: 5,
		category: 'Pagamentos',
		question: 'Como e quando recebo meus pagamentos?',
		answer:
			'Depois que sua chave PIX for cadastrada e aprovada, os repasses podem ser processados pela administração da plataforma. Saldo, status e comprovante ficam disponíveis no painel financeiro.',
	},
	{
		id: 6,
		category: 'Pagamentos',
		question: 'Quais meios de pagamento estão disponíveis?',
		answer:
			'O checkout usa os meios liberados pelo gateway configurado na plataforma. Na integração atual, o checkout padrão oferece PIX e cartão; planos parcelados geram cobranças PIX individuais.',
	},
	{
		id: 7,
		category: 'Eventos',
		question: 'Posso criar eventos gratuitos?',
		answer:
			'Sim, quando eventos gratuitos estão habilitados na configuração da plataforma. Ingressos com valor zero são confirmados sem iniciar uma cobrança no gateway.',
	},
	{
		id: 8,
		category: 'Eventos',
		question: 'Como funcionam os limites de ingressos?',
		answer:
			'Cada ingresso tem quantidade total e limites mínimo e máximo por compra. O estoque é reservado de forma atômica durante o checkout para evitar vendas acima da disponibilidade.',
	},
	{
		id: 9,
		category: 'Recursos',
		question: 'Quais recursos estão incluídos?',
		answer:
			'O painel reúne criação e edição de eventos, ingressos, lista de participantes, check-in, reenvio individual de confirmação, análises, exportações e acompanhamento financeiro.',
	},
	{
		id: 10,
		category: 'Recursos',
		question: 'Posso oferecer pagamento parcelado?',
		answer:
			'Sim, em ingressos elegíveis. Você define o número máximo de parcelas e o valor mínimo; o participante acompanha as cobranças PIX e o status do plano na própria conta.',
	},
];

const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

export function FAQAccordion() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, { once: true, amount: 0.2 });
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [openItems, setOpenItems] = useState<number[]>([]);

	const toggleItem = (id: number) => {
		setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
	};

	// Filter FAQs based on search and category
	const filteredFaqs = faqs.filter((faq) => {
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
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Perguntas e respostas</h2>
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
						className="pl-12 h-14 text-base border-2 border-gray-200 dark:border-gray-800 focus:border-purple-500 dark:focus:border-purple-500 rounded-lg"
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
				{categories.map((category) => (
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
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
						<HelpCircle className="size-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
						<p className="text-gray-600 dark:text-gray-400">Nenhuma pergunta encontrada para "{searchTerm}"</p>
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
												<p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
											</CardContent>
										</motion.div>
									)}
								</AnimatePresence>
							</Card>
						</motion.div>
					))
				)}
			</div>
		</section>
	);
}
