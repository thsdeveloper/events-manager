'use client';

import { Button } from '@/components/ui/button';

interface StepNavigationProps {
	/** Texto do botão da última etapa; "Criar evento" por padrão. */
	submitLabel?: string;
	/** Salva de qualquer etapa, sem ir até a revisão (edição). */
	onSave?: () => void;
	isFirstStep: boolean;
	isLastStep: boolean;
	isSubmitting: boolean;
	isLoadingOrganizer?: boolean;
	onBack: () => void;
	onNext: () => void;
	onConfirm: () => void;
	disableNext?: boolean;
}

export function StepNavigation({
	submitLabel = 'Criar evento',
	onSave,
	isFirstStep,
	isLastStep,
	isSubmitting,
	isLoadingOrganizer,
	onBack,
	onNext,
	onConfirm,
	disableNext,
}: StepNavigationProps) {
	const isProcessing = isSubmitting || !!isLoadingOrganizer;
	const nextDisabled = disableNext || isProcessing;

	// Keep the actions aligned with the content when the sidebar is expanded or collapsed.
	return (
		<div className="sticky bottom-0 z-30 -mx-4 border-t bg-background p-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
				<Button type="button" variant="outline" size="sm" onClick={onBack} disabled={isFirstStep || isProcessing}>
					Voltar
				</Button>
				<div className="flex items-center gap-2">
					{onSave && !isLastStep && (
						<Button type="button" size="sm" variant="secondary" onClick={onSave} disabled={isProcessing}>
							{isSubmitting ? 'Salvando...' : 'Salvar'}
						</Button>
					)}
					{isLastStep ? (
						<Button key="confirm" type="button" size="sm" onClick={onConfirm} disabled={nextDisabled}>
							{isSubmitting ? 'Salvando...' : submitLabel}
						</Button>
					) : (
						<Button key="continue" type="button" size="sm" onClick={onNext} disabled={nextDisabled}>
							Continuar
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
