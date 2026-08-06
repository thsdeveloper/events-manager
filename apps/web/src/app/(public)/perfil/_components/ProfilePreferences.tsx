'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Check, Clock3, Languages, Laptop, Moon, Palette, Sun } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const timezones = [
	{ value: 'America/Sao_Paulo', label: 'Brasília — GMT-3' },
	{ value: 'America/Manaus', label: 'Manaus — GMT-4' },
	{ value: 'America/Rio_Branco', label: 'Rio Branco — GMT-5' },
	{ value: 'America/Fortaleza', label: 'Fortaleza — GMT-3' },
	{ value: 'Europe/Lisbon', label: 'Lisboa — GMT+0' },
];

const themeOptions = [
	{ value: 'system', label: 'Sistema', description: 'Segue o dispositivo', icon: Laptop },
	{ value: 'light', label: 'Claro', description: 'Sempre claro', icon: Sun },
	{ value: 'dark', label: 'Escuro', description: 'Sempre escuro', icon: Moon },
] as const;

export function ProfilePreferences() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [timezone, setTimezone] = useState('America/Sao_Paulo');
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		setMounted(true);
		const stored = window.localStorage.getItem('events-manager-timezone');
		const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (stored) setTimezone(stored);
		else if (timezones.some((item) => item.value === browserTimezone)) setTimezone(browserTimezone);
	}, []);

	const updateTimezone = (value: string) => {
		setTimezone(value);
		window.localStorage.setItem('events-manager-timezone', value);
		setSaved(true);
		window.setTimeout(() => setSaved(false), 1800);
	};

	return (
		<div className="space-y-6">
			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<header className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8 sm:py-6">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
							<Palette className="size-5" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-slate-950 dark:text-white">Preferências</h1>
							<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
								Ajuste a aparência e a região usadas neste dispositivo.
							</p>
						</div>
					</div>
				</header>

				<div className="space-y-8 p-6 sm:p-8">
					<section aria-labelledby="appearance-heading">
						<h2 id="appearance-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
							Aparência
						</h2>
						<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
							A escolha é aplicada em toda a plataforma e salva neste navegador.
						</p>
						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							{themeOptions.map((option) => {
								const Icon = option.icon;
								const selected = mounted && theme === option.value;

								return (
									<button
										key={option.value}
										type="button"
										onClick={() => setTheme(option.value)}
										aria-pressed={selected}
										className={cn(
											'relative flex items-start gap-3 rounded-xl border p-4 text-left transition',
											selected
												? 'border-violet-500 bg-violet-50/70 ring-1 ring-violet-500 dark:bg-violet-950/30'
												: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50',
										)}
									>
										<span
											className={cn(
												'flex size-9 shrink-0 items-center justify-center rounded-lg',
												selected
													? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200'
													: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
											)}
										>
											<Icon className="size-4" />
										</span>
										<span>
											<span className="block text-sm font-semibold text-slate-900 dark:text-white">{option.label}</span>
											<span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
												{option.description}
											</span>
										</span>
										{selected && (
											<Check className="absolute right-3 top-3 size-4 text-violet-700 dark:text-violet-300" />
										)}
									</button>
								);
							})}
						</div>
					</section>

					<div className="h-px bg-slate-100 dark:bg-slate-800" />

					<section aria-labelledby="regional-heading">
						<h2 id="regional-heading" className="text-sm font-semibold text-slate-900 dark:text-white">
							Idioma e região
						</h2>
						<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
							Usamos essas opções para exibir datas e horários corretamente.
						</p>

						<div className="mt-5 grid gap-5 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="profile-language" className="flex items-center gap-2">
									<Languages className="size-4 text-slate-400" />
									Idioma
								</Label>
								<select
									id="profile-language"
									disabled
									className="h-11 w-full rounded-xl border border-input bg-slate-50 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-80 dark:bg-slate-950 dark:text-slate-200"
								>
									<option>Português (Brasil)</option>
								</select>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Outros idiomas estarão disponíveis em breve.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="profile-timezone" className="flex items-center gap-2">
									<Clock3 className="size-4 text-slate-400" />
									Fuso horário
								</Label>
								<select
									id="profile-timezone"
									value={timezone}
									onChange={(event) => updateTimezone(event.target.value)}
									className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-slate-700 dark:text-slate-200"
								>
									{timezones.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
								<p className="flex h-5 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
									{saved && <Check className="size-3.5 text-emerald-600" />}
									{saved ? 'Preferência salva neste navegador.' : 'Usado na exibição dos horários dos eventos.'}
								</p>
							</div>
						</div>
					</section>
				</div>
			</section>
		</div>
	);
}
