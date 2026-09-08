'use client';

import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const faqs = [
	{
		id: 1,
		category: 'Conta',
		question: 'Quando minha conta de organizador é liberada?',
		answer:
			'Ao criar a conta ela entra em análise rápida da plataforma. O status fica visível no seu perfil e, assim que for ativada, o painel de organizador é liberado.',
	},
	{
		id: 2,
		category: 'Conta',
		question: 'Posso vender como pessoa física ou preciso de CNPJ?',
		answer:
			'Os dois funcionam. Pessoa física vende com o CPF já validado no perfil; empresa, produtora ou coletivo informa o CNPJ. Taxas, checkout e repasses são iguais.',
	},
	{
		id: 3,
		category: 'Conta',
		question: 'Preciso configurar um gateway de pagamento?',
		answer:
			'Não. A plataforma administra o processamento com o gateway integrado. Você só cadastra uma chave PIX para receber os repasses.',
	},
	{
		id: 4,
		category: 'Pagamentos',
		question: 'Quais formas de pagamento os participantes podem usar?',
		answer:
			'PIX e cartão de crédito no checkout hospedado, com parcelamento em ingressos elegíveis. O estoque é reservado no ato da compra.',
	},
	{
		id: 5,
		category: 'Pagamentos',
		question: 'Como e quando recebo o valor das vendas?',
		answer:
			'O saldo líquido de cada evento fica disponível no painel financeiro. Os repasses são feitos para a chave PIX cadastrada e cada um tem status e histórico.',
	},
	{
		id: 6,
		category: 'Pagamentos',
		question: 'Quais taxas são cobradas?',
		answer:
			'Uma taxa de serviço por ingresso vendido, sem mensalidade nem fidelidade. Você escolhe se a taxa é repassada ao comprador ou absorvida no preço; o simulador desta página mostra o valor líquido.',
	},
	{
		id: 7,
		category: 'Eventos',
		question: 'Posso criar eventos gratuitos?',
		answer: 'Sim. Eventos gratuitos têm inscrição e check-in normais, sem cobrança de taxa de serviço.',
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

function normalize(value: string) {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Perguntas frequentes da área do organizador. Segue o mesmo ritmo das outras
 * seções da landing (título à esquerda, largura do container) para que a
 * borda esquerda continue alinhada com o header em vez de recuar para uma
 * coluna centralizada.
 */
export function FAQAccordion() {
	const id = useId();
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [openItems, setOpenItems] = useState<number[]>([]);

	const toggleItem = (itemId: number) => {
		setOpenItems((previous) =>
			previous.includes(itemId) ? previous.filter((item) => item !== itemId) : [...previous, itemId],
		);
	};

	const term = normalize(searchTerm.trim());
	const filteredFaqs = faqs.filter((faq) => {
		const matchesSearch =
			term.length === 0 || normalize(faq.question).includes(term) || normalize(faq.answer).includes(term);
		const matchesCategory = selectedCategory === null || faq.category === selectedCategory;

		return matchesSearch && matchesCategory;
	});

	return (
		<div aria-labelledby={`${id}-title`}>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
						Dúvidas frequentes
					</p>
					<h2
						id={`${id}-title`}
						className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl"
					>
						Perguntas e respostas
					</h2>
					<p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
						O que você precisa saber antes de publicar o primeiro evento.
					</p>
				</div>
				<div className="space-y-3">
					<label htmlFor={`${id}-search`} className="sr-only">
						Buscar pergunta
					</label>
					<div className="relative">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
							aria-hidden="true"
						/>
						<Input
							id={`${id}-search`}
							type="search"
							placeholder="Buscar por palavra-chave"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							className="h-11 pl-10"
						/>
					</div>
					<div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
						<Button
							variant={selectedCategory === null ? 'default' : 'outline'}
							size="sm"
							onClick={() => setSelectedCategory(null)}
						>
							Todas
						</Button>
						{categories.map((category) => (
							<Button
								key={category}
								variant={selectedCategory === category ? 'default' : 'outline'}
								size="sm"
								onClick={() => setSelectedCategory(category)}
							>
								{category}
							</Button>
						))}
					</div>
				</div>
			</div>

			{filteredFaqs.length === 0 ? (
				<div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
					<HelpCircle className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
					Nenhuma pergunta encontrada para &ldquo;{searchTerm}&rdquo;.
				</div>
			) : (
				<ul className="mt-8 grid gap-3 lg:grid-cols-2" aria-label="Perguntas frequentes">
					{filteredFaqs.map((faq) => {
						const open = openItems.includes(faq.id);

						return (
							<li
								key={faq.id}
								className={cn(
									'rounded-lg border bg-white shadow-sm transition-colors dark:bg-slate-900',
									open
										? 'border-violet-300 dark:border-violet-700'
										: 'border-slate-200 hover:border-violet-300 dark:border-slate-800 dark:hover:border-violet-700',
								)}
							>
								<button
									type="button"
									onClick={() => toggleItem(faq.id)}
									aria-expanded={open}
									aria-controls={`${id}-answer-${faq.id}`}
									className="flex w-full items-start justify-between gap-4 p-5 text-left"
								>
									<span className="min-w-0">
										<span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
											{faq.category}
										</span>
										<span className="mt-1 block font-semibold text-slate-950 dark:text-white">{faq.question}</span>
									</span>
									<ChevronDown
										className={cn('mt-1 size-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
										aria-hidden="true"
									/>
								</button>
								{open && (
									<p
										id={`${id}-answer-${faq.id}`}
										className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300"
									>
										{faq.answer}
									</p>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
