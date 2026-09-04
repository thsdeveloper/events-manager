'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Mail, MapPin, Save, UserRound } from 'lucide-react';

import { LocationSelect } from '@/components/location/LocationSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type ProfileFormValues, type ProfileUser } from './types';

interface ProfileDetailsFormProps {
	user: ProfileUser;
	onSaved: (user: ProfileUser) => void;
}

const emptyErrors: Partial<Record<keyof ProfileFormValues, string>> = {};

export function ProfileDetailsForm({ user, onSaved }: ProfileDetailsFormProps) {
	const { toast } = useToast();
	const [values, setValues] = useState(() => valuesFromUser(user));
	const [errors, setErrors] = useState(emptyErrors);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setValues(valuesFromUser(user));
	}, [user]);

	const initialValues = useMemo(() => valuesFromUser(user), [user]);
	const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

	const updateValue = <Field extends keyof ProfileFormValues>(field: Field, value: ProfileFormValues[Field]) => {
		setValues((current) => ({ ...current, [field]: value }));
		if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
	};

	const handleReset = () => {
		setValues(initialValues);
		setErrors(emptyErrors);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors = validate(values);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setIsSaving(true);
		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: values.firstName.trim(),
					last_name: values.lastName.trim(),
					title: nullable(values.title),
					city_id: values.cityId,
					description: nullable(values.description),
				}),
			});
			if (!response.ok) throw new Error('Não foi possível salvar suas informações.');
			const result = (await response.json()) as { user: ProfileUser };

			onSaved({ ...user, ...result.user, email: result.user.email || user.email });
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
			className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
		>
			<header className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8 sm:py-6">
				<h1 className="text-xl font-semibold text-slate-950 dark:text-white">Dados pessoais</h1>
				<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
					Mantenha seus dados corretos para agilizar inscrições e atendimento.
				</p>
			</header>

			<div className="space-y-8 p-6 sm:p-8">
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
								className="h-11 rounded-lg"
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
								className="h-11 rounded-lg"
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
									className="h-11 rounded-lg bg-slate-50 dark:bg-slate-950"
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
								className="h-11 rounded-lg"
								maxLength={80}
							/>
						</FormField>
						<div className="sm:col-span-2">
							<FormField
								id="profile-location-state"
								label="Localização"
								icon={MapPin}
								description="Escolha o estado e depois a cidade. Você pode digitar para buscar."
							>
								<LocationSelect
									id="profile-location-state"
									value={values.cityId}
									initialCity={user.city ?? null}
									onChange={(city) => updateValue('cityId', city?.id ?? null)}
								/>
							</FormField>
						</div>
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
									className="min-h-28 resize-y rounded-lg"
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
						className="rounded-lg"
						disabled={!isDirty || isSaving}
						onClick={handleReset}
					>
						Descartar
					</Button>
					<Button type="submit" className="rounded-lg" loading={isSaving} disabled={!isDirty}>
						<Save />
						Salvar alterações
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
		cityId: user.city_id ?? null,
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
