'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Wand2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface AIImageGenerationModalProps {
	isOpen: boolean;
	eventTitle: string;
	categoryName?: string;
}

const generationSteps = [
	{ id: 1, text: 'Analisando os dados do evento...', duration: 2000 },
	{ id: 2, text: 'Criando prompt contextual...', duration: 2000 },
	{ id: 3, text: 'Gerando imagem com IA...', duration: 8000 },
	{ id: 4, text: 'Otimizando qualidade...', duration: 2000 },
	{ id: 5, text: 'Salvando imagem...', duration: 2000 },
];

export function AIImageGenerationModal({ isOpen, eventTitle, categoryName }: AIImageGenerationModalProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!isOpen) {
			setCurrentStep(0);
			setProgress(0);
			
return;
		}

		// Simulate progress through steps
		let stepIndex = 0;
		const totalDuration = generationSteps.reduce((sum, step) => sum + step.duration, 0);
		let elapsedTime = 0;

		const stepInterval = setInterval(() => {
			if (stepIndex < generationSteps.length) {
				setCurrentStep(stepIndex);
				const currentStepDuration = generationSteps[stepIndex].duration;

				// Update progress within current step
				const stepProgressInterval = setInterval(() => {
					elapsedTime += 100;
					const newProgress = (elapsedTime / totalDuration) * 100;
					setProgress(Math.min(newProgress, 100));

					if (elapsedTime >= currentStepDuration) {
						clearInterval(stepProgressInterval);
					}
				}, 100);

				stepIndex++;
			}
		}, generationSteps[stepIndex]?.duration || 1000);

		return () => {
			clearInterval(stepInterval);
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<Dialog open={isOpen} onOpenChange={() => {}}>
			<DialogContent
				className="sm:max-w-md"
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<DialogTitle className="sr-only">Gerando imagem com IA</DialogTitle>
				<DialogDescription className="sr-only">
					Aguarde enquanto geramos uma imagem de capa profissional para seu evento
				</DialogDescription>

				<div className="flex flex-col items-center justify-center py-8 px-4">
					{/* Animated Icon Container */}
					<div className="relative mb-8">
						{/* Pulsing background circles */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="size-32 rounded-full bg-primary/10 animate-ping" />
						</div>
						<div className="absolute inset-0 flex items-center justify-center animation-delay-300">
							<div className="size-24 rounded-full bg-primary/20 animate-ping" />
						</div>

						{/* Main icon with rotation */}
						<div className="relative z-10 flex items-center justify-center size-20 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-lg">
							<Sparkles className="size-10 text-white animate-pulse" />
						</div>

						{/* Orbiting icons */}
						<div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
							<div className="absolute -top-2 size-8 bg-primary/20 rounded-full flex items-center justify-center">
								<Wand2 className="size-4 text-primary" />
							</div>
						</div>
						<div className="absolute inset-0 flex items-center justify-center animate-spin-slow animation-delay-1000">
							<div className="absolute -bottom-2 size-8 bg-primary/20 rounded-full flex items-center justify-center">
								<Zap className="size-4 text-primary" />
							</div>
						</div>
					</div>

					{/* Title */}
					<h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
						Criando sua capa com IA
					</h2>

					{/* Event info */}
					<div className="text-center mb-6 space-y-1">
						<p className="text-sm font-medium text-foreground">{eventTitle}</p>
						{categoryName && (
							<p className="text-xs text-muted-foreground">Categoria: {categoryName}</p>
						)}
					</div>

					{/* Progress bar */}
					<div className="w-full mb-6">
						<div className="flex justify-between text-xs text-muted-foreground mb-2">
							<span>Progresso</span>
							<span>{Math.round(progress)}%</span>
						</div>
						<div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300 ease-out"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					{/* Current step indicator */}
					<div className="w-full space-y-3">
						{generationSteps.map((step, index) => (
							<div
								key={step.id}
								className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
									index === currentStep
										? 'bg-primary/10 scale-105'
										: index < currentStep
										? 'bg-muted/50'
										: 'bg-muted/20 opacity-50'
								}`}
							>
								<div className={`flex-shrink-0 ${
									index === currentStep
										? 'text-primary'
										: index < currentStep
										? 'text-muted-foreground'
										: 'text-muted-foreground/50'
								}`}>
									{index < currentStep ? (
										<div className="size-5 rounded-full bg-primary flex items-center justify-center">
											<svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
											</svg>
										</div>
									) : index === currentStep ? (
										<Loader2 className="size-5 animate-spin" />
									) : (
										<div className="size-5 rounded-full border-2 border-current" />
									)}
								</div>
								<p className={`text-sm font-medium ${
									index === currentStep
										? 'text-foreground'
										: index < currentStep
										? 'text-muted-foreground'
										: 'text-muted-foreground/50'
								}`}>
									{step.text}
								</p>
							</div>
						))}
					</div>

					{/* Helper text */}
					<p className="text-xs text-muted-foreground text-center mt-6">
						Este processo pode levar até 20 segundos. Por favor, aguarde...
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
