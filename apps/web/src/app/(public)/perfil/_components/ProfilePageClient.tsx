'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Loader2, Ticket } from 'lucide-react';
import { RefreshCw } from '@/components/animate-ui/icons/refresh-cw';
import type { EventRegistration } from '@events-manager/contracts';

import { TransactionHistory } from '@/components/account/TransactionHistory';
import { MyTicketsContent } from '@/components/tickets/MyTicketsContent';
import { Button } from '@/components/ui/button';
import { useServerAuth } from '@/hooks/useServerAuth';
import { getMediaAssetUrl } from '@/lib/media';
import { profileSections } from '@/lib/profile-sections';
import { ProfileDetailsForm } from './ProfileDetailsForm';
import { ProfileNavigation } from './ProfileNavigation';
import { ProfileOverview } from './ProfileOverview';
import { ProfilePreferences } from './ProfilePreferences';
import { ProfileSecurity } from './ProfileSecurity';
import { getProfileCompletion, type ProfileSection, type ProfileUser, type TicketSummary } from './types';

interface ProfilePageClientProps {
	initialUser: ProfileUser;
}

// `tab` is the pre-`section` query name; the mapping keeps old bookmarks and
// e-mail links landing on the equivalent section.
const legacyTabSections: Record<string, ProfileSection> = {
	ingressos: 'ingressos',
	perfil: 'personal',
	preferencias: 'security',
	transacoes: 'payments',
};

function resolveSection(section: string | null, legacyTab: string | null): ProfileSection | null {
	if (section && profileSections.includes(section as ProfileSection)) return section as ProfileSection;
	if (legacyTab) return legacyTabSections[legacyTab] ?? null;

	return null;
}

export function ProfilePageClient({ initialUser }: ProfilePageClientProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const auth = useServerAuth();
	const [user, setUser] = useState(initialUser);
	const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
	const [tickets, setTickets] = useState<TicketSummary>({
		registrations: [],
		isLoading: true,
		hasError: false,
	});
	// Bumped by the "try again" button in the tickets section.
	const [ticketsReloadKey, setTicketsReloadKey] = useState(0);

	// Driven by the live query string rather than a mount-only read: the header
	// avatar menu links to `/perfil?section=...` from the profile page itself, and
	// that navigation never remounts this component.
	useEffect(() => {
		const section = resolveSection(searchParams.get('section'), searchParams.get('tab'));
		if (section) setActiveSection(section);
	}, [searchParams]);

	useEffect(() => {
		let isActive = true;

		async function fetchTickets() {
			setTickets((current) => ({ ...current, isLoading: true, hasError: false }));
			try {
				const response = await fetch('/api/user/tickets', { credentials: 'include' });
				if (!response.ok) throw new Error('Tickets unavailable');
				const registrations = (await response.json()) as EventRegistration[];
				if (isActive) setTickets({ registrations, isLoading: false, hasError: false });
			} catch {
				if (isActive) setTickets({ registrations: [], isLoading: false, hasError: true });
			}
		}

		void fetchTickets();

		return () => {
			isActive = false;
		};
	}, [ticketsReloadKey]);

	const completion = useMemo(() => getProfileCompletion(user), [user]);
	const avatarUrl = getMediaAssetUrl(user.avatar);

	const navigateTo = (section: ProfileSection) => {
		setActiveSection(section);
		router.push(`${pathname}?section=${section}`, { scroll: false });
		if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleProfileSaved = (updatedUser: ProfileUser) => {
		setUser(updatedUser);
		void auth.refresh();
		router.refresh();
	};

	// No min-height on the wrapper: it would stretch past the content and push all
	// the leftover space below the grid, making the bottom gutter look bigger than
	// the top one.
	return (
		<div className="border-y border-slate-100 bg-slate-50/80 dark:border-slate-900 dark:bg-slate-950">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
				<div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
					<ProfileNavigation
						user={user}
						avatarUrl={avatarUrl}
						completion={completion}
						activeSection={activeSection}
						onSectionChange={navigateTo}
						onLogout={auth.logout}
						onProfileUpdated={handleProfileSaved}
					/>

					<div className="min-w-0">
						<div className="mb-4 flex gap-2 lg:hidden">
							<Button
								type="button"
								variant={activeSection === 'ingressos' ? 'secondary' : 'outline'}
								size="sm"
								className="flex-1 rounded-lg"
								onClick={() => navigateTo('ingressos')}
							>
								<Ticket />
								Ingressos
							</Button>
							<Button
								type="button"
								variant={activeSection === 'payments' ? 'secondary' : 'outline'}
								size="sm"
								className="flex-1 rounded-lg"
								onClick={() => navigateTo('payments')}
							>
								<CreditCard />
								Pagamentos
							</Button>
						</div>

						{activeSection === 'overview' && (
							<ProfileOverview user={user} completion={completion} onNavigate={navigateTo} />
						)}
						{activeSection === 'personal' && <ProfileDetailsForm user={user} onSaved={handleProfileSaved} />}
						{activeSection === 'security' && <ProfileSecurity user={user} onLogout={auth.logout} />}
						{activeSection === 'preferences' && <ProfilePreferences />}
						{activeSection === 'ingressos' && (
							// No visible heading: the sidebar entry already names the section, so the
							// label is exposed to screen readers only.
							<section aria-label="Meus ingressos">
								{tickets.isLoading ? (
									<div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
										<div className="text-center">
											<Loader2 className="mx-auto size-6 animate-spin text-violet-600" />
											<p className="mt-3 text-sm text-slate-500">Carregando seus ingressos...</p>
										</div>
									</div>
								) : tickets.hasError ? (
									<div className="rounded-lg border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
										<Ticket className="mx-auto size-8 text-red-400" />
										<h2 className="mt-4 font-semibold text-slate-950 dark:text-white">
											Não foi possível carregar seus ingressos
										</h2>
										<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
											Verifique sua conexão e tente novamente.
										</p>
										<Button
											type="button"
											variant="outline"
											className="mt-5 rounded-lg"
											onClick={() => setTicketsReloadKey((key) => key + 1)}
										>
											<RefreshCw animateOnHover />
											Tentar novamente
										</Button>
									</div>
								) : (
									<MyTicketsContent registrations={tickets.registrations} />
								)}
							</section>
						)}
						{activeSection === 'payments' && (
							<section aria-labelledby="payments-heading">
								<div className="mb-5">
									<h1 id="payments-heading" className="text-xl font-semibold text-slate-950 dark:text-white">
										Pagamentos
									</h1>
									<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
										Consulte recibos e movimentações vinculados aos seus ingressos.
									</p>
								</div>
								<TransactionHistory userId={user.id} />
							</section>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
