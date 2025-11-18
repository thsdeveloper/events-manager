'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/ui/container';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Heart, Mail, MapPin, Phone, Sparkles, Trophy } from 'lucide-react';

interface SocialLink {
	service: string;
	url: string;
}

interface NavigationItem {
	id: string;
	title: string;
	url?: string | null;
	page?: { permalink?: string | null };
}

interface FooterProps {
	navigation: { items: NavigationItem[] };
	globals: {
		logo?: string | null;
		logo_dark_mode?: string | null;
		description?: string | null;
		social_links?: SocialLink[];
	};
}

const Footer = forwardRef<HTMLElement, FooterProps>(({ navigation, globals }, ref) => {
        const directusURL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
        const lightLogoUrl = globals?.logo ? `${directusURL}/assets/${globals.logo}` : '/images/logo.svg';
        const darkLogoUrl = globals?.logo_dark_mode ? `${directusURL}/assets/${globals.logo_dark_mode}` : '';
        const currentYear = new Date().getFullYear();

        const socialIconMap: Record<string, string> = {
                facebook: '/icons/social/facebook.svg',
                instagram: '/icons/social/instagram.svg',
                linkedin: '/icons/social/linkedin.svg',
                youtube: '/icons/social/youtube.svg',
                github: '/icons/social/github.svg',
                x: '/icons/social/x.svg',
                reddit: '/icons/social/reddit.svg',
                discord: '/icons/social/discord.svg',
        };

        return (
                <footer
                        ref={ref}
                        className="relative isolate overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950 text-slate-100"
                >
                        <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute -top-40 -right-32 size-72 rounded-full bg-indigo-500/10 blur-3xl" />
                                <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-purple-500/10 blur-3xl" />
                                <div className="absolute inset-x-0 top-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </div>

                        <Container className="relative z-10 py-16 md:py-20 space-y-12">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-5 space-y-6">
                                                <Link href="/" className="inline-flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 shadow-lg shadow-purple-500/10 ring-1 ring-white/5 transition hover:-translate-y-0.5 hover:shadow-purple-500/20">
                                                        <div className="relative w-[140px]">
                                                                <Image
                                                                        src={lightLogoUrl}
                                                                        alt="Logo"
                                                                        width={160}
                                                                        height={64}
                                                                        className="h-auto w-[140px] dark:hidden"
                                                                        priority
                                                                />
                                                                {darkLogoUrl && (
                                                                        <Image
                                                                                src={darkLogoUrl}
                                                                                alt="Logo (Dark Mode)"
                                                                                width={160}
                                                                                height={64}
                                                                                className="hidden h-auto w-[140px] dark:block"
                                                                                priority
                                                                        />
                                                                )}
                                                        </div>
                                                        <span className="rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-50 ring-1 ring-white/5">
                                                                Plataforma de eventos moderna
                                                        </span>
                                                </Link>

                                                {globals?.description && (
                                                        <p className="max-w-xl text-sm leading-relaxed text-slate-200/80">
                                                                {globals.description}
                                                        </p>
                                                )}

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200/90 shadow-inner shadow-black/10">
                                                                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-100">
                                                                        <Sparkles className="size-4" />
                                                                </span>
                                                                <div>
                                                                        <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Experiências</p>
                                                                        <p className="font-semibold text-slate-50">Comunidades memoráveis</p>
                                                                </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200/90 shadow-inner shadow-black/10">
                                                                <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/30 text-indigo-100">
                                                                        <Trophy className="size-4" />
                                                                </span>
                                                                <div>
                                                                        <p className="text-xs uppercase tracking-[0.08em] text-slate-400">+1200 eventos</p>
                                                                        <p className="font-semibold text-slate-50">Resultados comprovados</p>
                                                                </div>
                                                        </div>
                                                </div>

                                                {globals?.social_links && globals.social_links.length > 0 && (
                                                        <div className="space-y-3">
                                                                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Conecte-se</p>
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                        {globals.social_links.map((social) => (
                                                                                <a
                                                                                        key={social.service}
                                                                                        href={social.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="group relative flex size-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-purple-500/10 transition hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-gradient-to-b hover:from-white/10 hover:to-indigo-500/10"
                                                                                        aria-label={`Ir para ${social.service}`}
                                                                                >
                                                                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-0 transition group-hover:opacity-100" />
                                                                                        {socialIconMap[social.service] ? (
                                                                                                <Image
                                                                                                        src={socialIconMap[social.service]}
                                                                                                        alt={`${social.service} icon`}
                                                                                                        width={24}
                                                                                                        height={24}
                                                                                                        className="relative z-10 size-5 invert"
                                                                                                />
                                                                                        ) : (
                                                                                                <span className="relative z-10 text-xs capitalize text-slate-200">{social.service}</span>
                                                                                        )}
                                                                                </a>
                                                                        ))}
                                                                </div>
                                                        </div>
                                                )}
                                        </div>

                                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                                <div className="space-y-4">
                                                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                                                                Navegação
                                                        </h3>
                                                        <nav>
                                                                <ul className="space-y-3 text-sm text-slate-200/80">
                                                                        {navigation?.items?.map((item) => (
                                                                                <li key={item.id}>
                                                                                        {item.page?.permalink ? (
                                                                                                <Link
                                                                                                        href={item.page.permalink}
                                                                                                        className="group inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/5 hover:text-white"
                                                                                                >
                                                                                                        <span className="size-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 group-hover:w-3" />
                                                                                                        {item.title}
                                                                                                </Link>
                                                                                        ) : (
                                                                                                <a
                                                                                                        href={item.url || '#'}
                                                                                                        className="group inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/5 hover:text-white"
                                                                                                >
                                                                                                        <span className="size-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 group-hover:w-3" />
                                                                                                        {item.title}
                                                                                                </a>
                                                                                        )}
                                                                                </li>
                                                                        ))}
                                                                </ul>
                                                        </nav>
                                                </div>

                                                <div className="space-y-4">
                                                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                                                                Institucional
                                                        </h3>
                                                        <ul className="space-y-3 text-sm text-slate-200/80">
                                                                <li>
                                                                        <Link href="/sobre" className="transition hover:text-white">
                                                                                Sobre a plataforma
                                                                        </Link>
                                                                </li>
                                                                <li>
                                                                        <Link href="/ajuda" className="transition hover:text-white">
                                                                                Central de ajuda
                                                                        </Link>
                                                                </li>
                                                                <li>
                                                                        <Link href="/blog" className="transition hover:text-white">
                                                                                Blog e novidades
                                                                        </Link>
                                                                </li>
                                                                <li>
                                                                        <Link href="/planos" className="transition hover:text-white">
                                                                                Planos e preços
                                                                        </Link>
                                                                </li>
                                                        </ul>
                                                </div>

                                                <div className="space-y-4">
                                                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                                                                Contato
                                                        </h3>
                                                        <ul className="space-y-3 text-sm text-slate-200/80">
                                                                <li className="flex gap-3">
                                                                        <Mail className="mt-0.5 size-4 text-indigo-300" />
                                                                        <div>
                                                                                <p className="text-slate-400">E-mail</p>
                                                                                <a href="mailto:contato@exemplo.com" className="font-semibold text-slate-50 transition hover:text-white">
                                                                                        contato@exemplo.com
                                                                                </a>
                                                                        </div>
                                                                </li>
                                                                <li className="flex gap-3">
                                                                        <Phone className="mt-0.5 size-4 text-indigo-300" />
                                                                        <div>
                                                                                <p className="text-slate-400">Telefone</p>
                                                                                <a href="tel:+5511999999999" className="font-semibold text-slate-50 transition hover:text-white">
                                                                                        (11) 99999-9999
                                                                                </a>
                                                                        </div>
                                                                </li>
                                                                <li className="flex gap-3">
                                                                        <MapPin className="mt-0.5 size-4 text-indigo-300" />
                                                                        <div>
                                                                                <p className="text-slate-400">Base</p>
                                                                                <p className="font-semibold text-slate-50">São Paulo, SP - Brasil</p>
                                                                        </div>
                                                                </li>
                                                                <li className="flex gap-3">
                                                                        <Heart className="mt-0.5 size-4 text-rose-200" />
                                                                        <div>
                                                                                <p className="text-slate-400">Horário</p>
                                                                                <p className="font-semibold text-slate-50">Seg a Sex • 9h às 18h</p>
                                                                        </div>
                                                                </li>
                                                        </ul>
                                                </div>
                                        </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 rounded-2xl border border-white/5 bg-white/5 p-6 text-sm text-slate-100 shadow-inner shadow-black/10 lg:grid-cols-12">
                                        <div className="lg:col-span-8 space-y-2">
                                                <p className="text-xs uppercase tracking-[0.08em] text-slate-400">Fique por dentro</p>
                                                <p className="text-lg font-semibold text-white">Receba tendências, agendas e dicas exclusivas de organização de eventos.</p>
                                                <p className="max-w-2xl text-slate-200/80">Conteúdos selecionados pela nossa equipe para ajudar você a criar experiências memoráveis e manter sua comunidade sempre engajada.</p>
                                        </div>
                                        <div className="lg:col-span-4 flex flex-col gap-3">
                                                <label className="text-xs uppercase tracking-[0.08em] text-slate-400" htmlFor="newsletter-email">
                                                        Newsletter
                                                </label>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                        <input
                                                                id="newsletter-email"
                                                                type="email"
                                                                placeholder="Seu e-mail"
                                                                className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-indigo-400/60 focus:bg-white/15"
                                                        />
                                                        <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] hover:shadow-indigo-500/30"
                                                        >
                                                                Quero receber
                                                        </button>
                                                </div>
                                                <p className="text-xs text-slate-400">Enviamos somente conteúdos relevantes e você pode sair quando quiser.</p>
                                        </div>
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                                <div className="flex flex-col gap-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
                                        <p className="flex items-center gap-1.5">
                                                © {currentYear} Todos os direitos reservados.
                                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-white">
                                                        Feito com <Heart className="size-3 text-rose-300" /> para comunidades incríveis.
                                                </span>
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4">
                                                <Link href="/politica-privacidade" className="transition hover:text-white">
                                                        Política de Privacidade
                                                </Link>
                                                <Link href="/termos-uso" className="transition hover:text-white">
                                                        Termos de Uso
                                                </Link>
                                                <ThemeToggle />
                                        </div>
                                </div>
                        </Container>
                </footer>
        );
});

Footer.displayName = 'Footer';
export default Footer;
