'use client';

import { TabsList, TabsTrigger } from '@/components/ui/base-tabs';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
	return Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--admin-header-height'), 10) || 0;
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
	const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 100;
	const { sentinelRef, isStuck } = useIsStuck();

	return (
		<>
			<div ref={sentinelRef} aria-hidden="true" className="h-0" />
			<div
				className={cn(
					'sticky top-[var(--admin-header-height)] z-20 space-y-3 bg-background py-3',
					isStuck && '-mx-4 border-b px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
				)}
			>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						Etapa {currentStep + 1} de {steps.length} · {steps[currentStep].title}
					</span>
					<span>{Math.round(progress)}% concluído</span>
				</div>
				<div className="overflow-x-auto pb-1">
					<TabsList
						aria-label="Etapas do cadastro"
						className="w-full min-w-max justify-start sm:justify-between"
						activateOnFocus={false}
					>
						{steps.map((step, index) => (
							<TabsTrigger
								key={step.id}
								value={index}
								disabled={!visitedSteps.has(index) || !onStepSelect}
								aria-label={`${step.title}: ${step.description}`}
								onClick={() => onStepSelect?.(index)}
							>
								<span
									className="flex size-5 items-center justify-center rounded-full bg-muted text-xs"
									aria-hidden="true"
								>
									{index < currentStep ? <Check className="size-3" /> : index + 1}
								</span>
								{step.title}
							</TabsTrigger>
						))}
					</TabsList>
				</div>
				<Progress value={progress} aria-label="Progresso da criação do evento" className="h-1" />
			</div>
		</>
	);
}
