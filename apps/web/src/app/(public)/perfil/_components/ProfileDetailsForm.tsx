'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Check, Loader2, Mail, MapPin, Save, UserRound, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getMediaAssetUrl } from '@/lib/media';
import { getDisplayName, getInitials, type ProfileFormValues, type ProfileUser } from './types';

interface ProfileDetailsFormProps {
	user: ProfileUser;
	onSaved: (user: ProfileUser) => void;
}

const emptyErrors: Partial<Record<keyof ProfileFormValues, string>> = {};

export function ProfileDetailsForm({ user, onSaved }: ProfileDetailsFormProps) {
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const previewUrlRef = useRef<string | null>(null);
	const [values, setValues] = useState(() => valuesFromUser(user));
	const [errors, setErrors] = useState(emptyErrors);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setValues(valuesFromUser(user));
	}, [user]);

	useEffect(() => {
		return () => {
			if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		};
	}, []);

	const initialValues = useMemo(() => valuesFromUser(user), [user]);
	const isDirty = avatarFile !== null || JSON.stringify(values) !== JSON.stringify(initialValues);
	const currentAvatarUrl = getMediaAssetUrl(user.avatar);

	const updateValue = (field: keyof ProfileFormValues, value: string) => {
		setValues((current) => ({ ...current, [field]: value }));
		if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
	};

	const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
			toast({
				title: 'Não foi possível usar essa imagem',
				description: 'Escolha um arquivo JPG, PNG ou WebP de até 5 MB.',
				variant: 'destructive',
			});
			event.target.value = '';

			return;
		}

		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		const nextPreview = URL.createObjectURL(file);
		previewUrlRef.current = nextPreview;
		setAvatarFile(file);
		setAvatarPreview(nextPreview);
	};

	const clearAvatarSelection = () => {
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		previewUrlRef.current = null;
		setAvatarPreview('');
		setAvatarFile(null);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleReset = () => {
		setValues(initialValues);
		setErrors(emptyErrors);
		clearAvatarSelection();
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors = validate(values);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setIsSaving(true);
		try {
			let avatarId: string | undefined;
			if (avatarFile) {
				const formData = new FormData();
				formData.append('file', avatarFile);
				const uploadResponse = await fetch('/api/upload?folder=avatars', {
					method: 'POST',
					body: formData,
				});
				if (!uploadResponse.ok) throw new Error('Não foi possível enviar a nova foto.');
				const upload = (await uploadResponse.json()) as { fileId: string };
				avatarId = upload.fileId;
			}

			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: values.firstName.trim(),
					last_name: values.lastName.trim(),
					title: nullable(values.title),
					location: nullable(values.location),
					description: nullable(values.description),
					...(avatarId ? { avatar: avatarId } : {}),
				}),
			});
			if (!response.ok) throw new Error('Não foi possível salvar suas informações.');
			const result = (await response.json()) as { user: ProfileUser };

			onSaved({ ...user, ...result.user, email: result.user.email || user.email });
			clearAvatarSelection();
			toast({
				title: 'Perfil atualizado',
				description: 'Suas alterações já estão salvas.',
				variant: 'success',
			});
		} catch (error) {
			toast({
				title: 'Não foi possível atualizar o perfil',
				description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<header className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8 sm:py-6">
				<h1 className="text-xl font-semibold text-slate-950 dark:text-white">Dados pessoais</h1>
				<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
					Mantenha seus dados corretos para agilizar inscrições e atendimento.
				</p>
			</header>

			<div className="space-y-8 p-6 sm:p-8">
				<section aria-labelledby="profile-photo-heading">
					<h2 id="profile-photo-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
						Foto do perfil
					</h2>
					<div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
						<Avatar className="size-24 border-4 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200 dark:border-slate-900 dark:bg-slate-800 dark:ring-slate-700">
							{(avatarPreview || currentAvatarUrl) && (
								<AvatarImage
									src={avatarPreview || currentAvatarUrl}
									alt={`Foto de ${getDisplayName(user)}`}
									className="object-cover"
								/>
							)}
							<AvatarFallback className="bg-violet-100 text-xl font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
								{getInitials(user)}
							</AvatarFallback>
						</Avatar>
						<div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									className="rounded-xl"
									onClick={() => fileInputRef.current?.click()}
								>
									<Camera />
									{avatarFile ? 'Escolher outra' : 'Alterar foto'}
								</Button>
								{avatarFile && (
									<Button type="button" variant="ghost" className="rounded-xl" onClick={clearAvatarSelection}>
										<X />
										Cancelar
									</Button>
								)}
							</div>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={handleAvatarChange}
								className="sr-only"
								aria-label="Escolher nova foto de perfil"
							/>
							<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">JPG, PNG ou WebP, até 5 MB.</p>
						</div>
					</div>
				</section>

				<div className="h-px bg-slate-100 dark:bg-slate-800" />

				<section aria-labelledby="personal-information-heading">
					<div className="mb-5">
						<h2 id="personal-information-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
							Informações da conta
						</h2>
						<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Campos com * são obrigatórios.</p>
					</div>
					<div className="grid gap-5 sm:grid-cols-2">
						<FormField id="profile-first-name" label="Nome *" error={errors.firstName} icon={UserRound}>
							<Input
								id="profile-first-name"
								value={values.firstName}
								onChange={(event) => updateValue('firstName', event.target.value)}
								placeholder="Seu nome"
								autoComplete="given-name"
								aria-invalid={Boolean(errors.firstName)}
								className="h-11 rounded-xl"
							/>
						</FormField>
						<FormField id="profile-last-name" label="Sobrenome *" error={errors.lastName} icon={UserRound}>
							<Input
								id="profile-last-name"
								value={values.lastName}
								onChange={(event) => updateValue('lastName', event.target.value)}
								placeholder="Seu sobrenome"
								autoComplete="family-name"
								aria-invalid={Boolean(errors.lastName)}
								className="h-11 rounded-xl"
							/>
						</FormField>
						<div className="sm:col-span-2">
							<FormField
								id="profile-email"
								label="E-mail da conta"
								icon={Mail}
								description="O e-mail usado para acessar sua conta é protegido contra alterações por aqui."
							>
								<Input
									id="profile-email"
									value={values.email}
									disabled
									className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950"
								/>
							</FormField>
						</div>
						<FormField
							id="profile-title"
							label="Como você se apresenta"
							icon={UserRound}
							description="Ex.: Produtora cultural, Designer, Estudante"
						>
							<Input
								id="profile-title"
								value={values.title}
								onChange={(event) => updateValue('title', event.target.value)}
								placeholder="Sua ocupação ou interesse"
								className="h-11 rounded-xl"
								maxLength={80}
							/>
						</FormField>
						<FormField
							id="profile-location"
							label="Localização"
							icon={MapPin}
							description="Cidade e estado são suficientes."
						>
							<Input
								id="profile-location"
								value={values.location}
								onChange={(event) => updateValue('location', event.target.value)}
								placeholder="São Paulo, SP"
								className="h-11 rounded-xl"
								maxLength={100}
							/>
						</FormField>
						<div className="sm:col-span-2">
							<FormField
								id="profile-description"
								label="Sobre você"
								description={`${values.description.length}/320 caracteres`}
							>
								<Textarea
									id="profile-description"
									value={values.description}
									onChange={(event) => updateValue('description', event.target.value)}
									placeholder="Conte um pouco sobre seus interesses e os eventos de que gosta."
									className="min-h-28 resize-y rounded-xl"
									maxLength={320}
								/>
							</FormField>
						</div>
					</div>
				</section>
			</div>

			<footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30 sm:flex-row sm:items-center sm:justify-between sm:px-8">
				<p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
					<Check className="size-3.5 text-emerald-600" />
					Suas informações ficam vinculadas à sua conta.
				</p>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="ghost"
						className="rounded-xl"
						disabled={!isDirty || isSaving}
						onClick={handleReset}
					>
						Descartar
					</Button>
					<Button type="submit" className="rounded-xl" disabled={!isDirty || isSaving}>
						{isSaving ? <Loader2 className="animate-spin" /> : <Save />}
						{isSaving ? 'Salvando...' : 'Salvar alterações'}
					</Button>
				</div>
			</footer>
		</form>
	);
}

function FormField({
	id,
	label,
	children,
	description,
	error,
	icon: Icon,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
	description?: string;
	error?: string;
	icon?: typeof UserRound;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
				{Icon && <Icon className="size-3.5 text-slate-400" />}
				{label}
			</Label>
			{children}
			{error ? (
				<p className="text-xs text-red-600 dark:text-red-400">{error}</p>
			) : description ? (
				<p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
			) : null}
		</div>
	);
}

function valuesFromUser(user: ProfileUser): ProfileFormValues {
	return {
		firstName: user.first_name || '',
		lastName: user.last_name || '',
		email: user.email,
		title: user.title || '',
		location: user.location || '',
		description: user.description || '',
	};
}

function validate(values: ProfileFormValues) {
	const errors: Partial<Record<keyof ProfileFormValues, string>> = {};
	if (values.firstName.trim().length < 2) errors.firstName = 'Informe pelo menos 2 caracteres.';
	if (values.lastName.trim().length < 2) errors.lastName = 'Informe pelo menos 2 caracteres.';

	return errors;
}

function nullable(value: string) {
	const trimmed = value.trim();

	return trimmed || null;
}
