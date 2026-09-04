'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthLink } from '@/components/auth/AuthLink';
import { AuthField, registerField } from '@/components/design-system/molecules/AuthField';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/lib/http-client';
import { safeInternalRedirect } from '@/lib/navigation';
import { registerSchema, type RegisterValues } from '@/lib/validation/auth';

interface RegisterResponse {
	confirmationRequired: boolean;
	redirect?: string;
}

export default function RegisterPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterValues>({
		resolver: zodResolver(registerSchema),
		defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
		// Validate once the field has been left, then live as it is corrected —
		// no errors are shown while the user is still filling a field in.
		mode: 'onTouched',
	});

	const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: RegisterValues) => {
		try {
			const data = await httpClient.post<RegisterResponse>('/api/auth/register', values);
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
