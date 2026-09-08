'use client';

import { CMS_SOCIAL_SERVICES, cmsSiteSettingsInputSchema } from '@events-manager/contracts';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { firstError, validateWith } from '../lib/validation';
import type { CmsMedia, CmsSiteSettings } from '../types';
import { Field, FieldError, SectionCard } from './FormPrimitives';
import { MediaPicker } from './MediaPicker';

type SocialService = (typeof CMS_SOCIAL_SERVICES)[number];

const SOCIAL_LABELS: Record<SocialService, string> = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	linkedin: 'LinkedIn',
	x: 'X (Twitter)',
	vimeo: 'Vimeo',
	youtube: 'YouTube',
	github: 'GitHub',
	discord: 'Discord',
	docker: 'Docker',
};

interface SocialLinkState {
	service: SocialService;
	url: string;
}

export function SiteSettingsForm({ settings }: { settings: CmsSiteSettings }) {
	const router = useRouter();
	const { toast } = useToast();
	const id = useId();
	const [title, setTitle] = useState(settings.title ?? '');
	const [description, setDescription] = useState(settings.description ?? '');
	const [tagline, setTagline] = useState(settings.tagline ?? '');
	const [url, setUrl] = useState(settings.url ?? '');
	const [accentColor, setAccentColor] = useState(settings.accent_color ?? '#6644ff');
	const [socialLinks, setSocialLinks] = useState<SocialLinkState[]>(
		(settings.social_links ?? []).map((link) => ({ service: link.service as SocialService, url: link.url })),
	);
	const [favicon, setFavicon] = useState<CmsMedia | null>(settings.favicon);
	const [logo, setLogo] = useState<CmsMedia | null>(settings.logo);
	const [logoDark, setLogoDark] = useState<CmsMedia | null>(settings.logo_dark_mode);
	const [ogImage, setOgImage] = useState<CmsMedia | null>(settings.default_og_image);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const colorIsValid = /^#[0-9a-fA-F]{6}$/.test(accentColor);

	async function save() {
		setFormError(null);
		const validation = validateWith(cmsSiteSettingsInputSchema, {
			title,
			description: description || null,
			tagline: tagline || null,
			url: url || null,
			accent_color: accentColor,
			social_links: socialLinks,
			favicon: favicon?.id ?? null,
			logo: logo?.id ?? null,
			logo_dark_mode: logoDark?.id ?? null,
			default_og_image: ogImage?.id ?? null,
		});
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			await cmsRequest('/site', { method: 'PATCH', body: validation.data });
			await revalidateCmsContent();
			toast({ title: 'Configurações salvas', description: 'O site já reflete a nova identidade.', variant: 'success' });
			router.refresh();
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	function updateLink(index: number, patch: Partial<SocialLinkState>) {
		setSocialLinks((links) => links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
	}

	return (
		<div className="space-y-6">
			{formError && (
				<p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{formError}
				</p>
			)}
			<div className="grid gap-6 xl:grid-cols-2">
				<SectionCard title="Identidade" description="Nome, descrição padrão e endereço público do site.">
					<Field id={`${id}-title`} label="Nome do site" error={firstError(errors, 'title')}>
						<Input id={`${id}-title`} value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
					</Field>
					<Field
						id={`${id}-tagline`}
						label="Tagline"
						counter={{ value: tagline, max: 120 }}
						error={firstError(errors, 'tagline')}
					>
						<Input
							id={`${id}-tagline`}
							value={tagline}
							maxLength={120}
							onChange={(event) => setTagline(event.target.value)}
						/>
					</Field>
					<Field
						id={`${id}-description`}
						label="Descrição (meta description padrão)"
						counter={{ value: description, max: 300 }}
						hint="Usada quando a página ou o post não define a própria descrição."
						error={firstError(errors, 'description')}
					>
						<Textarea
							id={`${id}-description`}
							rows={3}
							maxLength={300}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
						/>
					</Field>
					<Field
						id={`${id}-url`}
						label="URL pública"
						hint="Base dos links no sitemap e nas redes sociais."
						error={firstError(errors, 'url')}
					>
						<Input
							id={`${id}-url`}
							type="url"
							placeholder="https://"
							value={url}
							onChange={(event) => setUrl(event.target.value)}
						/>
					</Field>
					<div className="space-y-1.5">
						<Label htmlFor={`${id}-color-hex`}>Cor de destaque (hex)</Label>
						<div className="flex items-center gap-3">
							<input
								type="color"
								aria-label="Escolher cor de destaque"
								value={colorIsValid ? accentColor : '#6644ff'}
								onChange={(event) => setAccentColor(event.target.value)}
								className="size-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
							/>
							<Input
								id={`${id}-color-hex`}
								value={accentColor}
								maxLength={7}
								onChange={(event) => setAccentColor(event.target.value)}
								className="max-w-[160px] font-mono"
							/>
							<span
								className="size-10 rounded-lg border border-slate-200"
								style={{ backgroundColor: colorIsValid ? accentColor : 'transparent' }}
								aria-hidden
							/>
						</div>
						<FieldError message={firstError(errors, 'accent_color')} />
					</div>
				</SectionCard>

				<SectionCard title="Imagens" description="Favicon, logos e a imagem padrão de compartilhamento.">
					<div className="space-y-1.5">
						<Label>Favicon</Label>
						<MediaPicker value={favicon} onChange={setFavicon} label="favicon" compact />
					</div>
					<div className="space-y-1.5">
						<Label>Logo</Label>
						<MediaPicker value={logo} onChange={setLogo} label="logo" compact />
					</div>
					<div className="space-y-1.5">
						<Label>Logo para tema escuro</Label>
						<MediaPicker value={logoDark} onChange={setLogoDark} label="logo escura" compact />
					</div>
					<div className="space-y-1.5">
						<Label>Imagem OG padrão</Label>
						<MediaPicker value={ogImage} onChange={setOgImage} label="imagem OG padrão" compact />
					</div>
				</SectionCard>
			</div>

			<SectionCard
				title="Redes sociais"
				description="Aparecem no rodapé do site."
				actions={
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={socialLinks.length >= 12}
						onClick={() => setSocialLinks((links) => [...links, { service: 'instagram', url: '' }])}
					>
						<Plus className="mr-2 size-4" />
						Adicionar rede
					</Button>
				}
			>
				{socialLinks.length === 0 && <p className="text-sm text-slate-500">Nenhuma rede cadastrada.</p>}
				{socialLinks.map((link, index) => (
					<div key={index} className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
						<div className="space-y-1.5">
							<Label htmlFor={`${id}-social-${index}`}>Rede</Label>
							<Select
								value={link.service}
								onValueChange={(service) => updateLink(index, { service: service as SocialService })}
							>
								<SelectTrigger id={`${id}-social-${index}`}>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CMS_SOCIAL_SERVICES.map((service) => (
										<SelectItem key={service} value={service}>
											{SOCIAL_LABELS[service]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Field id={`${id}-social-url-${index}`} label="URL" error={firstError(errors, `social_links.${index}.url`)}>
							<Input
								id={`${id}-social-url-${index}`}
								type="url"
								placeholder="https://"
								value={link.url}
								onChange={(event) => updateLink(index, { url: event.target.value })}
							/>
						</Field>
						<Button
							type="button"
							size="icon"
							variant="ghost"
							className="self-end text-red-600 hover:bg-red-50 hover:text-red-700"
							onClick={() => setSocialLinks((links) => links.filter((_, i) => i !== index))}
							aria-label={`Remover ${SOCIAL_LABELS[link.service]}`}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))}
			</SectionCard>

			<div className="sticky bottom-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-slate-600">As alterações valem para todo o site assim que salvas.</p>
				<Button onClick={save} loading={saving}>
					<Save className="mr-2 size-4" />
					Salvar configurações
				</Button>
			</div>
		</div>
	);
}
