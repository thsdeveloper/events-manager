'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { brandingAssetKeys, brandingAssetKind, type BrandingAssetKey } from '@events-manager/contracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { revalidateSiteBranding } from '@/features/super-admin/api/actions';
import type { BrandingSettings } from '@/features/super-admin/api/server';
import { getMediaAssetUrl } from '@/lib/media';
import { BrandingAssetUploadField, type BrandingAssetSelection } from './BrandingAssetUploadField';

const sections: {
	title: string;
	description: string;
	fields: { key: BrandingAssetKey; label: string; helper: string; surface?: 'light' | 'dark' }[];
}[] = [
	{
		title: 'Logos em SVG',
		description: 'Arquivos vetoriais nítidos em qualquer tamanho, sem conversão para PNG ou JPG.',
		fields: [
			{
				key: 'logo',
				label: 'Logo (tema claro)',
				helper: 'Exibida no header, no rodapé e nas telas de acesso no tema claro.',
			},
			{
				key: 'logo_dark_mode',
				label: 'Logo (tema escuro)',
				helper: 'Use uma versão legível sobre fundo escuro. Sem ela, o site utiliza a logo do tema claro.',
				surface: 'dark',
			},
		],
	},
	{
		title: 'Favicons do site',
		description: 'Ícones exibidos nas abas e favoritos do navegador.',
		fields: [
			{
				key: 'favicon',
				label: 'Favicon padrão',
				helper: 'Ícone principal do site. Ao remover, será usado o favicon padrão da plataforma.',
			},
			{
				key: 'favicon_dark_mode',
				label: 'Favicon escuro',
				helper: 'Versão opcional para navegadores com preferência de cores escuras.',
				surface: 'dark',
			},
		],
	},
	{
		title: 'Ícones de aplicativo',
		description: 'Cadastre as versões padrão, escura e tonal em PNG de 1024 × 1024 pixels.',
		fields: [
			{
				key: 'app_icon',
				label: 'Ícone padrão',
				helper: 'Usado no manifesto do site e no atalho adicionado à tela inicial.',
			},
			{
				key: 'app_icon_dark_mode',
				label: 'Ícone escuro',
				helper: 'Variante escura disponível para uso no aplicativo.',
				surface: 'dark',
			},
			{
				key: 'app_icon_tinted',
				label: 'Ícone tonal',
				helper:
					'Variante tonal disponível para aplicativos compatíveis. Não substitui automaticamente o ícone do site.',
			},
		],
	},
];
export function BrandingSettingsForm({ initialSettings }: { initialSettings: BrandingSettings }) {
	const initial = () =>
		Object.fromEntries(
			brandingAssetKeys.map((key) => {
				const media = initialSettings[key];

				return [key, media ? { id: media.id, url: getMediaAssetUrl(media) } : null];
			}),
		) as Record<BrandingAssetKey, BrandingAssetSelection | null>;
	const [values, setValues] = useState(initial);
	const [saved, setSaved] = useState(() =>
		Object.fromEntries(brandingAssetKeys.map((key) => [key, initialSettings[key]?.id ?? null])),
	);
	const [uploading, setUploading] = useState<Set<BrandingAssetKey>>(() => new Set());
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);
	const dirty = brandingAssetKeys.some((key) => (values[key]?.id ?? null) !== saved[key]);
	async function save() {
		setSaving(true);
		setFeedback(null);
		setFailed(false);
		const payload = Object.fromEntries(brandingAssetKeys.map((key) => [key, values[key]?.id ?? null]));
		try {
			const response = await fetch('/api/super-admin/settings/branding', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar a identidade visual.');
			await revalidateSiteBranding();
			setSaved(payload);
			setFeedback('Identidade visual salva. Logos, favicons e ícones foram atualizados.');
		} catch (cause) {
			setFailed(true);
			setFeedback(cause instanceof Error ? cause.message : 'Falha ao salvar.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-8">
			{sections.map((section) => (
				<section key={section.title} aria-label={section.title} className="space-y-4">
					<div>
						<h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
						<p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
					</div>
					<div
						className={
							section.fields.length === 3 ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4 lg:grid-cols-2'
						}
					>
						{section.fields.map(({ key, ...field }) => (
							<BrandingAssetUploadField
								key={key}
								{...field}
								kind={brandingAssetKind(key)}
								value={values[key]}
								disabled={saving}
								onChange={(asset) => {
									setValues((current) => ({ ...current, [key]: asset }));
									setFeedback(null);
								}}
								onUploadingChange={(busy) =>
									setUploading((current) => {
										const next = new Set(current);
										if (busy) next.add(key);
										else next.delete(key);

										return next;
									})
								}
							/>
						))}
					</div>
				</section>
			))}
			<Card className="sticky bottom-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
				<p role="status" className={failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
					{feedback ??
						(uploading.size
							? 'Aguarde o envio dos arquivos.'
							: dirty
								? 'Você tem alterações não salvas.'
								: 'Nenhuma alteração pendente.')}
				</p>
				<Button onClick={save} disabled={saving || uploading.size > 0 || !dirty}>
					<Save className="mr-2 size-4" />
					{saving ? 'Salvando…' : 'Salvar identidade visual'}
				</Button>
			</Card>
		</div>
	);
}
