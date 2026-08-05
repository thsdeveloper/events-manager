'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Info } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function RegisterPage() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('As senhas não coincidem');

			return;
		}

		if (password.length < 8) {
			setError('A senha deve ter pelo menos 8 caracteres');

			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, firstName, lastName }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Erro ao criar conta');
			}

			router.push('/perfil');
			router.refresh();
		} catch (err: any) {
			setError(err.message || 'Erro ao criar conta');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout
			title="Criar Conta"
			subtitle="Preencha seus dados para começar sua jornada"
		>
			<form onSubmit={handleSubmit} className="space-y-5">
				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
						<svg className="size-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
						</svg>
						<span>{error}</span>
					</div>
				)}

				<div className="flex items-start gap-3 p-4 bg-[#6644ff]/5 dark:bg-[#6644ff]/10 border border-[#6644ff]/20 rounded-xl">
					<div className="mt-0.5">
						<Info className="size-5 text-[#6644ff]" />
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-300">
						Sua conta será criada como <strong>comprador</strong>. Caso deseje publicar eventos,
						você poderá solicitar o acesso de organizador no painel da sua conta.
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Nome
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
								<User className="size-5 text-gray-400" />
							</div>
							<input
								id="firstName"
								type="text"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								required
								className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#6644ff] focus:border-transparent transition-all"
								placeholder="João"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Sobrenome
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
								<User className="size-5 text-gray-400" />
							</div>
							<input
								id="lastName"
								type="text"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								required
								className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#6644ff] focus:border-transparent transition-all"
								placeholder="Silva"
							/>
						</div>
					</div>
				</div>

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
					<label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Senha
					</label>
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
					<p className="text-xs text-gray-500 dark:text-gray-400">Mínimo de 8 caracteres</p>
				</div>

				<div className="space-y-2">
					<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Confirmar Senha
					</label>
					<div className="relative">
						<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
							<Lock className="size-5 text-gray-400" />
						</div>
						<input
							id="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#6644ff] focus:border-transparent transition-all"
							placeholder="••••••••"
							minLength={8}
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
						>
							{showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
						</button>
					</div>
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
							Criando conta...
						</>
					) : (
						<>
							<UserPlus className="size-5" />
							Criar Conta
						</>
					)}
				</button>

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
						Já tem uma conta?{' '}
						<Link
							href="/login"
							className="text-[#6644ff] hover:text-[#5533ee] dark:text-[#8b5cf6] dark:hover:text-[#7c3aed] font-semibold transition-colors"
						>
							Fazer login
						</Link>
					</p>
				</div>
			</form>

			{/* Terms */}
			<div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
				<p className="text-xs text-center text-gray-500 dark:text-gray-400">
					Ao criar uma conta, você concorda com nossos{' '}
					<Link href="/termos" className="text-[#6644ff] hover:underline">
						Termos de Serviço
					</Link>
					{' '}e{' '}
					<Link href="/privacidade" className="text-[#6644ff] hover:underline">
						Política de Privacidade
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}
