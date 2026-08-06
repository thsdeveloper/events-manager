'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CreditCard, Ticket } from 'lucide-react';
import type { EventRegistration } from '@events-manager/contracts';

import { TransactionHistory } from '@/components/account/TransactionHistory';
import { Button } from '@/components/ui/button';
import { useServerAuth } from '@/hooks/useServerAuth';
import { getMediaAssetUrl } from '@/lib/media';
import { ProfileDetailsForm } from './ProfileDetailsForm';
import { ProfileNavigation } from './ProfileNavigation';
import { ProfileOverview } from './ProfileOverview';
import { ProfilePreferences } from './ProfilePreferences';
import { ProfileSecurity } from './ProfileSecurity';
import {
	getDisplayName,
	getProfileCompletion,
	type ProfileSection,
	type ProfileUser,
	type TicketSummary,
} from './types';

interface ProfilePageClientProps {
	initialUser: ProfileUser;
}

const validSections: ProfileSection[] = ['overview', 'personal', 'security', 'preferences', 'payments'];

export function ProfilePageClient({ initialUser }: ProfilePageClientProps) {
	const router = useRouter();
	const pathname = usePathname();
	const auth = useServerAuth();
	const [user, setUser] = useState(initialUser);
	const [activeSection, setActiveSection] = useState<ProfileSection>('overview');
	const [tickets, setTickets] = useState<TicketSummary>({
		registrations: [],
		isLoading: true,
		hasError: false,
	});

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const section = params.get('section');
		const legacyTab = params.get('tab');

		if (legacyTab === 'ingressos') {
			router.replace('/meus-ingressos');

			return;
		}

		if (section && validSections.includes(section as ProfileSection)) {
			setActiveSection(section as ProfileSection);
		} else if (legacyTab === 'preferencias') {
			setActiveSection('security');
		} else if (legacyTab === 'transacoes') {
			setActiveSection('payments');
		} else if (legacyTab === 'perfil') {
			setActiveSection('personal');
		}
	}, [router]);

	useEffect(() => {
		let isActive = true;

		async function fetchTickets() {
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
	}, []);

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

	return (
		<div className="min-h-[calc(100vh-5rem)] border-y border-slate-100 bg-slate-50/80 dark:border-slate-900 dark:bg-slate-950">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
				<header className="mb-7">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
						Minha conta
					</p>
					<div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
								Perfil de {getDisplayName(user)}
							</h2>
							<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
								Tudo sobre você e sua conta, em um só lugar.
							</p>
						</div>
						<p className="text-xs text-slate-400">ID da conta · {user.id.slice(0, 8)}</p>
					</div>
				</header>

				<div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:gap-8">
					<ProfileNavigation
						user={user}
						avatarUrl={avatarUrl}
						completion={completion}
						activeSection={activeSection}
						onSectionChange={navigateTo}
						onLogout={auth.logout}
					/>

					<div className="min-w-0">
						<div className="mb-4 flex gap-2 lg:hidden">
							<Button asChild variant="outline" size="sm" className="flex-1 rounded-xl">
								<Link href="/meus-ingressos">
									<Ticket />
									Ingressos
								</Link>
							</Button>
							<Button
								type="button"
								variant={activeSection === 'payments' ? 'secondary' : 'outline'}
								size="sm"
								className="flex-1 rounded-xl"
								onClick={() => navigateTo('payments')}
							>
								<CreditCard />
								Pagamentos
							</Button>
						</div>

						{activeSection === 'overview' && (
							<ProfileOverview user={user} completion={completion} tickets={tickets} onNavigate={navigateTo} />
						)}
						{activeSection === 'personal' && <ProfileDetailsForm user={user} onSaved={handleProfileSaved} />}
						{activeSection === 'security' && <ProfileSecurity user={user} onLogout={auth.logout} />}
						{activeSection === 'preferences' && <ProfilePreferences />}
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
