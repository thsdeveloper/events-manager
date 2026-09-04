'use client';

import { useState, forwardRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuTrigger,
	NavigationMenuContent,
	NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Ticket, Calendar, CalendarCheck, Building2, Clock, LogIn } from 'lucide-react';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Menu } from '@/components/animate-ui/icons/menu';
import { X } from '@/components/animate-ui/icons/x';
import SearchModal from '@/components/ui/SearchModal';
import { UserMenu } from '@/components/layout/UserMenu';
import Container from '@/components/ui/container';
import { useServerAuth } from '@/hooks/useServerAuth';
import { getMediaAssetUrl } from '@/lib/media';

interface NavigationBarProps {
	navigation: any;
	globals: any;
}

const NavigationBar = forwardRef<HTMLElement, NavigationBarProps>(({ navigation, globals }, ref) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const { isOrganizer, isAuthenticated, isLoading, hasPendingOrganizerRequest, user, logout } = useServerAuth();
	// Só depois de a sessão ser checada: enquanto carrega, nem "Entrar" nem o menu
	// aparecem, para o header não piscar de um estado para o outro.
	const showSignIn = !isLoading && !isAuthenticated;

	const lightLogoUrl = globals?.logo ? getMediaAssetUrl(globals.logo) : '/images/logo.svg';
	const darkLogoUrl = globals?.logo_dark_mode ? getMediaAssetUrl(globals.logo_dark_mode) : '';

	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};
		window.addEventListener('scroll', handleScroll);

