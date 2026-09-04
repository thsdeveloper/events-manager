'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthLink } from '@/components/auth/AuthLink';
import { AuthField, registerField } from '@/components/design-system/molecules/AuthField';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import { MIN_REGISTRATION_AGE } from '@events-manager/contracts';
import { httpClient } from '@/lib/http-client';
import { safeInternalRedirect } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterValues } from '@/lib/validation/auth';

interface RegisterResponse {
	confirmationRequired: boolean;
	redirect?: string;
}

/** Última data de nascimento que ainda satisfaz a idade mínima, para o seletor de data. */
function latestAllowedBirthDate() {
	const date = new Date();
	date.setFullYear(date.getFullYear() - MIN_REGISTRATION_AGE);

	return date.toISOString().slice(0, 10);
}

export default function RegisterPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: { firstName: '', lastName: '', email: '', birthDate: '', password: '', confirmPassword: '' },
		// Validate once the field has been left, then live as it is corrected —
		// no errors are shown while the user is still filling a field in.
		mode: 'onTouched',
	});

	const onSubmit = async ({ confirmPassword: _confirmPassword, birthDate, ...values }: RegisterValues) => {
		try {
			const data = await httpClient.post<RegisterResponse>('/api/auth/register', {
				...values,
				birth_date: birthDate,
			});
			const destination = data.confirmationRequired
				? `/confirmar-email?email=${encodeURIComponent(values.email)}`
				: safeInternalRedirect(data.redirect, '/perfil');
			router.replace(destination);
			router.refresh();
		} catch {
			// Já exibido pelo toast de erro do httpClient.
		}
	};

	const passwordAction = (visible: boolean, toggle: () => void, label: string) => (
		<Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={visible} onClick={toggle}>
			{visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
		</Button>
	);

	return (
		<AuthLayout title="Criar conta" subtitle="Preencha seus dados para começar">
			<form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
				<div className="grid gap-4 sm:grid-cols-2">
					<AuthField
						id="firstName"
						label="Nome"
						icon={<User className="size-5" />}
						autoComplete="given-name"
						placeholder="João"
						error={errors.firstName?.message}
						{...registerField(register('firstName'))}
					/>
					<AuthField
						id="lastName"
						label="Sobrenome"
						icon={<User className="size-5" />}
						autoComplete="family-name"
						placeholder="Silva"
						error={errors.lastName?.message}
						{...registerField(register('lastName'))}
					/>
				</div>

				<AuthField
					id="email"
					label="E-mail"
					icon={<Mail className="size-5" />}
					type="email"
					autoComplete="email"
					placeholder="seu@email.com"
					error={errors.email?.message}
					{...registerField(register('email'))}
				/>

				<div className="space-y-2">
					<Label htmlFor="birthDate">Data de nascimento</Label>
					<div className="relative">
						<span
							aria-hidden="true"
							className={cn(
								'pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4',
								errors.birthDate ? 'text-destructive' : 'text-muted-foreground',
							)}
						>
							<CalendarDays className="size-5" />
						</span>
						<Controller
							control={control}
							name="birthDate"
							render={({ field }) => (
								<DateInput
									id="birthDate"
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
									max={latestAllowedBirthDate()}
									aria-invalid={errors.birthDate ? true : undefined}
									aria-describedby={errors.birthDate ? 'birthDate-error' : 'birthDate-hint'}
									className={cn('h-12 rounded-lg pl-11', errors.birthDate && 'border-destructive focus-visible:ring-destructive')}
								/>
							)}
						/>
					</div>
					{errors.birthDate ? (
						<p id="birthDate-error" role="alert" className="text-xs font-medium text-destructive">
							{errors.birthDate.message}
						</p>
					) : (
						<p id="birthDate-hint" className="text-xs text-muted-foreground">
							Você precisa ter pelo menos {MIN_REGISTRATION_AGE} anos para criar uma conta.
						</p>
					)}
				</div>

				<AuthField
					id="password"
					label="Senha"
					icon={<Lock className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					placeholder="••••••••"
					hint="Pelo menos 8 caracteres, com letras, números e um caractere especial."
					error={errors.password?.message}
					{...registerField(register('password'))}
					endAction={passwordAction(
						showPassword,
						() => setShowPassword((visible) => !visible),
						showPassword ? 'Ocultar senha' : 'Mostrar senha',
					)}
				/>

				<AuthField
					id="confirmPassword"
					label="Confirmar senha"
					icon={<Lock className="size-5" />}
					type={showConfirmPassword ? 'text' : 'password'}
					autoComplete="new-password"
					placeholder="••••••••"
					error={errors.confirmPassword?.message}
					{...registerField(register('confirmPassword'))}
					endAction={passwordAction(
						showConfirmPassword,
						() => setShowConfirmPassword((visible) => !visible),
						showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha',
					)}
				/>

				<AuthButton type="submit" isLoading={isSubmitting}>
					<UserPlus className="size-5" /> Criar conta
				</AuthButton>

				<p className="text-center text-sm text-muted-foreground">
					Já tem uma conta?{' '}
					<AuthLink href="/login" className="font-semibold">
						Fazer login
					</AuthLink>
				</p>
			</form>

			<p className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
				Seus dados são usados para criar e proteger a sua conta.
			</p>
		</AuthLayout>
	);
}
