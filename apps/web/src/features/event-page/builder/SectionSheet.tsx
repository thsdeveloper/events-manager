'use client';

import { EVENT_PAGE_SECTION_META, eventPageAnchorSchema, type EventPageSection } from '@events-manager/contracts';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SectionFields } from './sections/fields';

interface SectionSheetProps {
	section: EventPageSection | null;
	/** Âncoras das outras seções, para recusar repetição. */
	takenAnchors: string[];
	onApply: (section: EventPageSection) => void;
	onClose: () => void;
}

/**
 * Edição de uma seção no painel lateral. O rascunho só muda ao aplicar: a
 * pessoa pode desistir sem deixar meia edição na página.
 */
export function SectionSheet({ section, takenAnchors, onApply, onClose }: SectionSheetProps) {
	const [draft, setDraft] = useState<EventPageSection | null>(section);
	const [anchorError, setAnchorError] = useState<string | null>(null);

	useEffect(() => {
		setDraft(section);
		setAnchorError(null);
	}, [section]);

	if (!draft) return <Sheet open={false} />;
	const meta = EVENT_PAGE_SECTION_META[draft.type];

	const apply = () => {
		const parsed = eventPageAnchorSchema.safeParse(draft.anchor);
		if (!parsed.success) {
			setAnchorError(parsed.error.issues[0]?.message ?? 'Âncora inválida.');

			return;
		}
		if (takenAnchors.includes(parsed.data)) {
			setAnchorError('Outra seção já usa esta âncora.');

			return;
		}
		onApply({ ...draft, anchor: parsed.data, title: draft.title?.trim() || undefined });
	};

	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
				<SheetHeader className="border-b p-5">
					<SheetTitle>Editar {meta.label}</SheetTitle>
					<SheetDescription>{meta.description}</SheetDescription>
				</SheetHeader>
				<div className="flex-1 space-y-5 p-5">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="section-title">Título da seção</Label>
							<Input
								id="section-title"
								value={draft.title ?? ''}
								onChange={(event) => setDraft({ ...draft, title: event.target.value })}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="section-anchor">Âncora</Label>
							<Input
								id="section-anchor"
								value={draft.anchor}
								onChange={(event) => {
									setAnchorError(null);
									setDraft({ ...draft, anchor: event.target.value });
								}}
								aria-invalid={anchorError ? true : undefined}
								aria-describedby="section-anchor-hint"
							/>
							<p
								id="section-anchor-hint"
								className={anchorError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}
							>
								{anchorError ?? `Vira #${draft.anchor || 'ancora'} nos links do cabeçalho.`}
							</p>
						</div>
					</div>
					<SectionFields value={draft} onChange={setDraft} />
				</div>
				<SheetFooter className="border-t p-5">
					<Button type="button" variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button type="button" onClick={apply}>
						Aplicar
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
