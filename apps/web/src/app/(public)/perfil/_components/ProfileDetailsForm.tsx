'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Check, IdCard, KeyRound, Mail, MapPin, Save, UserRound } from 'lucide-react';

import { birthDateSchema, MIN_REGISTRATION_AGE } from '@events-manager/contracts';
import { LocationSelect } from '@/components/location/LocationSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { CpfInput } from '@/components/ui/masked-inputs';
import { isValidCPF } from '@/lib/br-documents';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type ProfileFormValues, type ProfileUser } from './types';

interface ProfileDetailsFormProps {
	user: ProfileUser;
	onSaved: (user: ProfileUser) => void;
}

type FieldName = keyof ProfileFormValues | 'currentPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyErrors: FieldErrors = {};

/** Nomes de campo que a API usa no `context.field` de um problema, por campo do formulário. */
const apiFieldNames: Record<string, FieldName> = {
	document: 'document',
	current_password: 'currentPassword',
	birth_date: 'birthDate',
	first_name: 'firstName',
	last_name: 'lastName',
};

export function ProfileDetailsForm({ user, onSaved }: ProfileDetailsFormProps) {
	const { toast } = useToast();
	const [values, setValues] = useState(() => valuesFromUser(user));
	// Fora de `values`: é credencial, não dado do perfil, e não conta como alteração.
	const [currentPassword, setCurrentPassword] = useState('');
	const [errors, setErrors] = useState(emptyErrors);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setValues(valuesFromUser(user));
	}, [user]);

	const initialValues = useMemo(() => valuesFromUser(user), [user]);
	const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
	// Política do CPF: trocá-lo exige a senha atual, e depois de atividade paga só
	// o suporte altera (a API decide; `document_locked` espelha a regra).
	const isDocumentLocked = Boolean(user.document_locked);
	const isDocumentChanging = !isDocumentLocked && values.document !== initialValues.document;

	const updateValue = <Field extends keyof ProfileFormValues>(field: Field, value: ProfileFormValues[Field]) => {
		setValues((current) => ({ ...current, [field]: value }));
		if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
	};

	const handleReset = () => {
		setValues(initialValues);
		setCurrentPassword('');
		setErrors(emptyErrors);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextErrors = validate(values);
		if (isDocumentChanging && !currentPassword) {
			nextErrors.currentPassword = 'Confirme sua senha atual para alterar o CPF.';
		}
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
					birth_date: values.birthDate,
					document: values.document || null,
					city_id: values.cityId,
					description: nullable(values.description),
					...(isDocumentChanging ? { current_password: currentPassword } : {}),
				}),
			});
			if (!response.ok) {
				const problem = (await response.json().catch(() => null)) as {
					title?: string;
					detail?: string;
					context?: { field?: string };
				} | null;
				// A problem on a specific field (CPF já usado, senha incorreta) is shown
				// on the field itself: a toast alone vanishes before the person finds
				// what to fix.
				const field = problem?.context?.field ? apiFieldNames[problem.context.field] : undefined;
				if (field && problem?.detail) {
					setErrors((current) => ({ ...current, [field]: problem.detail }));
				}
				throw new Error(problem?.detail || 'Não foi possível salvar suas informações.');
			}
			const result = (await response.json()) as { user: ProfileUser };

			setCurrentPassword('');
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
							id="profile-birth-date"
							label="Data de nascimento *"
							icon={CalendarDays}
							error={errors.birthDate}
							description="É preciso ter pelo menos 13 anos."
						>
							<DateInput
								id="profile-birth-date"
								value={values.birthDate}
								onChange={(birthDate) => updateValue('birthDate', birthDate)}
								max={latestAllowedBirthDate()}
								aria-invalid={Boolean(errors.birthDate)}
								className="h-11 rounded-lg"
							/>
						</FormField>
						<FormField
							id="profile-document"
							label="CPF"
							icon={IdCard}
							error={errors.document}
							description={
								isDocumentLocked
									? 'Este CPF já consta em ingressos ou pagamentos. Para alterar o CPF, fale com o suporte.'
									: 'Usado para identificar você em ingressos e comprovantes.'
							}
						>
							<CpfInput
								id="profile-document"
								value={values.document}
								onChange={(digits) => updateValue('document', digits)}
								showError={false}
								autoComplete="off"
								disabled={isDocumentLocked}
								aria-invalid={Boolean(errors.document)}
								className={isDocumentLocked ? 'h-11 rounded-lg bg-slate-50 dark:bg-slate-950' : 'h-11 rounded-lg'}
							/>
						</FormField>
						{isDocumentChanging && (
							<div className="sm:col-span-2">
								<FormField
									id="profile-current-password"
									label="Senha atual"
									icon={KeyRound}
									error={errors.currentPassword}
									description="Confirme sua senha para alterar o CPF. Você receberá um e-mail avisando da alteração."
								>
									<Input
										id="profile-current-password"
										type="password"
										value={currentPassword}
										onChange={(event) => {
											setCurrentPassword(event.target.value);
											if (errors.currentPassword) setErrors((current) => ({ ...current, currentPassword: undefined }));
										}}
										autoComplete="current-password"
										aria-invalid={Boolean(errors.currentPassword)}
										className="h-11 rounded-lg"
									/>
								</FormField>
							</div>
						)}
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

/** Última data que ainda satisfaz a idade mínima; o calendário abre nela. */
function latestAllowedBirthDate() {
	const date = new Date();
	date.setFullYear(date.getFullYear() - MIN_REGISTRATION_AGE);

	return date.toISOString().slice(0, 10);
}

function valuesFromUser(user: ProfileUser): ProfileFormValues {
	return {
		firstName: user.first_name || '',
		lastName: user.last_name || '',
		email: user.email,
		birthDate: user.birth_date || '',
		document: user.document || '',
		cityId: user.city_id ?? null,
		description: user.description || '',
	};
}

function validate(values: ProfileFormValues) {
	const errors: FieldErrors = {};
	if (values.firstName.trim().length < 2) errors.firstName = 'Informe pelo menos 2 caracteres.';
	if (values.lastName.trim().length < 2) errors.lastName = 'Informe pelo menos 2 caracteres.';
	if (values.document && !isValidCPF(values.document)) errors.document = 'Informe um CPF válido.';
	if (!values.birthDate) errors.birthDate = 'Informe sua data de nascimento.';
	else {
		const birthDate = birthDateSchema.safeParse(values.birthDate);
		if (!birthDate.success) errors.birthDate = birthDate.error.issues[0]?.message;
	}

	return errors;
}

function nullable(value: string) {
	const trimmed = value.trim();

	return trimmed || null;
}
