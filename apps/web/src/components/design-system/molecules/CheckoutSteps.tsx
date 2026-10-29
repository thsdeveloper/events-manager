import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckoutStep {
	id: string;
	label: string;
}

/**
 * Trilha de etapas do checkout. Marca o que já ficou para trás e onde a pessoa
 * está agora, para que ela saiba quanto falta antes de informar o pagamento.
 * Etapas concluídas viram atalho de volta quando o pai informa `onStepSelect`;
 * as que ainda não chegaram nunca são clicáveis, para não pular validação.
 */
export function CheckoutSteps({
	currentStep,
	onStepSelect,
	steps,
}: {
	currentStep: string;
	onStepSelect?: (stepId: string) => void;
	steps: CheckoutStep[];
}) {
	const currentIndex = Math.max(
		steps.findIndex((step) => step.id === currentStep),
		0,
	);

	return (
		<nav aria-label="Etapas da compra">
			<ol className="flex flex-wrap items-center gap-2 text-sm">
				{steps.map((step, index) => {
					const isDone = index < currentIndex;
					const isCurrent = index === currentIndex;
					const content = (
						<>
							<span
								aria-label={isDone ? `${step.label} concluído` : undefined}
								className={cn(
									'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
									isDone && 'bg-primary text-primary-foreground',
									isCurrent && 'bg-primary/15 text-primary ring-2 ring-primary/40',
									!isDone && !isCurrent && 'bg-muted text-muted-foreground',
								)}
							>
								{isDone ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : index + 1}
							</span>
							<span className={cn('font-medium', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
								{step.label}
							</span>
						</>
					);

					return (
						<li
							key={step.id}
							aria-current={isCurrent ? 'step' : undefined}
							className={cn(
								'flex items-center gap-2',
								index < steps.length - 1 &&
									'after:mx-1 after:h-px after:w-6 after:bg-border after:content-[""] sm:after:w-10',
							)}
						>
							{isDone && onStepSelect ? (
								<button
									type="button"
									aria-label={`Voltar para ${step.label}`}
									onClick={() => onStepSelect(step.id)}
									className="flex items-center gap-2 rounded-full transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>span:last-child]:hover:text-foreground"
								>
									{content}
								</button>
							) : (
								content
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
