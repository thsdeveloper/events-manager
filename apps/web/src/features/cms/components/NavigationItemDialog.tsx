'use client';

import { cmsNavigationItemInputSchema } from '@events-manager/contracts';
import { Save } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { validateWith } from '../lib/validation';
import type { CmsNavigationItemNode } from '../types';
import { ContentPicker, type ContentReference } from './ContentPicker';
import { Field, FieldError } from './FormPrimitives';

interface NavigationItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	navigationId: string;
	/** Item em edição; `null` cria. */
	item: CmsNavigationItemNode | null;
	/** Pai do item novo (subitem) ou do item em edição. */
	parent: { id: string; title: string } | null;
	onSaved: () => void;
}

const TYPE_LABELS: Record<CmsNavigationItemNode['type'], string> = {
	page: 'Página do site',
	post: 'Post do blog',
	url: 'Endereço (URL)',
	group: 'Grupo (sem link)',
};

export function NavigationItemDialog({
	open,
	onOpenChange,
	navigationId,
	item,
	parent,
	onSaved,
}: NavigationItemDialogProps) {
	const id = useId();
	const [title, setTitle] = useState('');
	const [type, setType] = useState<CmsNavigationItemNode['type']>('url');
	const [url, setUrl] = useState('');
	const [page, setPage] = useState<ContentReference | null>(null);
	const [post, setPost] = useState<ContentReference | null>(null);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTitle(item?.title ?? '');
		setType(item?.type ?? 'url');
		setUrl(item?.url ?? '');
		setPage(item?.page ? { id: item.page.id, title: item.page.title, path: item.page.permalink } : null);
		setPost(item?.post ? { id: item.post.id, title: item.post.title, path: `/blog/${item.post.slug}` } : null);
		setErrors(null);
		setFormError(null);
	}, [item, open]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setFormError(null);
		const validation = validateWith(cmsNavigationItemInputSchema, {
			title,
			type,
			url: type === 'url' ? url || null : null,
			page: type === 'page' ? (page?.id ?? null) : null,
			post: type === 'post' ? (post?.id ?? null) : null,
			parent: parent?.id ?? null,
		});
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			if (item) {
				await cmsRequest(`/navigation/${navigationId}/items/${item.id}`, { method: 'PATCH', body: validation.data });
			} else {
				await cmsRequest(`/navigation/${navigationId}/items`, { method: 'POST', body: validation.data });
			}
			onSaved();
			onOpenChange(false);
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
					<DialogTitle>{item ? 'Editar item' : parent ? `Novo subitem em "${parent.title}"` : 'Novo item'}</DialogTitle>
					<DialogDescription>
						{parent
							? 'Subitens aparecem no menu suspenso do item pai.'
							: 'Itens do primeiro nível aparecem direto na barra.'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<Field id={`${id}-title`} label="Rótulo" error={errors?.title?.[0]}>
						<Input
							id={`${id}-title`}
							value={title}
							maxLength={80}
							autoFocus
							onChange={(event) => setTitle(event.target.value)}
						/>
					</Field>
					<div className="space-y-1.5">
						<Label htmlFor={`${id}-type`}>Tipo</Label>
						<Select value={type} onValueChange={(value) => setType(value as CmsNavigationItemNode['type'])}>
							<SelectTrigger id={`${id}-type`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(TYPE_LABELS) as Array<CmsNavigationItemNode['type']>).map((value) => (
									<SelectItem key={value} value={value}>
										{TYPE_LABELS[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{type === 'url' && (
						<Field id={`${id}-url`} label="Endereço" hint="/eventos ou https://…" error={errors?.url?.[0]}>
							<Input id={`${id}-url`} value={url} onChange={(event) => setUrl(event.target.value)} />
						</Field>
					)}
					{type === 'page' && <ContentPicker kind="page" value={page} onChange={setPage} error={errors?.page?.[0]} />}
					{type === 'post' && <ContentPicker kind="post" value={post} onChange={setPost} error={errors?.post?.[0]} />}
					<FieldError message={formError ?? errors?.parent?.[0]} />
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" loading={saving}>
							<Save className="mr-2 size-4" />
							Salvar item
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
