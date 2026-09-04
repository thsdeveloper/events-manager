'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ThemeToggleProps {
	className?: string;
}

/**
 * The three modes are the same ones offered in Perfil › Preferências, so the
 * control here must be able to express all of them — a two-state toggle would
 * silently downgrade "Sistema" to an explicit light/dark the first time it was
 * pressed.
 */
const themeOptions = [
	{ icon: Laptop, label: 'Sistema', title: 'Sistema — segue o dispositivo', value: 'system' },
	{ icon: Sun, label: 'Claro', title: 'Claro — sempre claro', value: 'light' },
	{ icon: Moon, label: 'Escuro', title: 'Escuro — sempre escuro', value: 'dark' },
] as const;

const ThemeToggle = ({ className }: ThemeToggleProps) => {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// The stored preference is only known in the browser; until then no option is
	// marked active so server and client markup agree.
	useEffect(() => setMounted(true), []);

	return (
		<div
			aria-label="Tema da interface"
			className={cn('inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5', className)}
			role="radiogroup"
		>
			{themeOptions.map((option) => {
				const Icon = option.icon;
				const selected = mounted && theme === option.value;

				return (
					<button
						aria-checked={selected}
						aria-label={option.label}
						className={cn(
							'inline-flex size-7 items-center justify-center rounded-lg transition-colors',
							selected
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground',
						)}
						key={option.value}
						onClick={() => setTheme(option.value)}
						role="radio"
						title={option.title}
						type="button"
					>
						<Icon aria-hidden="true" className="size-4" />
					</button>
				);
			})}
		</div>
	);
};

export default ThemeToggle;
