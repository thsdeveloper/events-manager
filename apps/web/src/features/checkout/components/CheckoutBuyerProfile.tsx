'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Pencil, UserRound } from 'lucide-react';
import { checkoutProfileFieldsSchema, getCheckoutProfileMissingFields, type AppUser } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { CpfInput, PhoneInput } from '@/components/ui/masked-inputs';
import { ConfirmPasswordDialog, MissingEmailVerification, PhoneVerification } from '@/features/account';
import { maskCPF, maskPhone } from '@/lib/br-documents';
import { describeProblem } from '@/lib/problem';

export interface CheckoutBuyerProfileProps {
	profile: AppUser;
	canAutoConfirmPhone?: boolean;
	onSaved(profile: AppUser): void;
	onEditingChange(editing: boolean): void;
}
function valuesFromProfile(profile: AppUser) {
	return {
		first_name: profile.first_name ?? '',
		last_name: profile.last_name ?? '',
		birth_date: profile.birth_date ?? '',
		email: profile.email ?? '',
		document: profile.document ?? '',
		phone: profile.phone ?? '',
	};
}
export function CheckoutBuyerProfile({
	profile,
	canAutoConfirmPhone = false,
	onSaved,
	onEditingChange,
}: CheckoutBuyerProfileProps) {
	const [editing, setEditing] = useState(() => getCheckoutProfileMissingFields(profile).length > 0);
	const [values, setValues] = useState(() => valuesFromProfile(profile));
	const [password, setPassword] = useState('');
	const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const verified = Boolean(profile.phone_verified_at) && values.phone === profile.phone;
	const changingDocument = !profile.document_locked && values.document !== (profile.document ?? '');
	useEffect(() => {
		onEditingChange(editing);
	}, [editing, onEditingChange]);
	function update(field: keyof typeof values, value: string) {
		setValues((current) => ({ ...current, [field]: value }));
		setErrors((current) => ({ ...current, [field]: '' }));
		setError(null);
	}
	function closePasswordDialog() {
		setPasswordDialogOpen(false);
		setPassword('');
		setErrors((current) => ({ ...current, current_password: '' }));
		setError(null);
	}
	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		void save();
	}
	async function save(currentPassword?: string) {
		if (saving) return;
		const parsed = checkoutProfileFieldsSchema.safeParse(values);
		if (!parsed.success) {
			setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));

			return;
		}
		if (!verified) {
			setError('Confirme seu telefone para continuar.');

			return;
		}
		if (!profile.email) {
			setError('Confirme seu e-mail para continuar.');

			return;
		}
		if (changingDocument && currentPassword === undefined) {
			setErrors({});
			setError(null);
			setPasswordDialogOpen(true);

			return;
		}
		if (currentPassword === '') {
			setErrors({ current_password: 'Confirme sua senha atual para alterar o CPF.' });

			return;
		}
		setSaving(true);
		setError(null);
		setErrors({});
		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: parsed.data.first_name,
					last_name: parsed.data.last_name,
					birth_date: parsed.data.birth_date,
					...(parsed.data.document !== profile.document ? { document: parsed.data.document } : {}),
					...(parsed.data.phone !== profile.phone ? { phone: parsed.data.phone } : {}),
					...(currentPassword !== undefined ? { current_password: currentPassword } : {}),
				}),
			});
			const result = await response.json();
			if (!response.ok) {
				const message = describeProblem(result, 'Não foi possível salvar seus dados. Tente novamente.');
				if (result.context?.field === 'current_password') setPasswordDialogOpen(true);
				else if (result.context?.field) closePasswordDialog();
				if (result.context?.field) setErrors({ [result.context.field]: message });
				throw new Error(message);
			}
			const updated = { ...profile, ...result.user, email: result.user.email || profile.email };
			onSaved(updated);
			closePasswordDialog();
			if (getCheckoutProfileMissingFields(updated).length === 0) setEditing(false);
		} catch (cause) {
			setError(
				cause instanceof Error && !(cause instanceof TypeError)
					? cause.message
					: 'Não foi possível salvar seus dados. Verifique sua conexão e tente novamente.',
			);
		} finally {
			setSaving(false);
		}
	}
	if (!editing)
		return (
			<section aria-label="Dados do comprador" className="rounded-xl border bg-muted/30 p-4 sm:p-5">
				<div className="mb-4 flex items-center justify-between gap-3">
					<p className="flex items-center gap-2 text-sm font-medium">
						<CheckCircle2 className="size-4 text-primary" />
						Cadastro pronto para comprar
					</p>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => {
							setValues(valuesFromProfile(profile));
							setEditing(true);
						}}
					>
						<Pencil className="size-3.5" />
						Editar dados
					</Button>
				</div>
				<dl className="grid gap-3 text-sm sm:grid-cols-2">
					{[
						['Nome completo', `${profile.first_name} ${profile.last_name}`],
						['E-mail', profile.email],
						['Data de nascimento', profile.birth_date?.split('-').reverse().join('/')],
						['CPF', maskCPF(profile.document ?? '')],
						['Telefone', maskPhone(profile.phone ?? '')],
					].map(([label, value]) => (
						<div key={label} className="min-w-0">
							<dt className="text-xs text-muted-foreground">{label}</dt>
							<dd className="mt-1 break-words">{value}</dd>
						</div>
					))}
				</dl>
				<p className="mt-3 text-xs text-muted-foreground">
					Telefone confirmado por SMS. Os participantes são informados abaixo.
				</p>
			</section>
		);

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			aria-label="Completar dados do comprador"
			className="space-y-5 rounded-xl border border-primary/20 bg-primary/[0.025] p-4 sm:p-5"
		>
			<div>
				<h3 className="flex items-center gap-2 font-semibold">
					<UserRound className="size-4 text-primary" />
					Complete seus dados para comprar
				</h3>
				<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
					Atualize seu cadastro aqui mesmo. Sua seleção de ingressos e os dados dos participantes serão mantidos.
				</p>
			</div>
			<fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
				{(['first_name', 'last_name'] as const).map((field, index) => (
					<div key={field} className="space-y-2">
						<Label htmlFor={`checkout-${field}`}>{index === 0 ? 'Nome *' : 'Sobrenome *'}</Label>
						<Input
							id={`checkout-${field}`}
							autoComplete={index === 0 ? 'given-name' : 'family-name'}
							value={values[field]}
							onChange={(event) => update(field, event.target.value)}
							aria-invalid={Boolean(errors[field])}
						/>
						{errors[field] ? (
							<p role="alert" className="text-xs text-destructive">
								{errors[field]}
							</p>
						) : null}
					</div>
				))}
				<div className="space-y-2">
					<Label htmlFor="checkout-birth-date">Data de nascimento *</Label>
					<DateInput
						id="checkout-birth-date"
						value={values.birth_date}
						onChange={(value) => update('birth_date', value)}
						aria-invalid={Boolean(errors.birth_date)}
					/>
					{errors.birth_date ? (
						<p role="alert" className="text-xs text-destructive">
							{errors.birth_date}
						</p>
					) : null}
				</div>
				<div className="space-y-2">
					<Label htmlFor="checkout-document">CPF *</Label>
					<CpfInput
						id="checkout-document"
						value={values.document}
						onChange={(value) => update('document', value)}
						readOnly={profile.document_locked}
					/>
					{profile.document_locked ? (
						<p className="text-xs text-muted-foreground">
							CPF vinculado às suas compras. Para corrigir, fale com o suporte.
						</p>
					) : null}
					{errors.document ? (
						<p role="alert" className="text-xs text-destructive">
							{errors.document}
						</p>
					) : null}
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="checkout-email">E-mail *</Label>
					<Input
						id="checkout-email"
						type="email"
						autoComplete="email"
						value={values.email}
						readOnly={Boolean(profile.email)}
						onChange={(event) => update('email', event.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						Usaremos o e-mail da sua conta para enviar a confirmação e os ingressos.
					</p>
					{!profile.email ? (
						<MissingEmailVerification
							email={values.email}
							onVerified={(updated) => {
								onSaved({ ...profile, ...updated });
								setValues((current) => ({ ...current, email: updated.email ?? current.email }));
							}}
						/>
					) : null}
					{errors.email ? (
						<p role="alert" className="text-xs text-destructive">
							{errors.email}
						</p>
					) : null}
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="checkout-phone">Telefone *</Label>
					<div className="flex flex-wrap items-start gap-3">
						<div className="min-w-0 flex-1 basis-48">
							<PhoneInput id="checkout-phone" value={values.phone} onChange={(value) => update('phone', value)} />
						</div>
						<PhoneVerification
							phone={values.phone}
							verified={verified}
							canAutoConfirm={canAutoConfirmPhone}
							onVerified={(verifiedProfile) =>
								onSaved({ ...profile, ...verifiedProfile, email: verifiedProfile.email || profile.email })
							}
						/>
					</div>
					{canAutoConfirmPhone ? (
						<p className="text-xs text-muted-foreground">
							Ambiente de desenvolvimento: confirme o telefone sem envio de SMS.
						</p>
					) : (
						<p className="text-xs text-muted-foreground">
							Enviaremos um código por SMS para confirmar que este número é seu.
						</p>
					)}
				</div>
			</fieldset>
			{error && !passwordDialogOpen ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
			<div className="flex flex-wrap items-center gap-3">
				<Button type="submit" disabled={saving || !verified || !profile.email}>
					{saving ? 'Salvando…' : 'Salvar dados'}
				</Button>
				{!verified ? (
					<p className="text-xs text-muted-foreground">Confirme o telefone para salvar e continuar.</p>
				) : null}
				{getCheckoutProfileMissingFields(profile).length === 0 ? (
					<Button
						type="button"
						variant="ghost"
						disabled={saving}
						onClick={() => {
							setEditing(false);
							setError(null);
							setPassword('');
						}}
					>
						Cancelar edição
					</Button>
				) : null}
			</div>
			<ConfirmPasswordDialog
				open={passwordDialogOpen}
				password={password}
				error={errors.current_password || error || undefined}
				isSaving={saving}
				onPasswordChange={(value) => {
					setPassword(value);
					setErrors((current) => ({ ...current, current_password: '' }));
					setError(null);
				}}
				onCancel={closePasswordDialog}
				onConfirm={() => void save(password)}
			/>
		</form>
	);
}
