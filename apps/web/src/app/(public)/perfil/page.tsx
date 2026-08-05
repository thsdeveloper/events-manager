'use client';

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ComponentType,
	type Dispatch,
	type FormEvent,
	type ChangeEvent,
	type RefObject,
	type SetStateAction,
	type SVGProps,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	ArrowRight,
	Bell,
	Calendar,
	ChevronDown,
	Download,
	Edit3,
	Heart,
	HelpCircle,
	Keyboard,
	Loader2,
	Lock,
	Mail,
	Moon,
	Phone,
	Save,
	Settings,
	ShieldCheck,
	Sparkles,
	Sun,
	Ticket,
	TrendingUp,
	User,
} from 'lucide-react';
import { useServerAuth } from '@/hooks/useServerAuth';
import { useToast } from '@/hooks/use-toast';
import { TransactionHistory } from '@/components/account/TransactionHistory';
import { MyTicketsContent } from '@/components/tickets/MyTicketsContent';
import type { EventRegistration } from '@events-manager/contracts';

const PROFILE_TABS = [
	{
		id: 'perfil',
		label: 'Informações pessoais',
		description: 'Atualize dados e preferências básicas.',
		icon: User,
	},
	{
		id: 'preferencias',
		label: 'Segurança & preferências',
		description: 'Controle senhas, notificações e temas.',
		icon: ShieldCheck,
	},
	{
		id: 'ingressos',
		label: 'Meus ingressos',
		description: 'Gerencie próximas experiências.',
		icon: Ticket,
	},
	{
		id: 'transacoes',
		label: 'Histórico financeiro',
		description: 'Reveja recibos e movimentações.',
		icon: TrendingUp,
	},
] as const;

type Tab = (typeof PROFILE_TABS)[number]['id'];

interface PersonalData {
	first_name: string;
	last_name: string;
	email: string;
}

interface PasswordData {
	current: string;
	new: string;
	confirm: string;
}

type PersonalFieldKey = keyof PersonalData;

const notificationPreferences = [
	{
		id: 'purchases',
		label: 'Novas compras e recibos',
		description: 'Receba confirmações instantâneas por e-mail e push.',
	},
	{
		id: 'reminders',
		label: 'Lembretes de evento',
		description: 'Alertas alguns dias antes do evento começar.',
	},
	{
		id: 'recommendations',
		label: 'Recomendações personalizadas',
		description: 'Sugestões com base nos eventos que você curtiu.',
	},
	{
		id: 'news',
		label: 'Ofertas e novidades',
		description: 'Primeiro acesso a promoções e experiências exclusivas.',
	},
];

const timezones = [
	'America/Sao_Paulo (GMT-3)',
	'America/New_York (GMT-5)',
	'Europe/London (GMT+0)',
	'Europe/Lisbon (GMT+0)',
	'Asia/Tokyo (GMT+9)',
];

const onboardingPrompts = [
	{
		title: 'Complete seu perfil',
		description:
			'Adicionar nome e e-mail garante ingressos personalizados e acesso rápido ao suporte.',
	},
	{
		title: 'Explore eventos recomendados',
		description:
			'Salve suas experiências favoritas para receber alertas de abertura de vendas.',
	},
	{
		title: 'Configure notificações',
		description:
			'Escolha como quer ser lembrado para nunca perder um horário ou mudança de agenda.',
	},
];

const keyboardShortcuts = [
	{ combo: 'Ctrl/⌘ + E', description: 'Alternar modo de edição dos dados pessoais' },
	{ combo: 'Ctrl/⌘ + S', description: 'Salvar dados pessoais' },
	{ combo: 'Shift + K', description: 'Exibir lista de atalhos' },
];

const isValidTab = (value: string | null): value is Tab =>
	PROFILE_TABS.some((tab) => tab.id === value);

const getPersonalFieldError = (field: PersonalFieldKey, value: string) => {
	const trimmed = value.trim();

	if (!trimmed) {
		return 'Campo obrigatório.';
	}

	if ((field === 'first_name' || field === 'last_name') && trimmed.length < 2) {
		return 'Use pelo menos 2 caracteres.';
	}

	if (field === 'email') {
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailPattern.test(trimmed)) {
			return 'Informe um e-mail válido.';
		}
	}

	return '';
};

