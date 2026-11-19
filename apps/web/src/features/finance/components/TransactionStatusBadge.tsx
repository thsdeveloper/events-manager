import { CheckCircle2, Clock3, CircleX, RotateCcw, Ban, CircleHelp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
const styles = {
	paid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
	pending: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
	failed: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
	refunded:
		'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200',
	other: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};
export function TransactionStatusBadge({ status }: { status: string | null }) {
	const [label, kind, Icon] =
		status === 'succeeded' || status === 'paid'
			? (['Pago', 'paid', CheckCircle2] as const)
			: status === 'confirmed'
				? (['Confirmada', 'paid', CheckCircle2] as const)
				: status === 'completed'
					? (['Quitado', 'paid', CheckCircle2] as const)
					: status === 'free'
						? (['Gratuito', 'paid', CheckCircle2] as const)
						: status === 'partial_payment'
							? (['Pagamento parcial', 'pending', Clock3] as const)
							: status === 'overdue'
								? (['Vencida', 'failed', Clock3] as const)
								: status === 'pending'
									? (['Pendente', 'pending', Clock3] as const)
									: status === 'failed'
										? (['Falhou', 'failed', CircleX] as const)
										: status === 'refunded'
											? (['Reembolsado', 'refunded', RotateCcw] as const)
											: status === 'cancelled'
												? (['Cancelado', 'other', Ban] as const)
												: ([status || 'Não informado', 'other', CircleHelp] as const);

	return (
		<Badge variant="outline" className={`gap-1.5 whitespace-nowrap ${styles[kind]}`}>
			<Icon className="size-3.5" aria-hidden="true" />
			{label}
		</Badge>
	);
}
