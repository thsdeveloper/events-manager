'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
	{
		id: 1,
		name: 'Ana Paula Silva',
		role: 'Produtora Cultural',
		company: 'AP Eventos',
		image: null,
		rating: 5,
		text: 'O EventsFlow mudou completamente como gerencio meus eventos. A plataforma é intuitiva e o suporte é excepcional. Em 3 meses, aumentei minhas vendas em 150%!',
		metric: '+150% vendas'
	},
	{
		id: 2,
		name: 'Carlos Mendes',
		role: 'Organizador de Festivais',
		company: 'Fest Brasil',
		image: null,
		rating: 5,
		text: 'Já tentei várias plataformas, mas nenhuma oferece a facilidade e os recursos do EventsFlow. O sistema de check-in por QR code é perfeito e evita filas.',
		metric: 'Sem filas'
	},
	{
		id: 3,
		name: 'Marina Costa',
		role: 'Coordenadora de Eventos',
		company: 'Espaço Conecta',
		image: null,
		rating: 5,
		text: 'A análise em tempo real me permite tomar decisões rápidas durante os eventos. Além disso, os repasses automáticos facilitam muito a gestão financeira.',
		metric: 'Dados ao vivo'
	},
	{
		id: 4,
		name: 'Roberto Alves',
		role: 'DJ e Produtor',
		company: 'Night Sessions',
		image: null,
		rating: 5,
		text: 'Criar eventos nunca foi tão fácil! Em menos de 10 minutos publico tudo e já posso compartilhar nas redes. O checkout é super rápido e meus fãs adoram.',
		metric: '< 10min setup'
	}
];

export function SocialProof() {
	const containerRef = useRef(null);
	const isInView = useInView(containerRef, { once: true, amount: 0.3 });
	const [currentIndex, setCurrentIndex] = useState(0);

	const nextTestimonial = () => {
		setCurrentIndex((prev) => (prev + 1) % testimonials.length);
	};

	const prevTestimonial = () => {
		setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
	};

	const currentTestimonial = testimonials[currentIndex];

	return (
		<section ref={containerRef} className="py-16">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.6 }}
				className="text-center mb-12"
			>
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
					Organizadores reais,{' '}
					<span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
						resultados reais
					</span>
				</h2>
				<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
					Veja o que outros organizadores estão dizendo sobre o EventsFlow
				</p>
			</motion.div>

			{/* Testimonial Carousel */}
			<div className="">
				<Card className="border-2 border-purple-100 dark:border-purple-900 shadow-xl">
					<CardContent className="p-8 md:p-12">
						{/* Quote Icon */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200 }}
							className="mb-6"
						>
							<Quote className="size-12 text-purple-200 dark:text-purple-800" />
						</motion.div>

						{/* Rating */}
						<div className="flex gap-1 mb-6">
							{Array.from({ length: currentTestimonial.rating }).map((_, i) => (
								<motion.div
									key={i}
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: i * 0.1 }}
								>
									<Star className="size-6 fill-yellow-400 text-yellow-400" />
								</motion.div>
							))}
						</div>

						{/* Testimonial Text */}
						<motion.p
							key={currentTestimonial.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.5 }}
							className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8 italic"
						>
							"{currentTestimonial.text}"
						</motion.p>

						{/* Metric Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold mb-8"
						>
							✨ {currentTestimonial.metric}
						</motion.div>

						{/* Author */}
						<div className="flex items-center gap-4">
							<Avatar className="size-16 border-2 border-purple-200 dark:border-purple-800">
								<AvatarImage src={currentTestimonial.image || undefined} />
								<AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xl font-semibold">
									{currentTestimonial.name.split(' ').map(n => n[0]).join('')}
								</AvatarFallback>
							</Avatar>
							<div>
								<div className="font-bold text-gray-900 dark:text-white">
									{currentTestimonial.name}
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									{currentTestimonial.role} • {currentTestimonial.company}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Navigation */}
				<div className="flex items-center justify-center gap-4 mt-8">
					<Button
						variant="outline"
						size="icon"
						onClick={prevTestimonial}
						className="rounded-full"
					>
						<ChevronLeft className="size-5" />
					</Button>

					{/* Dots */}
					<div className="flex gap-2">
						{testimonials.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`size-2 rounded-full transition-all duration-300 ${
									index === currentIndex
										? 'bg-purple-600 w-8'
										: 'bg-gray-300 dark:bg-gray-700'
								}`}
								aria-label={`Go to testimonial ${index + 1}`}
							/>
						))}
					</div>

					<Button
						variant="outline"
						size="icon"
						onClick={nextTestimonial}
						className="rounded-full"
					>
						<ChevronRight className="size-5" />
					</Button>
				</div>
			</div>

			{/* Trust Badges */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ delay: 0.6 }}
				className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-40 dark:opacity-20"
			>
				<div className="text-2xl font-bold text-gray-600">AbacatePay Partner</div>
				<div className="text-2xl font-bold text-gray-600">PCI Compliant</div>
				<div className="text-2xl font-bold text-gray-600">ISO 27001</div>
				<div className="text-2xl font-bold text-gray-600">LGPD Certified</div>
			</motion.div>
		</section>
	);
}