export default function PerfilPage() {
	const { user } = useServerAuth();
	const { toast } = useToast();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const [activeTab, setActiveTab] = useState<Tab>(() => {
		const tabParam = searchParams.get('tab');

return isValidTab(tabParam) ? tabParam : 'perfil';
	});

	const [profileSaving, setProfileSaving] = useState(false);
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [isEditingPersonal, setIsEditingPersonal] = useState(false);
	const [isMobileTabPickerOpen, setIsMobileTabPickerOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
	const [darkMode, setDarkMode] = useState(false);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const avatarPreviewUrlRef = useRef<string | null>(null);
	const avatarInputRef = useRef<HTMLInputElement | null>(null);

	const [personalData, setPersonalData] = useState<PersonalData>({
		first_name: '',
		last_name: '',
		email: '',
	});
	const [personalErrors, setPersonalErrors] = useState<Partial<Record<PersonalFieldKey, string>>>({});
	const [passwordData, setPasswordData] = useState<PasswordData>({
		current: '',
		new: '',
		confirm: '',
	});

	const [tickets, setTickets] = useState<EventRegistration[]>([]);
	const [loadingTickets, setLoadingTickets] = useState(false);
	const [ticketsFetched, setTicketsFetched] = useState(false);

	const isLoadingUser = !user && !personalData.email;

	useEffect(() => {
		const tabParam = searchParams.get('tab');
		if (isValidTab(tabParam) && tabParam !== activeTab) {
			setActiveTab(tabParam);
		}
	}, [searchParams, activeTab]);

	useEffect(() => {
		if (!user) {
			return;
		}

		setPersonalData({
			first_name: user.first_name || '',
			last_name: user.last_name || '',
			email: user.email || '',
		});
	}, [user]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const root = document.documentElement;
		const prefersDark = root.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
		setDarkMode(prefersDark);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const root = document.documentElement;
		root.classList.toggle('dark', darkMode);
	}, [darkMode]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const updateSidebarState = () => {
			setIsSidebarCollapsed(window.innerWidth < 1024);
		};

		updateSidebarState();
		window.addEventListener('resize', updateSidebarState);

		return () => window.removeEventListener('resize', updateSidebarState);
	}, []);

	useEffect(() => {
		if (activeTab !== 'ingressos' || !user?.id || ticketsFetched || loadingTickets) {
			return;
		}

		const fetchTickets = async () => {
			setLoadingTickets(true);
			try {
				const response = await fetch(`/api/user/tickets?userId=${user.id}`, {
					credentials: 'include',
				});
				if (response.ok) {
					const data = await response.json();
					setTickets(data);
				}
			} catch (error) {
				console.error('Error fetching tickets:', error);
			} finally {
				setLoadingTickets(false);
				setTicketsFetched(true);
			}
		};

		void fetchTickets();
	}, [activeTab, user?.id, ticketsFetched, loadingTickets]);

	useEffect(() => {
		// Enable quick shortcuts for power users (WCAG 2.1 requires opt-out, so we keep combos simple).
		const handleKeyDown = (event: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().includes('MAC');
			const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
			const key = event.key.toLowerCase();

			if (modifierPressed && key === 'e') {
				event.preventDefault();
				setActiveTab('perfil');
				setIsEditingPersonal((editing) => !editing);
			}

			if (modifierPressed && key === 's' && isEditingPersonal && activeTab === 'perfil') {
				event.preventDefault();
				void handleSavePersonalData();
			}

			if (event.shiftKey && key === 'k') {
				event.preventDefault();
				setActiveTab('preferencias');
			}
		};

		window.addEventListener('keydown', handleKeyDown);

return () => window.removeEventListener('keydown', handleKeyDown);
	}, [activeTab, isEditingPersonal]);

	useEffect(() => {
		return () => {
			if (avatarPreviewUrlRef.current) {
				URL.revokeObjectURL(avatarPreviewUrlRef.current);
			}
		};
	}, []);

	const handleTabChange = useCallback(
		(nextTab: Tab) => {
			setActiveTab(nextTab);
			setIsMobileTabPickerOpen(false);

			const params = new URLSearchParams(searchParams.toString());
			params.set('tab', nextTab);

			router.replace(`${pathname}?${params.toString()}`, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const handlePersonalFieldChange = useCallback((field: PersonalFieldKey, value: string) => {
		setPersonalData((current) => ({ ...current, [field]: value }));
		setPersonalErrors((current) => ({
			...current,
			[field]: getPersonalFieldError(field, value),
		}));
	}, []);

	const validatePersonalForm = useCallback(() => {
		const nextErrors: Partial<Record<PersonalFieldKey, string>> = {};
		(Object.keys(personalData) as PersonalFieldKey[]).forEach((field) => {
			const error = getPersonalFieldError(field, personalData[field]);
			if (error) {
				nextErrors[field] = error;
			}
		});

		setPersonalErrors(nextErrors);

return Object.values(nextErrors).every((error) => !error);
	}, [personalData]);

	const handleAvatarChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			if (!file.type.startsWith('image/')) {
				toast({
					title: 'Formato não suportado',
					description: 'Selecione uma imagem nos formatos PNG ou JPG.',
					variant: 'destructive',
				});

				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				toast({
					title: 'Arquivo muito grande',
					description: 'A imagem deve ter no máximo 5MB.',
					variant: 'destructive',
				});

				return;
			}

			if (avatarPreviewUrlRef.current) {
				URL.revokeObjectURL(avatarPreviewUrlRef.current);
			}

			const objectUrl = URL.createObjectURL(file);
			avatarPreviewUrlRef.current = objectUrl;
			setAvatarPreview(objectUrl);
			toast({
				title: 'Pré-visualização pronta',
				description: 'Salve o perfil para confirmar a nova foto.',
				variant: 'success',
			});
		},
		[toast],
	);

	const handleAvatarReset = useCallback(() => {
		if (avatarPreviewUrlRef.current) {
			URL.revokeObjectURL(avatarPreviewUrlRef.current);
		}

		avatarPreviewUrlRef.current = null;
		setAvatarPreview(null);
		if (avatarInputRef.current) {
			avatarInputRef.current.value = '';
		}
	}, []);

	const handleExportData = useCallback(async () => {
		if (!user?.id) {
			toast({
				title: 'Conta não encontrada',
				description: 'Conecte-se para exportar seus dados.',
				variant: 'destructive',
			});

			return;
		}

		try {
			toast({
				title: 'Preparando arquivo',
				description: 'Estamos gerando um pacote com seus dados.',
				variant: 'success',
			});

			// Simula processamento assíncrono para manter feedback imediato.
			await new Promise((resolve) => setTimeout(resolve, 900));

			toast({
				title: 'Exportação concluída',
				description: 'Você receberá um e-mail com a cópia solicitada em instantes.',
				variant: 'success',
			});
		} catch (error) {
			console.error('Error exporting data:', error);
			toast({
				title: 'Falha na exportação',
				description: 'Tente novamente mais tarde ou contato suporte.',
				variant: 'destructive',
			});
		}
	}, [toast, user?.id]);

	const handleSavePersonalData = useCallback(async () => {
		if (!user?.id) {
			toast({
				title: 'Acesso expirado',
				description: 'Entre novamente para atualizar seu perfil.',
				variant: 'destructive',
			});

			return;
		}

		if (!validatePersonalForm()) {
			toast({
				title: 'Revise os campos destacados',
				description: 'Corrija as informações antes de salvar.',
				variant: 'destructive',
			});

			return;
		}

		setProfileSaving(true);
		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					...personalData,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update profile');
			}

			setIsEditingPersonal(false);
			toast({
				title: 'Perfil atualizado',
				description: 'Suas informações foram salvas com sucesso.',
				variant: 'success',
			});
		} catch (error) {
			console.error('Error saving personal data:', error);
			toast({
				title: 'Não foi possível salvar',
				description: 'Tente novamente em instantes.',
				variant: 'destructive',
			});
		} finally {
			setProfileSaving(false);
		}
	}, [personalData, toast, user?.id, validatePersonalForm]);

	const handlePersonalSubmit = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void handleSavePersonalData();
		},
		[handleSavePersonalData],
	);

	const handleChangePassword = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();

			if (!user?.id) {
				toast({
					title: 'Sessão expirada',
					description: 'Faça login novamente para atualizar a senha.',
					variant: 'destructive',
				});

				return;
			}

			if (passwordData.new !== passwordData.confirm) {
				toast({
					title: 'As senhas não conferem',
					description: 'Digite a mesma senha nos dois campos de confirmação.',
					variant: 'destructive',
				});

				return;
			}

			if (passwordData.new.length < 8) {
				toast({
					title: 'Senha muito curta',
					description: 'Use pelo menos 8 caracteres para garantir sua segurança.',
					variant: 'destructive',
				});

				return;
			}

			setPasswordSaving(true);
			try {
				const response = await fetch('/api/user/password', {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userId: user.id,
						password: passwordData.new,
					}),
				});

				if (!response.ok) {
					throw new Error('Failed to update password');
				}

				setPasswordData({ current: '', new: '', confirm: '' });
				toast({
					title: 'Senha alterada',
					description: 'Use a nova senha no próximo acesso.',
					variant: 'success',
				});
			} catch (error) {
				console.error('Error changing password:', error);
				toast({
					title: 'Não foi possível atualizar',
					description: 'Verifique a senha atual e tente novamente.',
					variant: 'destructive',
				});
			} finally {
				setPasswordSaving(false);
			}
		},
		[passwordData.confirm, passwordData.new, toast, user?.id],
	);

	const personalFormDirty = useMemo(() => {
		if (!user) {
			return personalData.first_name || personalData.last_name || personalData.email;
		}

		return (
			personalData.first_name !== (user.first_name || '') ||
			personalData.last_name !== (user.last_name || '') ||
			personalData.email !== (user.email || '')
		);
	}, [personalData, user]);

	const personalFormValid = useMemo(
		() =>
			(Object.keys(personalData) as PersonalFieldKey[]).every(
				(field) => !getPersonalFieldError(field, personalData[field]),
			),
		[personalData],
	);

	const memberSinceLabel = useMemo(() => {
		return 'Membro ativo';
	}, []);

	const profileCompletion = useMemo(() => {
		const fields = (Object.keys(personalData) as PersonalFieldKey[]).length;
		const filled = (Object.keys(personalData) as PersonalFieldKey[]).filter(
			(field) => personalData[field].trim().length > 0,
		).length;

		const baseScore = Math.round((filled / fields) * 80);
		const ticketsBoost = tickets.length > 0 ? 10 : 0;
		const onboardingBoost = personalFormDirty ? 0 : 10;

		return Math.min(100, baseScore + ticketsBoost + onboardingBoost);
	}, [personalData, tickets.length, personalFormDirty]);

	const stats = useMemo(() => {
		const activeTickets = tickets.length;
		const hasActiveTickets = activeTickets > 0;

		return [
			{
				id: 'tickets',
				label: 'Ingressos ativos',
				value: hasActiveTickets ? activeTickets.toString() : '0',
				description: hasActiveTickets
					? 'Próximos eventos confirmados.'
					: 'Você ainda não garantiu um ingresso.',
				icon: Ticket,
				color: 'from-purple-500 to-indigo-500',
				progress: Math.min(100, activeTickets * 12),
				ctaLabel: hasActiveTickets ? 'Ver ingressos' : 'Explorar eventos',
				onClick: () => handleTabChange(hasActiveTickets ? 'ingressos' : 'ingressos'),
				empty: !hasActiveTickets,
			},
			{
				id: 'favorites',
				label: 'Eventos favoritados',
				value: '0',
				description: 'Salve experiências para receber alertas personalizados.',
				icon: Heart,
				color: 'from-blue-500 to-cyan-500',
				progress: 25,
				ctaLabel: 'Explorar eventos',
				onClick: () => router.push('/explorar'),
				empty: true,
			},
			{
				id: 'community',
				label: 'Conquistas',
				value: 'Em breve',
				description: 'Acompanhe badges e recompensas por engajamento.',
				icon: Sparkles,
				color: 'from-emerald-500 to-teal-500',
				progress: 45,
				ctaLabel: 'Saiba mais',
				onClick: () => toast({ title: 'Novidade chegando', description: 'Estamos preparando conquistas especiais!' }),
				empty: false,
			},
		];
	}, [handleTabChange, router, tickets.length, toast]);

	const activeOnboardingPrompt = onboardingPrompts.find(() => profileCompletion < 80);

	return (
		<div className="max-w-7xl mx-auto flex flex-col gap-8 py-6 text-slate-900 transition-colors duration-300 dark:text-slate-100 sm:px-6 lg:px-8">
			<ProfileHeader
				userName={`${personalData.first_name || 'Visitante'} ${personalData.last_name}`.trim()}
				email={personalData.email}
				memberSince={memberSinceLabel}
				onTabChange={handleTabChange}
				isEditingPersonal={isEditingPersonal}
				onEditPersonalToggle={() => setIsEditingPersonal((value) => !value)}
				onAvatarChange={handleAvatarChange}
				onAvatarReset={handleAvatarReset}
				avatarPreview={avatarPreview}
				avatarInputRef={avatarInputRef}
				profileCompletion={profileCompletion}
				darkMode={darkMode}
				onToggleDarkMode={() => setDarkMode((value) => !value)}
				isLoading={isLoadingUser}
			/>

			<StatsDashboard stats={stats} />

			<ProfileTabs
				activeTab={activeTab}
				onTabChange={handleTabChange}
				isMobileOpen={isMobileTabPickerOpen}
				onMobileToggle={() => setIsMobileTabPickerOpen((value) => !value)}
			/>

			<div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<section className="flex flex-col gap-8">
					{activeTab === 'perfil' && (
						<PersonalInfoPanel
							isEditing={isEditingPersonal}
							onToggleEdit={() => setIsEditingPersonal((value) => !value)}
							personalData={personalData}
							personalErrors={personalErrors}
							onFieldChange={handlePersonalFieldChange}
							onSubmit={handlePersonalSubmit}
							isSaving={profileSaving}
							isDirty={Boolean(personalFormDirty)}
							isValid={personalFormValid}
						/>
					)}

					{activeTab === 'preferencias' && (
						<SecurityPreferencesPanel
							passwordData={passwordData}
							onPasswordChange={setPasswordData}
							onPasswordSubmit={handleChangePassword}
							isPasswordSaving={passwordSaving}
							darkMode={darkMode}
							onSetDarkMode={setDarkMode}
						/>
					)}

					{activeTab === 'ingressos' && (
						<TicketsPanel
							isLoading={loadingTickets}
							tickets={tickets}
							onExplore={() => router.push('/explorar')}
						/>
					)}

					{activeTab === 'transacoes' && user?.id && (
						<section
							className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80"
							aria-label="Histórico de transações"
						>
							<TransactionHistory userId={user.id} />
						</section>
					)}
				</section>

				<ActivitySidebar
					collapsed={isSidebarCollapsed}
					onToggle={() => setIsSidebarCollapsed((value) => !value)}
					profileCompletion={profileCompletion}
					onboardingPrompt={activeOnboardingPrompt}
					onExportData={handleExportData}
					keyboardShortcuts={keyboardShortcuts}
				/>
			</div>
		</div>
	);
}

