'use client';

import type { Globals } from '@events-manager/contracts';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '@/components/layout/UserMenu';
import Container from '@/components/ui/container';
import { useServerAuth } from '@/hooks/useServerAuth';
import { getMediaAssetUrl } from '@/lib/media';

interface CheckoutHeaderProps {
	/** Página do evento, para quem quer conferir algo antes de pagar. */
	backHref: string;
	globals: Pick<Globals, 'id' | 'logo' | 'logo_dark_mode' | 'title'> | null;
}

/**
 * Cabeçalho reduzido do checkout. O menu do site fica de fora de propósito:
 * durante a compra, cada link é uma saída do funil. Sobram o logo, o caminho
 * de volta ao evento e a conta da pessoa.
 */
export function CheckoutHeader({ backHref, globals }: CheckoutHeaderProps) {
	const { isOrganizer, isSuperAdmin, user, logout } = useServerAuth();
	const siteTitle = globals?.title || 'Events Manager';
	const lightLogoUrl = globals?.logo ? getMediaAssetUrl(globals.logo) : '/images/logo.svg';
	const darkLogoUrl = globals?.logo_dark_mode ? getMediaAssetUrl(globals.logo_dark_mode) : '';

	return (
		<header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur">
			<Container as="div" className="flex items-center justify-between gap-4 py-3">
				<div className="flex min-w-0 items-center gap-4 sm:gap-6">
					<Link href="/" className="shrink-0" aria-label={siteTitle}>
						<Image
							src={lightLogoUrl}
							alt={siteTitle}
							width={120}
							height={40}
							className="h-8 w-auto dark:hidden"
							priority
						/>
						{darkLogoUrl ? (
							<Image
								src={darkLogoUrl}
								alt={siteTitle}
								width={120}
								height={40}
								className="hidden h-8 w-auto dark:block"
								priority
							/>
						) : null}
					</Link>
					<Link
						href={backHref}
						className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="size-4" aria-hidden />
						Voltar ao evento
					</Link>
				</div>

				<div className="flex items-center gap-4">
					<span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
						<LockKeyhole className="size-3.5" aria-hidden />
						Compra segura
					</span>
					{user ? (
						<UserMenu user={user} onLogout={logout} isOrganizer={isOrganizer} isSuperAdmin={isSuperAdmin} />
					) : null}
				</div>
			</Container>
		</header>
	);
}
