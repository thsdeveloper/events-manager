'use client';

import { cmsBlockItemSchemas, type CmsBlockCollection } from '@events-manager/contracts';
import { Save } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { blockTypeMeta } from '../lib/blocks';
import { validateWith } from '../lib/validation';
import type { CmsBlockRow } from '../types';
import { blockForms } from './blocks';
import { FieldError } from './FormPrimitives';

interface BlockFormSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pageId: string;
	collection: CmsBlockCollection;
	/** Bloco existente para edição; `null` cria um novo. */
	block: CmsBlockRow | null;
	onSaved: (block: CmsBlockRow) => void;
}

export function BlockFormSheet({ open, onOpenChange, pageId, collection, block, onSaved }: BlockFormSheetProps) {
	const formId = useId();
	const definition = blockForms[collection];
	const meta = blockTypeMeta(collection);
	const [state, setState] = useState(() => definition.fromItem(block?.item ?? null));
	const [background, setBackground] = useState<'light' | 'dark'>(block?.background ?? 'light');
	const [hidden, setHidden] = useState(block?.hide_block ?? false);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	// Reinicia o formulário a cada abertura: o Sheet é reaproveitado entre blocos.
	useEffect(() => {
		if (!open) return;
		setState(definition.fromItem(block?.item ?? null));
		setBackground(block?.background ?? 'light');
		setHidden(block?.hide_block ?? false);
		setErrors(null);
		setFormError(null);
	}, [block, collection, definition, open]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setFormError(null);
		const validation = validateWith(cmsBlockItemSchemas[collection], definition.toPayload(state));
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			const saved = block
				? await cmsRequest<CmsBlockRow>(`/pages/${pageId}/blocks/${block.id}`, {
						method: 'PATCH',
						body: { item: validation.data, background, hide_block: hidden },
					})
				: await cmsRequest<CmsBlockRow>(`/pages/${pageId}/blocks`, {
						method: 'POST',
						body: { collection, item: validation.data, background, hide_block: hidden },
					});
			onSaved(saved);
			onOpenChange(false);
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) {
				setErrors(failure.fieldErrors);
			}
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	const Fields = definition.Fields;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
				<SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
					<SheetTitle>{block ? `Editar bloco: ${meta.label}` : `Novo bloco: ${meta.label}`}</SheetTitle>
					<SheetDescription>{meta.description}</SheetDescription>
				</SheetHeader>

				<form id={formId} onSubmit={submit} className="flex-1 space-y-6 overflow-y-auto p-6">
					<Fields value={state} onChange={setState} errors={errors} />

					<div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor={`${formId}-background`}>Fundo</Label>
							<Select value={background} onValueChange={(value) => setBackground(value as 'light' | 'dark')}>
								<SelectTrigger id={`${formId}-background`}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="light">Claro</SelectItem>
									<SelectItem value="dark">Escuro</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<label className="flex items-center gap-3 self-end pb-2 text-sm">
							<Switch checked={hidden} onCheckedChange={setHidden} aria-label="Ocultar bloco no site" />
							Ocultar no site
						</label>
					</div>

					{formError && <FieldError message={formError} />}
				</form>

				<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form={formId} loading={saving}>
						<Save className="mr-2 size-4" />
						{block ? 'Salvar bloco' : 'Adicionar bloco'}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
