'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Erro ao enviar email de recuperação');
			}

			setIsSuccess(true);
		} catch (err: any) {
			setError(err.message || 'Erro ao enviar email de recuperação');
		} finally {
			setIsLoading(false);
		}
	};

	if (isSuccess) {
		return (
			<AuthLayout
				title="Email Enviado!"
				subtitle="Verifique sua caixa de entrada"
				showBackButton={false}
			>
				<div className="text-center space-y-6">
					<div className="flex justify-center">
						<div className="size-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
							<CheckCircle className="size-10 text-green-600 dark:text-green-400" />
						</div>
					</div>

					<div className="space-y-3">
						<p className="text-gray-600 dark:text-gray-400">
							Enviamos um link de recuperação de senha para:
						</p>
						<p className="text-lg font-semibold text-gray-900 dark:text-white">
							{email}
						</p>
					</div>

					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
						<p className="text-sm text-blue-800 dark:text-blue-200">
							<strong>Dica:</strong> O link é válido por 1 hora. Se não encontrar o email, verifique sua pasta de spam.
						</p>
					</div>

					<div className="space-y-3 pt-4">
						<Link
							href="/login"
							className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6644ff] to-[#8b5cf6] text-white rounded-xl font-semibold hover:from-[#5533ee] hover:to-[#7c3aed] focus:ring-4 focus:ring-[#6644ff]/20 transition-all duration-200 shadow-lg shadow-[#6644ff]/20 hover:shadow-xl hover:shadow-[#6644ff]/30"
						>
							<ArrowLeft className="size-5" />
							Voltar para Login
						</Link>

						<button
							onClick={() => {
								setIsSuccess(false);
								setEmail('');
							}}
							className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
						>
							Enviar para outro email
						</button>
					</div>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			title="Esqueceu sua senha?"
			subtitle="Não se preocupe, enviaremos instruções para redefinir"
		>
			<form onSubmit={handleSubmit} className="space-y-6">
				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
						<svg className="size-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
						</svg>
						<span>{error}</span>
					</div>
				)}

				<div className="space-y-2">
					<label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Email
					</label>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<Mail className="size-5 text-gray-400" />
						</div>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#6644ff] focus:border-transparent transition-all"
							placeholder="seu@email.com"
						/>
					</div>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						Digite o email cadastrado na sua conta
					</p>
				</div>

				<button
					type="submit"
					disabled={isLoading}
					className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#6644ff] to-[#8b5cf6] text-white rounded-xl font-semibold hover:from-[#5533ee] hover:to-[#7c3aed] focus:ring-4 focus:ring-[#6644ff]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#6644ff]/20 hover:shadow-xl hover:shadow-[#6644ff]/30"
				>
					{isLoading ? (
						<>
							<svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Enviando...
						</>
					) : (
						<>
							<Mail className="size-5" />
							Enviar Link de Recuperação
						</>
					)}
				</button>

				<div className="text-center pt-4">
					<Link
						href="/login"
						className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#6644ff] dark:hover:text-[#8b5cf6] transition-colors"
					>
						<ArrowLeft className="size-4" />
						Voltar para o login
					</Link>
				</div>
			</form>

			{/* Help Section */}
			<div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
				<div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
						Precisa de ajuda?
					</h3>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						Se você não receber o email em alguns minutos, tente:
					</p>
					<ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 ml-4">
						<li className="flex items-start gap-2">
							<span className="text-[#6644ff] mt-0.5">•</span>
							<span>Verificar sua pasta de spam ou lixeira</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-[#6644ff] mt-0.5">•</span>
							<span>Confirmar se o email está correto</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-[#6644ff] mt-0.5">•</span>
							<span>Entrar em contato com nosso suporte</span>
						</li>
					</ul>
				</div>
			</div>
		</AuthLayout>
	);
}
