'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLink } from '@/components/auth/AuthLink';
import { httpClient } from '@/lib/http-client';

interface LoginResponse {
	success: boolean;
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: unknown;
	};
	isOrganizer: boolean;
	redirect: string;
}

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			// httpClient mostra toast automaticamente em caso de erro
			const data = await httpClient.post<LoginResponse>('/api/auth/login', {
				email,
				password,
			});
			// Sucesso - redireciona
			const redirectUrl = searchParams.get('redirect') || data.redirect || '/perfil';
			await new Promise(resolve => setTimeout(resolve, 100));
			window.location.href = redirectUrl;
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Bem-vindo de volta"
			subtitle="Entre com suas credenciais para acessar sua conta"
		>
			<form onSubmit={handleSubmit} className="space-y-6">
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
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Senha
						</label>
						<AuthLink href="/esqueci-senha" className="text-sm font-medium">
							Esqueceu a senha?
						</AuthLink>
					</div>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<Lock className="size-5 text-gray-400" />
						</div>
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#6644ff] focus:border-transparent transition-all"
							placeholder="••••••••"
							minLength={8}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
						>
							{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
						</button>
					</div>
				</div>

				<AuthButton type="submit" isLoading={isLoading}>
					{isLoading ? (
						<>
							<svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Entrando...
						</>
					) : (
						<>
							<LogIn className="size-5" />
							Entrar
						</>
					)}
				</AuthButton>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="px-4 bg-white dark:bg-[#0e1a2b] text-gray-500 dark:text-gray-400">
							Ou
						</span>
					</div>
				</div>

				<div className="text-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Não tem uma conta?{' '}
						<AuthLink href="/register" className="font-semibold">
							Criar conta gratuita
						</AuthLink>
					</p>
				</div>
			</form>

			{/* Trust Badge */}
			<div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
				<div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
					</svg>
					<span>Seus dados estão seguros e protegidos</span>
				</div>
			</div>
		</AuthLayout>
	);
}
