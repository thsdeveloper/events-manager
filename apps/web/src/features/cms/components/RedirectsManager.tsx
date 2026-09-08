'use client';

import { cmsRedirectInputSchema } from '@events-manager/contracts';
import { ArrowRight, Pencil, Plus, Route, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { formatDateTime } from '../lib/dates';
import { validateWith } from '../lib/validation';
import type { CmsRedirectRow } from '../types';
import { Field, FieldError } from './FormPrimitives';

interface RedirectSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	redirect: CmsRedirectRow | null;
	onSaved: () => Promise<void>;
}

function RedirectSheet({ open, onOpenChange, redirect, onSaved }: RedirectSheetProps) {
	const id = useId();
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [code, setCode] = useState<'301' | '302'>('301');
	const [note, setNote] = useState('');
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setFrom(redirect?.url_from ?? '');
		setTo(redirect?.url_to ?? '');
		setCode(redirect?.response_code ?? '301');
		setNote(redirect?.note ?? '');
		setErrors(null);
		setFormError(null);
	}, [open, redirect]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setFormError(null);
		const validation = validateWith(cmsRedirectInputSchema, {
			url_from: from,
			url_to: to,
			response_code: code,
			note: note || null,
		});
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			if (redirect) {
				await cmsRequest(`/redirects/${redirect.id}`, { method: 'PATCH', body: validation.data });
			} else {
				await cmsRequest('/redirects', { method: 'POST', body: validation.data });
			}
			await onSaved();
			onOpenChange(false);
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
				<SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
					<SheetTitle>{redirect ? 'Editar redirecionamento' : 'Novo redirecionamento'}</SheetTitle>
					<SheetDescription>Quem acessar a origem é levado ao destino com o código escolhido.</SheetDescription>
				</SheetHeader>
				<form id={id} onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto p-6">
					<Field
						id={`${id}-from`}
						label="Origem"
						hint="Caminho antigo, relativo ao site (ex.: /antiga-pagina)."
						error={errors?.url_from?.[0]}
					>
						<Input id={`${id}-from`} value={from} onChange={(event) => setFrom(event.target.value)} />
					</Field>
					<Field id={`${id}-to`} label="Destino" hint="Caminho interno ou URL completa." error={errors?.url_to?.[0]}>
						<Input id={`${id}-to`} value={to} onChange={(event) => setTo(event.target.value)} />
					</Field>
					<div className="space-y-1.5">
						<Label htmlFor={`${id}-code`}>Tipo</Label>
						<Select value={code} onValueChange={(value) => setCode(value as '301' | '302')}>
							<SelectTrigger id={`${id}-code`}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="301">301 — permanente (buscadores atualizam o índice)</SelectItem>
								<SelectItem value="302">302 — temporário</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Field
						id={`${id}-note`}
						label="Nota"
						hint="Só para a equipe: por que este redirecionamento existe."
						error={errors?.note?.[0]}
					>
						<Input id={`${id}-note`} value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
					</Field>
					<FieldError message={formError} />
				</form>
				<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="submit" form={id} loading={saving}>
						<Save className="mr-2 size-4" />
						Salvar
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

export function RedirectsManager({ redirects }: { redirects: CmsRedirectRow[] }) {
	const router = useRouter();
	const { toast } = useToast();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editing, setEditing] = useState<CmsRedirectRow | null>(null);
	const [toDelete, setToDelete] = useState<CmsRedirectRow | null>(null);

	async function afterSave() {
		await revalidateCmsContent();
		toast({ title: editing ? 'Redirecionamento atualizado' : 'Redirecionamento criado', variant: 'success' });
		router.refresh();
	}

	async function confirmDelete() {
		if (!toDelete) return;
		try {
			await cmsRequest(`/redirects/${toDelete.id}`, { method: 'DELETE' });
			await revalidateCmsContent();
			toast({ title: 'Redirecionamento excluído', variant: 'success' });
			router.refresh();
		} catch (failure) {
			toast({ title: 'Não foi possível excluir', description: describeError(failure), variant: 'destructive' });
		} finally {
			setToDelete(null);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-slate-600">
					{redirects.length} {redirects.length === 1 ? 'redirecionamento ativo' : 'redirecionamentos ativos'}.
				</p>
				<Button
					onClick={() => {
						setEditing(null);
						setSheetOpen(true);
					}}
				>
					<Plus className="mr-2 size-4" />
					Novo redirecionamento
				</Button>
			</div>

			{redirects.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
						<Route className="size-6" />
					</div>
					<p className="font-medium text-slate-950">Nenhum redirecionamento</p>
					<p className="text-sm text-slate-500">
						Ao trocar o permalink de uma página, crie um daqui para não perder visitas.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
					<table className="w-full text-left text-sm">
						<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-5 py-3">Origem</th>
								<th className="px-5 py-3">Destino</th>
								<th className="px-5 py-3">Tipo</th>
								<th className="px-5 py-3">Nota</th>
								<th className="px-5 py-3">Atualizado</th>
								<th className="px-5 py-3 text-right">
									<span className="sr-only">Ações</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{redirects.map((redirect) => (
								<tr key={redirect.id} className="hover:bg-slate-50">
									<td className="px-5 py-3 font-mono text-xs text-slate-800">{redirect.url_from}</td>
									<td className="px-5 py-3 font-mono text-xs text-slate-800">
										<span className="inline-flex items-center gap-1">
											<ArrowRight className="size-3 text-slate-400" />
											{redirect.url_to}
										</span>
									</td>
									<td className="px-5 py-3">
										<span
											className={`rounded-full px-2 py-0.5 text-xs font-semibold ${redirect.response_code === '301' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
										>
											{redirect.response_code}
										</span>
									</td>
									<td className="max-w-xs truncate px-5 py-3 text-slate-600">{redirect.note ?? '—'}</td>
									<td className="px-5 py-3 text-slate-600">
										{formatDateTime(redirect.date_updated ?? redirect.date_created)}
									</td>
									<td className="px-5 py-3 text-right">
										<Button
											size="icon"
											variant="ghost"
											onClick={() => {
												setEditing(redirect);
												setSheetOpen(true);
											}}
											aria-label={`Editar redirecionamento de ${redirect.url_from}`}
										>
											<Pencil className="size-4" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => setToDelete(redirect)}
											aria-label={`Excluir redirecionamento de ${redirect.url_from}`}
											className="text-red-600 hover:bg-red-50 hover:text-red-700"
										>
											<Trash2 className="size-4" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<RedirectSheet open={sheetOpen} onOpenChange={setSheetOpen} redirect={editing} onSaved={afterSave} />

			<AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir o redirecionamento de {toDelete?.url_from}?</AlertDialogTitle>
						<AlertDialogDescription>
							Quem acessar a origem passará a ver a página de não encontrado.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
