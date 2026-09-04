'use client';

import { Button } from '@/components/ui/button';

interface StepNavigationProps {
	isFirstStep: boolean;
	isLastStep: boolean;
	isSubmitting: boolean;
	isLoadingOrganizer?: boolean;
	onBack: () => void;
	onNext: () => void;
	disableNext?: boolean;
}

export function StepNavigation({
	isFirstStep,
	isLastStep,
	isSubmitting,
	isLoadingOrganizer,
	onBack,
	onNext,
	disableNext,
}: StepNavigationProps) {
	const isProcessing = isSubmitting || !!isLoadingOrganizer;
	const nextDisabled = disableNext || isProcessing;

	// lg:left-72 offsets the bar by the sidebar width so it lines up with the content column.
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:left-72">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onBack}
					disabled={isFirstStep || isProcessing}
				>
					Voltar
				</Button>
				{isLastStep ? (
					<Button
						type="submit"
						size="sm"
						disabled={nextDisabled}
					>
						{isSubmitting ? 'Salvando...' : 'Criar evento'}
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						onClick={onNext}
						disabled={nextDisabled}
					>
						Continuar
					</Button>
				)}
			</div>
		</div>
	);
}
