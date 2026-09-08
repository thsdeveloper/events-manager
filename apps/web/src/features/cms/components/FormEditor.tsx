'use client';

import { cmsFormInputSchema } from '@events-manager/contracts';
import { Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type ReactNode } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { validateWith } from '../lib/validation';
import type { CmsFormDetail } from '../types';
import { FormFieldsBuilder, formFieldFromRow, formFieldsToPayload, type FormFieldState } from './FormFieldsBuilder';
import { Field, SectionCard } from './FormPrimitives';

interface FormEditorProps {
	form: CmsFormDetail | null;
	/** Aba "Respostas", renderizada no servidor. */
	submissions?: ReactNode;
	initialTab?: 'campos' | 'respostas';
}

export function FormEditor({ form, submissions, initialTab = 'campos' }: FormEditorProps) {
	const router = useRouter();
	const { toast } = useToast();
	const id = useId();
	const [title, setTitle] = useState(form?.title ?? '');
	const [submitLabel, setSubmitLabel] = useState(form?.submit_label ?? '');
	const [successMessage, setSuccessMessage] = useState(form?.success_message ?? '');
	const [onSuccess, setOnSuccess] = useState<'message' | 'redirect'>(form?.on_success ?? 'message');
	const [redirectUrl, setRedirectUrl] = useState(form?.success_redirect_url ?? '');
	const [isActive, setIsActive] = useState(form?.is_active ?? true);
	const [fields, setFields] = useState<FormFieldState[]>(() => (form?.fields ?? []).map(formFieldFromRow));
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	async function save() {
		setFormError(null);
		const validation = validateWith(cmsFormInputSchema, {
			title,
			submit_label: submitLabel || null,
			success_message: successMessage || null,
			on_success: onSuccess,
			success_redirect_url: onSuccess === 'redirect' ? redirectUrl || null : null,
			is_active: isActive,
			emails: form?.emails ?? null,
			fields: formFieldsToPayload(fields),
		});
		if (validation.errors) {
			setErrors(validation.errors);
			setFormError('Revise os campos destacados.');

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			if (form) {
				await cmsRequest(`/forms/${form.id}`, { method: 'PATCH', body: validation.data });
				await revalidateCmsContent();
				toast({ title: 'Formulário salvo', variant: 'success' });
				router.refresh();
			} else {
				const created = await cmsRequest<CmsFormDetail>('/forms', { method: 'POST', body: validation.data });
				await revalidateCmsContent();
				toast({ title: 'Formulário criado', variant: 'success' });
				router.push(`/super-admin/conteudo/formularios/${created.id}`);
			}
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		if (!form) return;
		try {
			await cmsRequest(`/forms/${form.id}`, { method: 'DELETE' });
			await revalidateCmsContent();
			toast({ title: 'Formulário excluído', variant: 'success' });
			router.push('/super-admin/conteudo/formularios');
			router.refresh();
		} catch (failure) {
			toast({ title: 'Não foi possível excluir', description: describeError(failure), variant: 'destructive' });
		} finally {
			setDeleteOpen(false);
		}
	}

	return (
		<div className="space-y-6">
			<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-violet-700">Formulários</p>
					<h1 className="mt-1 truncate text-3xl font-bold tracking-tight">{form ? form.title : 'Novo formulário'}</h1>
					<p className="mt-2 text-sm text-slate-600">Use o bloco “Formulário” em uma página para exibi-lo no site.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{form && (
						<Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)}>
							<Trash2 className="mr-2 size-4" />
							Excluir
						</Button>
					)}
					<Button onClick={save} loading={saving}>
						<Save className="mr-2 size-4" />
						Salvar
					</Button>
				</div>
			</header>

			{formError && (
				<p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{formError}
				</p>
			)}

			<Tabs defaultValue={form ? initialTab : 'campos'}>
				<TabsList>
					<TabsTrigger value="campos">Campos</TabsTrigger>
					<TabsTrigger value="respostas" disabled={!form}>
						Respostas
					</TabsTrigger>
				</TabsList>
				<TabsContent value="campos" className="mt-4 space-y-6">
					<SectionCard title="Configurações">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id={`${id}-title`} label="Nome do formulário" error={errors?.title?.[0]}>
								<Input
									id={`${id}-title`}
									value={title}
									maxLength={120}
									onChange={(event) => setTitle(event.target.value)}
								/>
							</Field>
							<Field
								id={`${id}-submit`}
								label="Rótulo do botão"
								hint='Vazio usa "Enviar".'
								error={errors?.submit_label?.[0]}
							>
								<Input
									id={`${id}-submit`}
									value={submitLabel}
									maxLength={40}
									onChange={(event) => setSubmitLabel(event.target.value)}
								/>
							</Field>
							<div className="space-y-1.5">
								<Label htmlFor={`${id}-on-success`}>Ao enviar</Label>
								<Select value={onSuccess} onValueChange={(value) => setOnSuccess(value as 'message' | 'redirect')}>
									<SelectTrigger id={`${id}-on-success`}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="message">Mostrar mensagem</SelectItem>
										<SelectItem value="redirect">Redirecionar para uma URL</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{onSuccess === 'redirect' ? (
								<Field id={`${id}-redirect`} label="URL de destino" error={errors?.success_redirect_url?.[0]}>
									<Input
										id={`${id}-redirect`}
										value={redirectUrl}
										placeholder="/obrigado ou https://…"
										onChange={(event) => setRedirectUrl(event.target.value)}
									/>
								</Field>
							) : (
								<Field id={`${id}-message`} label="Mensagem de sucesso" error={errors?.success_message?.[0]}>
									<Textarea
										id={`${id}-message`}
										rows={2}
										maxLength={500}
										value={successMessage}
										onChange={(event) => setSuccessMessage(event.target.value)}
									/>
								</Field>
							)}
						</div>
						<label className="flex items-center gap-3 text-sm">
							<Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Formulário ativo" />
							<span>
								<span className="font-medium">{isActive ? 'Ativo' : 'Inativo'}</span>
								<span className="block text-xs text-slate-500">Um formulário inativo não aceita envios no site.</span>
							</span>
						</label>
					</SectionCard>
					<SectionCard
						title="Campos"
						description="A ordem aqui é a ordem no site. Campos existentes mantêm suas respostas."
					>
						<FormFieldsBuilder value={fields} onChange={setFields} errors={errors} />
					</SectionCard>
				</TabsContent>
				<TabsContent value="respostas" className="mt-4">
					{submissions}
				</TabsContent>
			</Tabs>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{form?.title}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>
							As respostas recebidas também são apagadas e os blocos que usam este formulário ficam vazios.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
