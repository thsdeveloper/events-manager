'use client';

import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AutoSaveIndicatorProps {
	isSaving: boolean;
	lastSaved: Date | null;
}

export function AutoSaveIndicator({ isSaving, lastSaved }: AutoSaveIndicatorProps) {
	return (
		<div className="flex items-center gap-2 text-xs text-muted-foreground">
			{isSaving ? (
				<>
					<Spinner className="size-3 animate-spin" />
					<span>Salvando alterações...</span>
				</>
			) : lastSaved ? (
				<>
					<CheckCircle2 className="size-3 text-muted-foreground" />
					<span>Salvo neste navegador às {format(lastSaved, 'HH:mm', { locale: ptBR })}</span>
				</>
			) : (
				<span>As alterações ficam salvas automaticamente neste navegador</span>
			)}
		</div>
	);
}
