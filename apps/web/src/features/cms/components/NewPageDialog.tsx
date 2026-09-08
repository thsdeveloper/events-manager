'use client';

import { cmsPageInputSchema, normalizePermalink } from '@events-manager/contracts';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { validateWith } from '../lib/validation';
import type { CmsPageRow } from '../types';
import { Field, FieldError } from './FormPrimitives';

interface NewPageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function NewPageDialog({ open, onOpenChange }: NewPageDialogProps) {
	const router = useRouter();
	const id = useId();
	const [title, setTitle] = useState('');
	const [permalink, setPermalink] = useState('/');
	const [permalinkTouched, setPermalinkTouched] = useState(false);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTitle('');
		setPermalink('/');
		setPermalinkTouched(false);
		setErrors(null);
		setFormError(null);
	}, [open]);

	function changeTitle(value: string) {
		setTitle(value);
		if (!permalinkTouched) setPermalink(normalizePermalink(value));
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setFormError(null);
		const validation = validateWith(cmsPageInputSchema, { title, permalink, status: 'draft', published_at: null });
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			const created = await cmsRequest<CmsPageRow>('/pages', { method: 'POST', body: validation.data });
			await revalidateCmsContent();
			onOpenChange(false);
			router.push(`/super-admin/conteudo/paginas/${created.id}`);
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Nova página</DialogTitle>
					<DialogDescription>
						A página nasce como rascunho; os blocos e o SEO são editados em seguida.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<Field id={`${id}-title`} label="Título" error={errors?.title?.[0]}>
						<Input
							id={`${id}-title`}
							value={title}
							maxLength={150}
							autoFocus
							onChange={(event) => changeTitle(event.target.value)}
						/>
					</Field>
					<Field
						id={`${id}-permalink`}
						label="Permalink"
						hint="Caminho público, ex.: /sobre-nos"
						error={errors?.permalink?.[0]}
					>
						<Input
							id={`${id}-permalink`}
							value={permalink}
							onChange={(event) => {
								setPermalinkTouched(true);
								setPermalink(event.target.value);
							}}
						/>
					</Field>
					<FieldError message={formError} />
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" loading={saving}>
							<Plus className="mr-2 size-4" />
							Criar página
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
