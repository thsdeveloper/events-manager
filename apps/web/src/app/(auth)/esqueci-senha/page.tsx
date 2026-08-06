'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthLink } from '@/components/auth/AuthLink';
import { LoadingSpinner } from '@/components/design-system/atoms/LoadingSpinner';
import { AuthField } from '@/components/design-system/molecules/AuthField';
import { InlineAlert } from '@/components/design-system/molecules/InlineAlert';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/lib/http-client';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [submittedEmail, setSubmittedEmail] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			await httpClient.post('/api/auth/forgot-password', { email }, { toastOnError: false });
			setSubmittedEmail(email);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível enviar as instruções. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	};

	if (submittedEmail) {
		return (
			<AuthLayout title="Confira seu e-mail" subtitle="A solicitação foi recebida" showBackButton={false}>
				<div className="space-y-6 text-center">
					<div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
						<CheckCircle aria-hidden="true" className="size-10 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p className="text-muted-foreground">
						Se houver uma conta para <strong className="break-all text-foreground">{submittedEmail}</strong>, você
						receberá um link para redefinir a senha.
					</p>
					<InlineAlert tone="info">
						Verifique também as pastas de spam e lixeira. Use o link assim que recebê-lo.
					</InlineAlert>
					<Button asChild className="w-full">
						<Link href="/login">
							<ArrowLeft className="size-4" /> Voltar para o login
						</Link>
					</Button>
					<Button type="button" variant="ghost" className="w-full" onClick={() => setSubmittedEmail('')}>
						Enviar para outro e-mail
					</Button>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Esqueceu sua senha?" subtitle="Enviaremos instruções para redefini-la">
			<form onSubmit={handleSubmit} className="space-y-6">
				{error ? <InlineAlert>{error}</InlineAlert> : null}
				<AuthField
					id="email"
					label="E-mail"
					icon={<Mail className="size-5" />}
					type="email"
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
					placeholder="seu@email.com"
					hint="Digite o e-mail cadastrado na sua conta."
				/>
				<AuthButton type="submit" isLoading={isLoading}>
					{isLoading ? (
						<>
							<LoadingSpinner /> Enviando...
						</>
					) : (
						<>
							<Mail className="size-5" /> Enviar instruções
						</>
					)}
				</AuthButton>
				<div className="text-center">
					<AuthLink href="/login" className="inline-flex items-center gap-2 text-sm">
						<ArrowLeft className="size-4" /> Voltar para o login
					</AuthLink>
				</div>
			</form>
		</AuthLayout>
	);
}