return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const handleLinkClick = () => {
		setMenuOpen(false);
	};

	return (
		<header
			ref={ref}
			className={`sticky top-0 z-50 w-full transition-all duration-300 ${
				scrolled
					? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-gray-200 dark:border-gray-800'
					: 'bg-transparent'
			}`}
		>
			<Container className="flex items-center justify-between py-4">
				<Link href="/" className="flex-shrink-0 group">
					<div className="relative">
						<Image
							src={lightLogoUrl}
							alt="Logo"
							width={150}
							height={100}
							className="w-[140px] h-auto dark:hidden transition-transform group-hover:scale-105"
							priority
						/>
						{darkLogoUrl && (
							<Image
								src={darkLogoUrl}
								alt="Logo (Dark Mode)"
								width={150}
								height={100}
								className="w-[140px] h-auto hidden dark:block transition-transform group-hover:scale-105"
								priority
							/>
						)}
					</div>
				</Link>

				<nav className="flex items-center gap-3">
					<NavigationMenu className="hidden lg:flex">
						<NavigationMenuList className="flex gap-1">
							{navigation?.items?.map((section: any) => (
								<NavigationMenuItem key={section.id}>
									{section.children && section.children.length > 0 ? (
										<>
											<NavigationMenuTrigger className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 focus:outline-none group">
												<span className="font-semibold text-sm tracking-wide">{section.title}</span>
											</NavigationMenuTrigger>
											<NavigationMenuContent className="mt-2 min-w-[200px] rounded-lg bg-white dark:bg-slate-900 p-3 shadow-2xl border border-gray-100 dark:border-gray-800">
												<ul className="flex flex-col gap-1">
													{section.children.map((child: any) => (
														<li key={child.id}>
															<NavigationMenuLink
																href={child.page?.permalink || child.url || '#'}
																className="block px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-medium text-sm"
															>
																{child.title}
															</NavigationMenuLink>
														</li>
													))}
												</ul>
											</NavigationMenuContent>
										</>
									) : (
										<NavigationMenuLink
											href={section.page?.permalink || section.url || '#'}
											className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-semibold text-sm tracking-wide"
										>
											{section.title}
										</NavigationMenuLink>
									)}
								</NavigationMenuItem>
							))}
						</NavigationMenuList>
					</NavigationMenu>

					<div className="hidden lg:flex items-center gap-2 border-l border-gray-300 dark:border-gray-700 pl-3 ml-2">
						<SearchModal />
						{showSignIn && (
							<Button size="sm" asChild className="gap-2">
								<Link href="/login">
									<LogIn className="size-4" />
									<span>Entrar</span>
								</Link>
							</Button>
						)}
						{isAuthenticated && (
							<>
								{isOrganizer && (
									<>
										<Button variant="ghost" size="sm" asChild className="gap-2">
											<Link href="/admin/eventos/novo">
												<Calendar className="size-4" />
												<span className="hidden xl:inline">Criar evento</span>
											</Link>
										</Button>
										<Button variant="ghost" size="sm" asChild className="gap-2">
											<Link href="/admin/eventos">
												<CalendarCheck className="size-4" />
												<span className="hidden xl:inline">Meus eventos</span>
											</Link>
										</Button>
									</>
								)}
								<Button variant="ghost" size="sm" asChild className="gap-2">
									<Link href="/perfil?section=ingressos">
										<Ticket className="size-4" />
										<span className="hidden xl:inline">Meus ingressos</span>
									</Link>
								</Button>
								{!isOrganizer && (
									<Button
										size="sm"
										asChild
										className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-300 relative group hover:from-emerald-400 hover:to-green-500"
									>
										<Link href="/perfil/organizador">
											<Building2 className="size-4 group-hover:scale-500 transition-transform" />
											<span className="hidden xl:inline font-semibold">Vender ingressos</span>
											{hasPendingOrganizerRequest && (
												<Badge
													className="absolute -top-1 -right-1 size-2 p-0 bg-amber-400 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"
													aria-label="Processo de ativação pendente"
												>
													<span className="sr-only">Pendente</span>
												</Badge>
											)}
										</Link>
									</Button>
								)}
								{user ? <UserMenu user={user} onLogout={logout} /> : null}
							</>
						)}
					</div>

					<div className="flex lg:hidden items-center gap-2">
						<SearchModal />
						{showSignIn && (
							<Button size="icon" asChild>
								<Link href="/login" aria-label="Entrar">
									<LogIn className="size-4" />
								</Link>
							</Button>
						)}
						{isAuthenticated && (
							<>
								{isOrganizer && (
									<>
										<Button variant="ghost" size="icon" asChild>
											<Link href="/admin/eventos/novo" aria-label="Criar evento">
												<Calendar className="size-4" />
											</Link>
										</Button>
										<Button variant="ghost" size="icon" asChild>
											<Link href="/admin/eventos" aria-label="Meus eventos">
												<CalendarCheck className="size-4" />
											</Link>
										</Button>
									</>
								)}
								<Button variant="ghost" size="icon" asChild>
									<Link href="/perfil?section=ingressos" aria-label="Meus ingressos">
										<Ticket className="size-4" />
									</Link>
								</Button>
								{!isOrganizer && (
									<Button
										size="icon"
										asChild
										className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 relative group"
									>
										<Link href="/perfil/organizador" aria-label="Perfil de organizador">
											<Building2 className="size-4 group-hover:scale-110 transition-transform" />
											{hasPendingOrganizerRequest && (
												<Badge
													className="absolute -top-1 -right-1 size-2 p-0 bg-amber-400 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"
													aria-label="Processo de ativação pendente"
												>
													<span className="sr-only">Pendente</span>
												</Badge>
											)}
										</Link>
									</Button>
								)}
								{user ? <UserMenu user={user} onLogout={logout} /> : null}
							</>
						)}
						<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
									className="relative size-10 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300"
								>
									{menuOpen ? <X className="size-5" animateOnHover /> : <Menu className="size-5" animateOnHover />}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="w-screen max-w-sm mt-2 rounded-lg bg-white dark:bg-slate-900 p-4 shadow-2xl border border-gray-100 dark:border-gray-800"
							>
								<div className="flex flex-col gap-2">
									{navigation?.items?.map((section: any) => (
										<div key={section.id}>
											{section.children && section.children.length > 0 ? (
												<Collapsible>
													<AnimateIcon animateOnHover>
														<CollapsibleTrigger className="w-full px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 text-left flex items-center justify-between focus:outline-none font-semibold text-sm">
															<span>{section.title}</span>
															<ChevronDown className="size-4" />
														</CollapsibleTrigger>
													</AnimateIcon>
													<CollapsibleContent className="ml-4 mt-2 flex flex-col gap-1">
														{section.children.map((child: any) => (
															<Link
																key={child.id}
																href={child.page?.permalink || child.url || '#'}
																className="px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-medium text-sm"
																onClick={handleLinkClick}
															>
																{child.title}
															</Link>
														))}
													</CollapsibleContent>
												</Collapsible>
											) : (
												<Link
													href={section.page?.permalink || section.url || '#'}
													className="block px-4 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-600 hover:text-white transition-all duration-300 font-semibold text-sm"
													onClick={handleLinkClick}
												>
													{section.title}
												</Link>
											)}
										</div>
									))}
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</nav>
			</Container>
		</header>
	);
});
NavigationBar.displayName = 'NavigationBar';
export default NavigationBar;
