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

	return (
		<div className="sticky inset-x-0 bottom-0 z-30 mt-10 border-t border-border/60 bg-card/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/85">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-5">
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={onBack}
					disabled={isFirstStep || isProcessing}
				>
					Voltar
				</Button>
				{isLastStep ? (
					<Button
						type="submit"
						size="lg"
						disabled={nextDisabled}
					>
						{isSubmitting ? 'Salvando...' : 'Criar evento'}
					</Button>
				) : (
					<Button
						type="button"
						size="lg"
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
