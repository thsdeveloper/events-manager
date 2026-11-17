'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import type { EventWizardFormValues } from './types';
import { descriptionToHtml, eventAIContext, generateEventContent } from './event-ai';

export function DescriptionAssistant({ onClose }: { onClose: () => void }) {
	const form = useFormContext<EventWizardFormValues>();
	const [brief, setBrief] = useState('');
	const [suggestion, setSuggestion] = useState<string | null>(null);
	const pending = useRef(false);
	const generation = useMutation({
		retry: false,
		gcTime: 0,
		mutationFn: () =>
			generateEventContent<{ description: string }>('description', eventAIContext(form.getValues(), brief)),
	});
	const generate = async () => {
		if (pending.current) return;
		pending.current = true;
		try {
			setSuggestion((await generation.mutateAsync()).description);
		} catch {
			/* The mutation error is presented below; existing text is preserved. */
		} finally {
			pending.current = false;
		}
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !pending.current) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" hideCloseButton={generation.isPending}>
				<DialogHeader>
					<DialogTitle>Uma ajuda para contar sua história</DialogTitle>
					<DialogDescription>
						Vamos usar o nome, a categoria e os dados já preenchidos. Revise a sugestão antes de usá-la.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="description-brief">O que não pode faltar? (opcional)</Label>
					<Textarea
						id="description-brief"
						value={brief}
						onChange={(event) => setBrief(event.target.value)}
						maxLength={1000}
						disabled={generation.isPending}
						placeholder="Público, programação, atrações confirmadas e diferenciais do evento."
					/>
				</div>
				{generation.error && (
					<Alert variant="destructive">
						<AlertDescription>{generation.error.message}</AlertDescription>
					</Alert>
				)}
				{generation.isPending && (
					<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
						<Spinner aria-hidden="true" />
						Preparando sua sugestão…
					</p>
				)}
				{suggestion !== null && (
					<div className="space-y-2">
						<Label htmlFor="description-suggestion">Sugestão de descrição</Label>
						<Textarea
							id="description-suggestion"
							className="min-h-56"
							value={suggestion}
							onChange={(event) => setSuggestion(event.target.value)}
							maxLength={8000}
							disabled={generation.isPending}
						/>
						<p className="text-sm text-muted-foreground">
							Ao aplicar, este texto substituirá a descrição em português. Confira os detalhes do evento.
						</p>
					</div>
				)}
				<DialogFooter>
					<Button type="button" variant="ghost" disabled={generation.isPending} onClick={onClose}>
						{suggestion ? 'Descartar sugestão' : 'Cancelar'}
					</Button>
					<Button
						type="button"
						variant={suggestion ? 'outline' : 'default'}
						disabled={generation.isPending}
						onClick={() => void generate()}
					>
						{suggestion ? 'Gerar outra sugestão' : 'Gerar sugestão'}
					</Button>
					{suggestion !== null && (
						<Button
							type="button"
							disabled={generation.isPending || !suggestion?.trim()}
							onClick={() => {
								form.setValue('description', descriptionToHtml(suggestion ?? ''), {
									shouldDirty: true,
									shouldValidate: true,
								});
								onClose();
							}}
						>
							Usar esta descrição
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