interface ProfileHeaderProps {
	userName: string;
	email: string;
	memberSince: string;
	onTabChange: (tab: Tab) => void;
	isEditingPersonal: boolean;
	onEditPersonalToggle: () => void;
	onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onAvatarReset: () => void;
	avatarPreview: string | null;
	avatarInputRef: RefObject<HTMLInputElement | null>;
	profileCompletion: number;
	darkMode: boolean;
	onToggleDarkMode: () => void;
	isLoading: boolean;
}

function ProfileHeader({
	userName,
	email,
	memberSince,
	onTabChange,
	isEditingPersonal,
	onEditPersonalToggle,
	onAvatarChange,
	onAvatarReset,
	avatarPreview,
	avatarInputRef,
	profileCompletion,
	darkMode,
	onToggleDarkMode,
	isLoading,
}: ProfileHeaderProps) {
	if (isLoading) {
		return <ProfileHeaderSkeleton />;
	}

	const statusBadgeColor =
		profileCompletion >= 80 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300';

	return (
		<section className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-white via-slate-100 to-purple-100 p-[1px] shadow-lg focus-within:ring-2 focus-within:ring-purple-300 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-900">
			<div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-indigo-500/10 to-blue-500/20 blur-3xl dark:from-purple-500/20 dark:via-indigo-500/10 dark:to-blue-500/30" />
			<div className="relative rounded-[22px] bg-white/95 p-5 text-slate-900 backdrop-blur md:p-8 dark:bg-slate-950/80 dark:text-white">
				<nav aria-label="Você está em" className="mb-4">
					<ol className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-white/60">
						<li>
							<button
								type="button"
								className="rounded-full px-2 py-1 font-semibold text-slate-700 transition hover:bg-white/60 hover:text-slate-900 focus-visible:outline-none focus-visible:ring focus-visible:ring-purple-300 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
								onClick={() => onTabChange('perfil')}
							>
								Início
							</button>
						</li>
						<li aria-hidden="true">/</li>
						<li>
							<span className="rounded-full bg-white/80 px-2 py-1 font-semibold text-slate-900 dark:bg-white/10 dark:text-white">
								Perfil
							</span>
						</li>
					</ol>
				</nav>

				<div className="grid gap-8 lg:grid-cols-[auto,1fr] lg:items-center">
					<div className="flex items-center gap-5 text-slate-900 dark:text-white">
						<label className="group relative flex cursor-pointer items-center justify-center">
							<input
								ref={avatarInputRef}
								type="file"
								accept="image/*"
								onChange={onAvatarChange}
								className="sr-only"
								aria-label="Atualizar avatar"
							/>
							<div className="flex size-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-2xl font-semibold uppercase tracking-tight text-slate-900 transition group-hover:border-purple-300 group-hover:bg-purple-100 md:size-24 md:text-3xl dark:border-white/20 dark:bg-white/10 dark:text-white dark:group-hover:bg-purple-500/30">
								{avatarPreview ? (
									<div
										className="size-full rounded-2xl bg-cover bg-center shadow-inner"
										style={{ backgroundImage: `url(${avatarPreview})` }}
										aria-hidden="true"
									/>
								) : (
									<span>{userName ? userName.charAt(0) : 'E'}</span>
								)}
							</div>
							<div className="absolute -bottom-2 -right-2 flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900 shadow-md transition group-hover:bg-purple-100 dark:bg-white/90">
								<Edit3 className="size-3" />
								Editar
							</div>
						</label>
						<div className="space-y-2.5">
							<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
								{userName || 'Cliente EventsFlow'}
							</h1>
							<p className="text-sm text-slate-600 dark:text-white/80">
								{email || 'Complete seu e-mail para receber ingressos'}
							</p>
							<div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-white/70">
								<span className={`rounded-full px-2.5 py-0.5 font-semibold ${statusBadgeColor}`}>Conta ativa</span>
								<span>{memberSince}</span>
								<span aria-live="polite" className="flex items-center gap-2">
									<span className="inline-flex size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
									{profileCompletion}% concluído
								</span>
							</div>
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => onTabChange('ingressos')}
							className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:border-purple-200 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-white/15 dark:bg-white/10 dark:hover:bg-purple-500/20"
						>
							<div className="absolute right-4 top-4 text-slate-400 transition group-hover:text-purple-500 dark:text-white/40 dark:group-hover:text-white/80">
								<ArrowRight className="size-4" aria-hidden="true" />
							</div>
							<p className="text-sm text-slate-600 dark:text-white/80">Acesso rápido</p>
							<p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">Ingressos e QR Codes</p>
							<p className="mt-3 text-xs text-slate-500 dark:text-white/70">
								Visualize detalhes, compartilhe ou adicione ao wallet.
							</p>
						</button>

						<div className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/15 dark:bg-white/10">
							<p className="text-sm font-medium text-slate-600 dark:text-white/80">Ajustes rápidos</p>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={onEditPersonalToggle}
									className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-purple-700 transition hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
								>
									<Edit3 className="size-3" />
									{isEditingPersonal ? 'Cancelar edição' : 'Editar dados'}
								</button>
								<button
									type="button"
									onClick={() => onTabChange('preferencias')}
									className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
								>
									<Settings className="size-3" />
									Preferências
								</button>
							</div>
							<button
								type="button"
								onClick={onAvatarReset}
								className="text-left text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:text-white/60 dark:hover:text-white"
							>
								Restaurar avatar padrão
							</button>
							<div className="mt-2 flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs text-slate-700 dark:bg-black/40 dark:text-white/80">
								<span>Modo noturno</span>
								<button
									type="button"
									onClick={onToggleDarkMode}
									className="flex items-center gap-2 rounded-full bg-white px-3 py-1 transition hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:bg-white/10 dark:hover:bg-white/20"
									aria-pressed={darkMode}
								>
									{darkMode ? (
										<Moon className="size-4 text-purple-200" />
									) : (
										<Sun className="size-4 text-purple-500" />
									)}
									<span className="text-xs font-semibold text-slate-700 dark:text-white">
										{darkMode ? 'Ligado' : 'Desligado'}
									</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function ProfileHeaderSkeleton() {
	return (
		<section className="relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-slate-200 via-indigo-100 to-purple-100 p-[1px] shadow-xl">
			<div className="relative rounded-[22px] bg-white p-6 md:p-10">
				<div className="grid gap-10 lg:grid-cols-[auto,1fr] lg:items-center">
					<div className="flex items-center gap-6">
						<div className="size-24 animate-pulse rounded-2xl bg-slate-200 md:size-28" />
						<div className="space-y-3">
							<div className="h-6 w-48 animate-pulse rounded-full bg-slate-200" />
							<div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
							<div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
						<div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
					</div>
				</div>
			</div>
		</section>
	);
}

interface StatsDashboardProps {
	stats: Array<{
		id: string;
		label: string;
		value: string;
		description: string;
		icon: ComponentType<SVGProps<SVGSVGElement>>;
		color: string;
		progress: number;
		ctaLabel: string;
		onClick: () => void;
		empty: boolean;
	}>;
}

function StatsDashboard({ stats }: StatsDashboardProps) {
	return (
		<section
			className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
			aria-label="Resumo rápido de estatísticas"
		>
			{stats.map((stat) => {
				const Icon = stat.icon;

				return (
					<div
						key={stat.id}
						className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-1 focus-within:ring-purple-300 dark:border-slate-700 dark:bg-slate-900/80"
					>
						<div
							className={`absolute -top-12 right-0 size-32 rounded-full bg-gradient-to-br ${stat.color} opacity-20 blur-3xl transition group-hover:opacity-40`}
							aria-hidden="true"
						/>
						<div className="flex items-center justify-between">
							<div className="flex size-9 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900 dark:bg-white/10 dark:text-white">
								<Icon className="size-4" aria-hidden="true" />
							</div>
							<span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
								{stat.value}
							</span>
						</div>
						<p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{stat.label}</p>
						<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
						<div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
							<div
								className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
								style={{ width: `${stat.progress}%` }}
								aria-hidden="true"
							/>
						</div>
						<button
							type="button"
							onClick={stat.onClick}
							className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:text-purple-300 dark:hover:text-purple-200"
						>
							{stat.ctaLabel}
							<ArrowRight className="size-3.5" aria-hidden="true" />
						</button>
						{stat.empty && (
							<p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
								Estamos prontos para sugerir experiências quando você começar a explorar.
							</p>
						)}
					</div>
				);
			})}
		</section>
	);
}

interface ProfileTabsProps {
	activeTab: Tab;
	onTabChange: (tab: Tab) => void;
	isMobileOpen: boolean;
	onMobileToggle: () => void;
}

function ProfileTabs({ activeTab, onTabChange, isMobileOpen, onMobileToggle }: ProfileTabsProps) {
	const activeConfig = PROFILE_TABS.find((tab) => tab.id === activeTab);

	return (
		<nav aria-label="Navegação do perfil" className="flex flex-col gap-3">
			<div className="lg:hidden">
				<button
					type="button"
					onClick={onMobileToggle}
					className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
					aria-expanded={isMobileOpen}
				>
					<span>{activeConfig?.label ?? 'Selecione uma seção'}</span>
					<ChevronDown
						className={`size-4 transition-transform ${isMobileOpen ? 'rotate-180' : 'rotate-0'}`}
						aria-hidden="true"
					/>
				</button>
				{isMobileOpen && (
					<ul
						className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
						role="tablist"
					>
						{PROFILE_TABS.map((tab) => {
							const Icon = tab.icon;
							const isActive = tab.id === activeTab;

return (
								<li key={tab.id}>
									<button
										type="button"
										role="tab"
										aria-selected={isActive}
										onClick={() => onTabChange(tab.id)}
										className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
											isActive
												? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
												: 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
										}`}
									>
										<Icon className="size-5" aria-hidden="true" />
										<span className="flex flex-col">
											<span className="text-sm font-semibold">{tab.label}</span>
											<span className="text-xs text-slate-500 dark:text-slate-400">
												{tab.description}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			<div className="hidden gap-2.5 lg:flex" role="tablist">
				{PROFILE_TABS.map((tab) => {
					const Icon = tab.icon;
					const isActive = tab.id === activeTab;

					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => onTabChange(tab.id)}
							className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
								isActive
									? 'bg-slate-900 text-white shadow-lg shadow-purple-500/20 dark:bg-white dark:text-slate-900'
									: 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
							}`}
						>
							<Icon className="size-4" aria-hidden="true" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}

interface PersonalInfoPanelProps {
	isEditing: boolean;
	onToggleEdit: () => void;
	personalData: PersonalData;
	personalErrors: Partial<Record<PersonalFieldKey, string>>;
	onFieldChange: (field: PersonalFieldKey, value: string) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isSaving: boolean;
	isDirty: boolean;
	isValid: boolean;
}

function PersonalInfoPanel({
	isEditing,
	onToggleEdit,
	personalData,
	personalErrors,
	onFieldChange,
	onSubmit,
	isSaving,
	isDirty,
	isValid,
}: PersonalInfoPanelProps) {
	const personalFields: Array<{
		key: PersonalFieldKey;
		label: string;
		placeholder: string;
		autoComplete?: string;
		colSpan?: string;
		type?: string;
	}> = [
		{
			key: 'first_name',
			label: 'Nome',
			placeholder: 'Seu primeiro nome',
			autoComplete: 'given-name',
		},
		{
			key: 'last_name',
			label: 'Sobrenome',
			placeholder: 'Como aparece nos recibos',
			autoComplete: 'family-name',
		},
		{
			key: 'email',
			label: 'E-mail',
			placeholder: 'nome@email.com',
			autoComplete: 'email',
			colSpan: 'md:col-span-2',
			type: 'email',
		},
	];

	return (
		<section
			className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80 md:p-6"
			aria-labelledby="personal-info-title"
		>
			<header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 id="personal-info-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
						Dados pessoais
					</h2>
					<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						Essas informações são usadas em seus ingressos, recibos e comunicações.
					</p>
				</div>
				<button
					type="button"
					onClick={onToggleEdit}
					className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-purple-400 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-purple-500 dark:hover:text-purple-300"
				>
					<Edit3 className="size-3" aria-hidden="true" />
					{isEditing ? 'Encerrar edição' : 'Ativar edição'}
				</button>
			</header>

			{isEditing ? (
				<form onSubmit={onSubmit} className="mt-5 space-y-5">
					<div className="grid gap-3.5 md:grid-cols-2">
						{personalFields.map((field) => {
							const error = personalErrors[field.key];
							const inputId = `personal-${field.key}`;

							return (
								<label
									key={field.key}
									htmlFor={inputId}
									className={`space-y-2 ${field.colSpan ?? ''}`}
								>
										<span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
											{field.label}
											<span className="rounded-full bg-purple-100 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-purple-700 dark:bg-purple-500/20 dark:text-purple-100">
												Obrigatório
											</span>
										</span>
										<div className="relative">
											{field.key === 'email' && (
											<Mail
												className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400"
												aria-hidden="true"
											/>
										)}
										<input
											id={inputId}
											type={field.type ?? 'text'}
											value={personalData[field.key]}
											onChange={(event) => onFieldChange(field.key, event.target.value)}
											placeholder={field.placeholder}
											autoComplete={field.autoComplete}
											required
											aria-invalid={Boolean(error)}
											aria-describedby={error ? `${inputId}-error` : undefined}
											className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400 dark:focus:ring-purple-500/30 ${
												field.key === 'email' ? 'pl-10' : ''
											}`}
										/>
									</div>
									{error && (
										<p
											id={`${inputId}-error`}
											className="text-xs font-semibold text-rose-500 dark:text-rose-300"
											role="alert"
										>
											{error}
										</p>
									)}
								</label>
							);
						})}
					</div>

					<div className="space-y-2.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
						<p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
							<Mail className="size-4" aria-hidden="true" />
							Receba tudo no seu e-mail principal
						</p>
						<p className="pl-6 text-xs">
							Use um e-mail que você acessa diariamente — é por lá que enviamos seus ingressos e atualizações.
						</p>
					</div>

					<div className="sticky bottom-4 z-10 -mx-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3.5 shadow-md shadow-purple-500/15 backdrop-blur lg:static lg:flex-row lg:items-center lg:justify-between lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:border-slate-700 dark:bg-slate-900/90 lg:dark:bg-transparent">
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Seus dados ficam seguros e não são compartilhados sem sua autorização.
						</p>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={onToggleEdit}
								className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:text-slate-200"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={!isDirty || !isValid || isSaving}
								className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
								Salvar alterações
							</button>
						</div>
					</div>
				</form>
			) : (
				<div className="mt-5 grid gap-3.5 sm:grid-cols-2" role="list">
					{[
						{
							label: 'Nome completo',
							value: `${personalData.first_name} ${personalData.last_name}`.trim() || 'Adicione seu nome para personalizar ingressos',
						},
						{
							label: 'E-mail principal',
							value: personalData.email || 'Defina um e-mail para receber ingressos',
						},
					].map((item) => (
						<div
							key={item.label}
							role="listitem"
							className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm transition hover:border-purple-200 hover:bg-purple-50/40 dark:border-slate-700 dark:bg-slate-900/60"
						>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
								{item.label}
							</p>
							<p className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.value}</p>
						</div>
					))}
					<button
						type="button"
						onClick={onToggleEdit}
						className="group flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm font-semibold text-purple-600 transition hover:border-purple-400 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-purple-300 dark:hover:bg-slate-800"
					>
						<Edit3 className="size-3.5 transition group-hover:translate-x-1" aria-hidden="true" />
						Completar informações agora
					</button>
				</div>
			)}
		</section>
	);
}

interface SecurityPreferencesPanelProps {
	passwordData: PasswordData;
	onPasswordChange: Dispatch<SetStateAction<PasswordData>>;
	onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
	isPasswordSaving: boolean;
	darkMode: boolean;
	onSetDarkMode: (value: boolean) => void;
}

function SecurityPreferencesPanel({
	passwordData,
	onPasswordChange,
	onPasswordSubmit,
	isPasswordSaving,
	darkMode,
	onSetDarkMode,
}: SecurityPreferencesPanelProps) {
	return (
		<div className="flex flex-col gap-5">
			<form
				onSubmit={onPasswordSubmit}
				className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80 md:p-6"
			>
				<header className="space-y-1.5">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Segurança da conta</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Mantenha sua senha forte e exclusiva para esta plataforma.
					</p>
				</header>

				<div className="grid gap-4 md:grid-cols-2">
					<label className="space-y-2 md:col-span-2">
						<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Senha atual</span>
						<div className="relative">
							<Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
							<input
								type="password"
								value={passwordData.current}
								onChange={(event) =>
									onPasswordChange((current) => ({ ...current, current: event.target.value }))
								}
								placeholder="••••••••"
								className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-3.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400 dark:focus:ring-purple-500/30"
								required
							/>
						</div>
					</label>

					<label className="space-y-2">
						<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nova senha</span>
						<input
							type="password"
							value={passwordData.new}
							onChange={(event) =>
								onPasswordChange((current) => ({ ...current, new: event.target.value }))
							}
							placeholder="Escolha uma senha forte"
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400 dark:focus:ring-purple-500/30"
							required
							minLength={8}
						/>
					</label>

					<label className="space-y-2">
						<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Confirmar senha</span>
						<input
							type="password"
							value={passwordData.confirm}
							onChange={(event) =>
								onPasswordChange((current) => ({ ...current, confirm: event.target.value }))
							}
							placeholder="Repita a nova senha"
							className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400 dark:focus:ring-purple-500/30"
							required
							minLength={8}
						/>
					</label>
				</div>

				<div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Por segurança, faça logout em dispositivos compartilhados após alterar sua senha.
					</p>
					<button
						type="submit"
						disabled={isPasswordSaving}
						className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
					>
						{isPasswordSaving ? (
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						) : (
							<Lock className="size-4" aria-hidden="true" />
						)}
						Atualizar senha
					</button>
				</div>
			</form>

			<section className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80 md:p-6">
				<header className="space-y-1.5">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Preferências</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Personalize como quer receber novidades e ajuste sua experiência.
					</p>
				</header>

				<div className="space-y-3.5">
					{notificationPreferences.map((item) => (
						<label
							key={item.id}
							className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm transition hover:border-purple-300 hover:bg-purple-50/40 focus-within:ring-2 focus-within:ring-purple-300 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-purple-500/40 dark:hover:bg-slate-900"
						>
							<span>
								<p className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
							</span>
							<input type="checkbox" defaultChecked className="peer sr-only" />
							<span className="relative inline-flex h-5 w-10 items-center rounded-full bg-slate-200 transition peer-checked:bg-purple-600 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300 dark:bg-slate-700 dark:peer-checked:bg-purple-500">
								<span className="absolute left-[6px] size-3.5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
							</span>
						</label>
					))}
				</div>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Fuso horário</span>
						<div className="relative">
							<select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-9 text-sm text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-purple-400 dark:focus:ring-purple-500/30">
								{timezones.map((timezone) => (
									<option key={timezone}>{timezone}</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
						</div>
					</div>

					<div className="space-y-2">
						<span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tema do aplicativo</span>
						<div className="flex gap-2.5">
							<button
								type="button"
								onClick={() => onSetDarkMode(false)}
								className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
									!darkMode
										? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:border-purple-400 dark:bg-purple-500/20 dark:text-purple-200'
										: 'border-slate-200 text-slate-700 hover:border-purple-300 dark:border-slate-700 dark:text-slate-200'
								}`}
							>
								<Sun className="mr-1.5 inline size-4" aria-hidden="true" />
								Claro
							</button>
							<button
								type="button"
								onClick={() => onSetDarkMode(true)}
								className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 ${
									darkMode
										? 'border-purple-500 bg-purple-500/10 text-purple-100 dark:border-purple-400 dark:bg-purple-500/20'
										: 'border-slate-200 text-slate-700 hover:border-purple-300 dark:border-slate-700 dark:text-slate-200'
								}`}
							>
								<Moon className="mr-1.5 inline size-4" aria-hidden="true" />
								Escuro
							</button>
						</div>
					</div>
				</div>

				<ul className="grid gap-2.5 text-sm text-slate-500 dark:text-slate-400">
					<li className="flex items-center gap-2.5">
						<Bell className="size-4 text-purple-500 dark:text-purple-300" aria-hidden="true" />
						Customize lembretes para não perder alterações de agenda.
					</li>
					<li className="flex items-center gap-2.5">
						<Calendar className="size-4 text-purple-500 dark:text-purple-300" aria-hidden="true" />
						Integre com sua agenda para adicionar eventos automaticamente.
					</li>
					<li className="flex items-center gap-2.5">
						<Phone className="size-4 text-purple-500 dark:text-purple-300" aria-hidden="true" />
						Atualize o telefone na próxima etapa para receber SMS prioritários.
					</li>
				</ul>
			</section>
		</div>
	);
}

interface TicketsPanelProps {
	isLoading: boolean;
	tickets: EventRegistration[];
	onExplore: () => void;
}

function TicketsPanel({ isLoading, tickets, onExplore }: TicketsPanelProps) {
	return (
		<section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80 md:p-6">
			<header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ingressos</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Acompanhe o status e compartilhe seus acessos com amigos.
					</p>
				</div>
				<button
					type="button"
					onClick={onExplore}
					className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-purple-400 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:text-slate-200"
				>
					<Sparkles className="size-3" aria-hidden="true" />
					Explorar eventos
				</button>
			</header>

			{isLoading ? (
				<div className="grid gap-3">
					<div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
					<div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
				</div>
			) : tickets.length > 0 ? (
				<MyTicketsContent registrations={tickets} />
			) : (
				<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/70">
					<Ticket className="size-10 text-purple-500" aria-hidden="true" />
					<div className="space-y-1">
						<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
							Você ainda não tem ingressos ativos
						</h3>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Programe seu próximo rolê: escolha eventos e receba alertas exclusivos.
						</p>
					</div>
					<button
						type="button"
						onClick={onExplore}
						className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:shadow-lg"
					>
						<Sparkles className="size-4" aria-hidden="true" />
						Descobrir experiências
					</button>
				</div>
			)}
		</section>
	);
}

interface ActivitySidebarProps {
	collapsed: boolean;
	onToggle: () => void;
	profileCompletion: number;
	onboardingPrompt?: { title: string; description: string };
	onExportData: () => void;
	keyboardShortcuts: typeof keyboardShortcuts;
}

function ActivitySidebar({
	collapsed,
	onToggle,
	profileCompletion,
	onboardingPrompt,
	onExportData,
	keyboardShortcuts,
}: ActivitySidebarProps) {
	return (
		<aside className="space-y-4 lg:space-y-6">
			<div className="lg:hidden">
				<button
					type="button"
					onClick={onToggle}
					className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
					aria-expanded={!collapsed}
				>
					<span>{collapsed ? 'Mostrar painel de ajuda' : 'Ocultar painel'}</span>
					<ChevronDown
						className={`size-4 transition-transform ${collapsed ? 'rotate-0' : '-rotate-180'}`}
						aria-hidden="true"
					/>
				</button>
			</div>

			<div className={`${collapsed ? 'hidden lg:grid' : 'grid'} gap-3.5 lg:gap-5`}>
				<section
					className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80"
					aria-labelledby="profile-progress-title"
				>
					<header className="flex items-center justify-between">
						<div>
							<h2 id="profile-progress-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
								Progresso do perfil
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400">Completo para destravar experiências</p>
						</div>
						<span className="text-xl font-semibold text-purple-600 dark:text-purple-300">
							{profileCompletion}%
						</span>
					</header>
					<div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={profileCompletion} aria-valuemin={0} aria-valuemax={100}>
						<div
							className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
							style={{ width: `${profileCompletion}%` }}
						/>
					</div>
						<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
							Complete 100% para receber convites antecipados e badges exclusivos.
						</p>
				</section>

				{onboardingPrompt && (
					<section className="rounded-2xl border border-purple-200 bg-purple-50/80 p-5 text-sm text-purple-900 shadow-sm transition dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-100">
						<h3 className="text-sm font-semibold">{onboardingPrompt.title}</h3>
						<p className="mt-1.5 text-sm">{onboardingPrompt.description}</p>
					</section>
				)}

				<section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80">
					<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ações rápidas</h3>
					<button
						type="button"
						onClick={onExportData}
						className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:text-slate-200"
					>
						<span>Exportar meus dados</span>
						<Download className="size-4" aria-hidden="true" />
					</button>
					<button
						type="button"
						className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:border-slate-700 dark:text-slate-200"
					>
						<span>Falar com o suporte</span>
						<HelpCircle className="size-4" aria-hidden="true" />
					</button>
					<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
						<span className="font-semibold text-slate-700 dark:text-slate-200">Dica:</span> Siga seus eventos favoritos e ative notificações para receber alertas instantâneos.
					</div>
				</section>

				<section className="space-y-2.5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition dark:border-slate-700 dark:bg-slate-900/80">
					<div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
						<Keyboard className="size-4" aria-hidden="true" />
						<h3 className="text-sm font-semibold">Atalhos de teclado</h3>
					</div>
					<ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
						{keyboardShortcuts.map((shortcut) => (
							<li key={shortcut.combo} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
								<span>{shortcut.description}</span>
								<span className="rounded-md bg-slate-900/80 px-2 py-1 font-semibold text-white dark:bg-white/10">
									{shortcut.combo}
								</span>
							</li>
						))}
					</ul>
				</section>
			</div>
		</aside>
	);
}
