'use client';

import type { EventPageLayout, EventPageSection } from '@events-manager/contracts';
import { Plus, Trash2 } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_PAGE_SECTION_META } from '@events-manager/contracts';

interface HeaderThemeCardProps {
	layout: EventPageLayout;
	sections: EventPageSection[];
	onChange: (patch: Partial<EventPageLayout>) => void;
}

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2 text-sm">
			<Checkbox aria-label={label} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
			{label}
		</label>
	);
}

/**
 * Cabeçalho, tema e rodapé da página. A navegação só aponta para âncoras das
 * seções existentes: a landing não tem páginas internas.
 */
export function HeaderThemeCard({ layout, sections, onChange }: HeaderThemeCardProps) {
	const { header, theme, footer } = layout;
	const setHeader = (patch: Partial<EventPageLayout['header']>) => onChange({ header: { ...header, ...patch } });
	const setNav = (nav: EventPageLayout['header']['nav']) => setHeader({ nav });
	const firstAnchor = sections[0]?.anchor ?? '';

	return (
		<div className="space-y-5 rounded-lg border bg-card p-4">
			<div>
				<h3 className="text-sm font-semibold text-foreground">Cabeçalho e tema</h3>
				<p className="text-xs text-muted-foreground">A página tem cabeçalho próprio, sem o menu do site.</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<Toggle label="Mostrar cabeçalho" checked={header.show} onChange={(show) => setHeader({ show })} />
				<Toggle label="Fixo no topo ao rolar" checked={header.sticky} onChange={(sticky) => setHeader({ sticky })} />
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="header-title">Título no cabeçalho</Label>
				<Input
					id="header-title"
					value={header.title ?? ''}
					onChange={(event) => setHeader({ title: event.target.value })}
				/>
			</div>

			<Toggle
				label="Usar a logo do organizador"
				checked={header.useOrganizerLogo}
				onChange={(useOrganizerLogo) => setHeader({ useOrganizerLogo })}
			/>
			{header.useOrganizerLogo ? null : (
				<ImageUpload
					label="Logo da página"
					value={header.logo ?? null}
					onChange={(logo) => setHeader({ logo })}
					folder="events"
					cropAspectRatio={null}
				/>
			)}

			<div className="space-y-1.5">
				<Label htmlFor="header-cta">Texto do botão de compra</Label>
				<Input
					id="header-cta"
					value={header.ctaLabel}
					onChange={(event) => setHeader({ ctaLabel: event.target.value })}
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<p className="text-sm font-medium">Navegação</p>
					<span className="text-xs text-muted-foreground">{header.nav.length} de 8</span>
				</div>
				{header.nav.map((item, index) => (
					<div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
						<div className="space-y-1">
							<Label htmlFor={`nav-label-${index}`} className="text-xs">
								Texto do link {index + 1}
							</Label>
							<Input
								id={`nav-label-${index}`}
								value={item.label}
								onChange={(event) =>
									setNav(header.nav.map((nav, i) => (i === index ? { ...nav, label: event.target.value } : nav)))
								}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`nav-anchor-${index}`} className="text-xs">
								Seção do link {index + 1}
							</Label>
							<Select
								value={item.anchor}
								onValueChange={(anchor) => setNav(header.nav.map((nav, i) => (i === index ? { ...nav, anchor } : nav)))}
							>
								<SelectTrigger id={`nav-anchor-${index}`} aria-label={`Seção do link ${index + 1}`}>
									<SelectValue placeholder="Escolha a seção" />
								</SelectTrigger>
								<SelectContent>
									{sections.map((section) => (
										<SelectItem key={section.id} value={section.anchor}>
											{section.title || EVENT_PAGE_SECTION_META[section.type].label} (#{section.anchor})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							onClick={() => setNav(header.nav.filter((_, i) => i !== index))}
							aria-label={`Remover link ${index + 1}`}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))}
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full border-dashed"
					disabled={header.nav.length >= 8 || sections.length === 0}
					onClick={() => setNav([...header.nav, { label: 'Novo link', anchor: firstAnchor }])}
				>
					<Plus className="mr-2 size-4" />
					Adicionar link
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="theme-mode">Tema</Label>
					<Select
						value={theme.mode}
						onValueChange={(mode) => onChange({ theme: { ...theme, mode: mode as 'light' | 'dark' } })}
					>
						<SelectTrigger id="theme-mode">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="light">Claro</SelectItem>
							<SelectItem value="dark">Escuro</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="theme-accent-hex">Cor de destaque (hex)</Label>
					<div className="flex items-center gap-2">
						<input
							type="color"
							aria-label="Cor de destaque"
							value={theme.accent ?? '#6644ff'}
							onChange={(event) => onChange({ theme: { ...theme, accent: event.target.value } })}
							className="size-9 cursor-pointer rounded border bg-transparent p-0.5"
						/>
						<Input
							id="theme-accent-hex"
							value={theme.accent ?? ''}
							placeholder="#6644ff"
							onChange={(event) => onChange({ theme: { ...theme, accent: event.target.value || null } })}
						/>
					</div>
				</div>
			</div>

			<div className="space-y-3 border-t pt-4">
				<p className="text-sm font-medium">Rodapé</p>
				<Toggle
					label="Mostrar organizador no rodapé"
					checked={footer.showOrganizer}
					onChange={(showOrganizer) => onChange({ footer: { ...footer, showOrganizer } })}
				/>
				<div className="space-y-1.5">
					<Label htmlFor="footer-note">Nota do rodapé</Label>
					<Input
						id="footer-note"
						value={footer.note ?? ''}
						onChange={(event) => onChange({ footer: { ...footer, note: event.target.value } })}
					/>
				</div>
			</div>
		</div>
	);
}
