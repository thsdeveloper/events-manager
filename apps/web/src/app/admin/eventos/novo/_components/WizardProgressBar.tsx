'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EventWizardStepMeta } from './types';

interface WizardProgressBarProps {
	steps: EventWizardStepMeta[];
	currentStep: number;
	visitedSteps: Set<number>;
	onStepSelect?: (index: number) => void;
}

/**
 * Reports whether the sticky bar has left its natural position. A sentinel above
 * the bar is observed instead of listening to scroll: the browser does the work,
 * and there is no per-frame handler competing with the sticky paint.
 */
function readHeaderHeight() {
	return (
		Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--admin-header-height'), 10) || 0
	);
}

function useIsStuck() {
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [isStuck, setIsStuck] = useState(false);
	// AdminHeader publishes its measured height, so the value is read into state
	// and the observer is rebuilt whenever it changes — rootMargin is fixed at
	// construction time and cannot be updated in place.
	const [headerHeight, setHeaderHeight] = useState<number | null>(null);

	useEffect(() => {
		setHeaderHeight(readHeaderHeight());
		const syncHeaderHeight = () => setHeaderHeight(readHeaderHeight());
		window.addEventListener('resize', syncHeaderHeight);

		return () => window.removeEventListener('resize', syncHeaderHeight);
	}, []);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (headerHeight === null || !sentinel || typeof IntersectionObserver === 'undefined') return;

		const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), {
			// Shrink the viewport by the header so the sentinel counts as gone the
			// moment it slides under it, which is exactly when the bar sticks.
			rootMargin: `-${headerHeight}px 0px 0px 0px`,
			threshold: 0,
		});
		observer.observe(sentinel);

		return () => observer.disconnect();
	}, [headerHeight]);

	return { sentinelRef, isStuck };
}

export function WizardProgressBar({ steps, currentStep, visitedSteps, onStepSelect }: WizardProgressBarProps) {
	const progress = Math.max(0, (currentStep / (steps.length - 1)) * 100);
	const estimatedTime = steps.slice(currentStep).reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0);
	const { sentinelRef, isStuck } = useIsStuck();

	// Once stuck the bar bleeds past the page gutter, so the rows that must stay
	// aligned with the content get the gutter back individually. The progress
	// track deliberately does not, which is what makes it span header to edge.
	const gutter = isStuck ? 'px-4 sm:px-6 lg:px-8' : '';

	return (
		<TooltipProvider delayDuration={200}>
			{/* Zero-height probe: marks where the bar sits before it sticks. */}
			<div ref={sentinelRef} aria-hidden="true" className="h-px" />

			<div
				className={cn(
					'sticky top-[var(--admin-header-height)] z-20 transition-all duration-300 ease-out',
					// Opaque, not translucent: content scrolls underneath, and a see-through
					// band makes those half-covered lines read as a rendering glitch.
					isStuck && '-mx-4 border-b border-border bg-background shadow-md sm:-mx-6 lg:-mx-8',
				)}
			>
				{/* Step counter and time estimate: redundant once the bar is a thin strip,
				    so the whole row collapses instead of merely shrinking. */}
				<div
					className={cn(
						'overflow-hidden transition-all duration-300 ease-out',
						gutter,
						isStuck ? 'max-h-0 opacity-0' : 'mb-2.5 max-h-8 opacity-100',
					)}
				>
					<div className="flex items-center justify-between gap-4 text-xs">
						<div>
							<span className="font-semibold text-foreground">
								Etapa {currentStep + 1} de {steps.length}
							</span>
							<span className="mx-1.5 text-muted-foreground">•</span>
							<span className="text-muted-foreground">{steps[currentStep].title}</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-muted-foreground">
								<span className="font-medium text-foreground">{estimatedTime} min</span> restantes
							</span>
							<span className="font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
						</div>
					</div>
				</div>

				{/* Flush against the header once stuck — no gutter, no rounding. */}
				<div
					className={cn('h-1 overflow-hidden bg-secondary/50 transition-all duration-300', !isStuck && 'rounded-full')}
				>
					<div
						className={cn(
							'h-full bg-primary shadow-sm transition-all duration-500 ease-out',
							!isStuck && 'rounded-full',
						)}
						style={{ width: `${progress}%` }}
					/>
				</div>

				{/* pt-3 keeps a clear gap between the progress track and the circles so
				    the two never read as one crowded strip. */}
				<div className={cn('relative transition-all duration-300', gutter, isStuck ? 'pb-2 pt-3' : 'pt-2.5')}>
					<div
						className={cn(
							'absolute h-px bg-border transition-all duration-300',
							isStuck ? 'inset-x-4 top-6 sm:inset-x-6 lg:inset-x-8' : 'inset-x-0 top-6',
						)}
						aria-hidden="true"
					/>

					<ol className="relative grid grid-cols-7 gap-1.5">
						{steps.map((step, index) => {
							const isActive = index === currentStep;
							const isVisited = visitedSteps.has(index);
							const isCompleted = index < currentStep;
							const isClickable = !!onStepSelect && isVisited;

							return (
								<li key={step.id} className="relative">
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												onClick={() => isClickable && onStepSelect?.(index)}
												disabled={!isClickable}
												className={cn(
													'group relative flex w-full flex-col items-center gap-1 text-center transition-all duration-200',
													isClickable ? 'cursor-pointer' : 'cursor-default',
												)}
												aria-current={isActive ? 'step' : undefined}
												aria-label={`${step.title}: ${step.description}`}
											>
												<div
													className={cn(
														'relative z-10 flex items-center justify-center rounded-full border-2 font-semibold shadow-sm transition-all duration-300',
														isStuck ? 'size-6 text-[10px]' : 'size-7 text-xs',
														isActive &&
															'scale-110 border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20',
														isCompleted && !isActive && 'border-primary bg-primary text-primary-foreground',
														isVisited && !isCompleted && !isActive && 'border-border bg-background text-foreground',
														!isVisited && 'border-dashed border-muted-foreground/30 bg-muted text-muted-foreground',
														isClickable && !isActive && 'group-hover:scale-105 group-hover:border-primary/50',
													)}
												>
													{isCompleted ? (
														<Check className={cn(isStuck ? 'size-3' : 'size-3.5')} strokeWidth={3} />
													) : (
														<span>{index + 1}</span>
													)}

													{isActive && (
														<span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary opacity-15" />
													)}
												</div>

												{/* Labels collapse rather than unmount, so the height animates and
												    the accessible name on the button is unaffected. */}
												<div
													className={cn(
														'w-full overflow-hidden transition-all duration-300 ease-out',
														isStuck ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100',
													)}
												>
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

												{index < steps.length - 1 && (
													<div
														className={cn(
															'absolute h-px transition-all duration-300',
															isStuck
																? 'left-[calc(50%+12px)] top-3 w-[calc(100%-24px)]'
																: 'left-[calc(50%+14px)] top-3.5 w-[calc(100%-28px)]',
															isCompleted ? 'bg-primary' : 'bg-transparent',
														)}
														aria-hidden="true"
													/>
												)}
											</button>
										</TooltipTrigger>
										{/* Only while stuck: the labels are visible otherwise, and a tooltip
										    repeating them would be noise. Omitting the content keeps the
										    trigger mounted, so toggling never restarts the size transition. */}
										{isStuck && (
											<TooltipContent side="bottom" className="px-2 py-1 text-xs">
												{step.title}
											</TooltipContent>
										)}
									</Tooltip>
								</li>
							);
						})}
					</ol>
				</div>
			</div>
		</TooltipProvider>
	);
}
