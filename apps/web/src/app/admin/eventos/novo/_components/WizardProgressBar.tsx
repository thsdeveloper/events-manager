'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventWizardStepMeta } from './types';

interface WizardProgressBarProps {
	steps: EventWizardStepMeta[];
	currentStep: number;
	visitedSteps: Set<number>;
	onStepSelect?: (index: number) => void;
}

export function WizardProgressBar({ steps, currentStep, visitedSteps, onStepSelect }: WizardProgressBarProps) {
	const progress = Math.max(0, (currentStep / (steps.length - 1)) * 100);
	const estimatedTime = steps.slice(currentStep).reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0);

	return (
		<div className="space-y-3">
			{/* Compact Header: Info + Progress Bar integrados */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="text-xs">
						<span className="font-semibold text-foreground">Etapa {currentStep + 1} de {steps.length}</span>
						<span className="mx-1.5 text-muted-foreground">•</span>
						<span className="text-muted-foreground">{steps[currentStep].title}</span>
					</div>
				</div>
				<div className="flex items-center gap-3 text-xs">
					<span className="text-muted-foreground">
						<span className="font-medium text-foreground">{estimatedTime} min</span> restantes
					</span>
					<div className="font-bold text-primary tabular-nums">{Math.round(progress)}%</div>
				</div>
			</div>

			{/* Compact Progress Bar */}
			<div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
				<div
					className="h-full rounded-full bg-primary shadow-sm transition-all duration-500 ease-out"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{/* Compact Steps Timeline */}
			<div className="relative pt-1">
				{/* Connection Line */}
				<div className="absolute inset-x-0 top-5 h-px bg-border" aria-hidden="true" />

				<ol className="relative grid grid-cols-7 gap-1.5">
					{steps.map((step, index) => {
						const isActive = index === currentStep;
						const isVisited = visitedSteps.has(index);
						const isCompleted = index < currentStep;
						const isClickable = !!onStepSelect && isVisited;

						return (
							<li key={step.id} className="relative">
								<button
									type="button"
									onClick={() => isClickable && onStepSelect?.(index)}
									disabled={!isClickable}
									className={cn(
										'group relative flex w-full flex-col items-center gap-1.5 text-center transition-all duration-200',
										isClickable && 'cursor-pointer',
										!isClickable && 'cursor-default',
									)}
									aria-current={isActive ? 'step' : undefined}
									aria-label={`${step.title}: ${step.description}`}
								>
									{/* Step Circle - Reduzido */}
									<div
										className={cn(
											'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-sm transition-all duration-200',
											isActive && 'scale-110 border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20',
											isCompleted && !isActive && 'border-primary bg-primary text-primary-foreground',
											isVisited && !isCompleted && !isActive && 'border-border bg-background text-foreground',
											!isVisited && 'border-dashed border-muted-foreground/30 bg-muted text-muted-foreground',
											isClickable && !isActive && 'group-hover:border-primary/50 group-hover:scale-105',
										)}
									>
										{isCompleted ? (
											<Check className="size-4" strokeWidth={3} />
										) : (
											<span>{index + 1}</span>
										)}

										{/* Active Pulse - Reduzido */}
										{isActive && (
											<span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary opacity-15" />
										)}
									</div>

									{/* Step Label - Compacto */}
									<div className="w-full">
										<div
											className={cn(
												'text-[10px] font-medium leading-tight transition-colors duration-200',
												isActive && 'text-primary',
												isCompleted && !isActive && 'text-foreground',
												isVisited && !isCompleted && !isActive && 'text-foreground/70',
												!isVisited && 'text-muted-foreground',
											)}
										>
											{step.title}
										</div>
									</div>

									{/* Completion Indicator Line */}
									{index < steps.length - 1 && (
										<div
											className={cn(
												'absolute left-[calc(50%+16px)] top-4 h-px w-[calc(100%-32px)] transition-all duration-300',
												isCompleted ? 'bg-primary' : 'bg-transparent',
											)}
											aria-hidden="true"
										/>
									)}
								</button>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
