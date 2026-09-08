'use client';

import { cmsNavigationInputSchema } from '@events-manager/contracts';
import { ListTree, Lock, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { validateWith } from '../lib/validation';
import type { CmsNavigationRow } from '../types';
import { Field, FieldError } from './FormPrimitives';

export const PROTECTED_NAVIGATIONS: Record<string, string> = { main: 'Navegação principal', footer: 'Rodapé' };

export function NavigationsList({ navigations }: { navigations: CmsNavigationRow[] }) {
	const router = useRouter();
	const id = useId();
	const [open, setOpen] = useState(false);
	const [slug, setSlug] = useState('');
	const [title, setTitle] = useState('');
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setFormError(null);
		const validation = validateWith(cmsNavigationInputSchema, { id: slug, title, is_active: true });
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setSaving(true);
		try {
			await cmsRequest('/navigation', { method: 'POST', body: validation.data });
			await revalidateCmsContent();
			setOpen(false);
			router.push(`/super-admin/conteudo/menus/${validation.data.id}`);
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button onClick={() => setOpen(true)}>
					<Plus className="mr-2 size-4" />
					Novo menu
				</Button>
			</div>
			<ul className="grid gap-3 sm:grid-cols-2">
				{navigations.map((navigation) => {
					const protectedLabel = PROTECTED_NAVIGATIONS[navigation.id];

					return (
						<li key={navigation.id}>
							<Link
								href={`/super-admin/conteudo/menus/${navigation.id}`}
								className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-300"
							>
								<span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
									<ListTree className="size-5" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-slate-950">{protectedLabel ?? navigation.title}</span>
									<span className="block text-xs text-slate-500">
										id: {navigation.id} · {navigation.is_active ? 'ativo' : 'desativado'}
									</span>
								</span>
								{protectedLabel && (
									<span
										className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
										title="Menu do sistema: não pode ser excluído"
									>
										<Lock className="size-3" /> sistema
									</span>
								)}
							</Link>
						</li>
					);
				})}
			</ul>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Novo menu</DialogTitle>
						<DialogDescription>Menus extras podem ser usados pelo tema em áreas específicas.</DialogDescription>
					</DialogHeader>
					<form onSubmit={submit} className="space-y-4">
						<Field id={`${id}-title`} label="Nome" error={errors?.title?.[0]}>
							<Input
								id={`${id}-title`}
								value={title}
								maxLength={80}
								autoFocus
								onChange={(event) => setTitle(event.target.value)}
							/>
						</Field>
						<Field
							id={`${id}-id`}
							label="Identificador"
							hint="Letras minúsculas, números, hífen ou sublinhado (ex.: rodape-legal)."
							error={errors?.id?.[0]}
						>
							<Input id={`${id}-id`} value={slug} maxLength={40} onChange={(event) => setSlug(event.target.value)} />
						</Field>
						<FieldError message={formError} />
						<div className="flex justify-end gap-2">
							<Button type="button" variant="outline" onClick={() => setOpen(false)}>
								Cancelar
							</Button>
							<Button type="submit" loading={saving}>
								Criar menu
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
