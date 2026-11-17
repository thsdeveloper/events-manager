'use client';

import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import type { BrandingAssetKind } from '@events-manager/contracts';
import { Upload, Trash2 } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface BrandingAssetSelection {
	id: string;
	url: string;
}
interface Props {
	value: BrandingAssetSelection | null;
	onChange: (value: BrandingAssetSelection | null) => void;
	label: string;
	helper: string;
	surface?: 'light' | 'dark';
	kind?: BrandingAssetKind;
	disabled?: boolean;
	onUploadingChange?: (uploading: boolean) => void;
}
const formats = {
	logo: { types: ['image/svg+xml'], help: 'SVG vetorial, até 5 MB. Sem recorte ou conversão.' },
	favicon: {
		types: ['image/svg+xml', 'image/png', 'image/x-icon', 'image/vnd.microsoft.icon'],
		help: 'SVG, PNG ou ICO quadrado, até 5 MB.',
	},
	'app-icon': { types: ['image/png'], help: 'PNG de 1024 × 1024 pixels, até 5 MB.' },
};

export function BrandingAssetUploadField({
	value,
	onChange,
	label,
	helper,
	surface = 'light',
	kind = 'logo',
	disabled,
	onUploadingChange,
}: Props) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const input = useRef<HTMLInputElement>(null);
	const descriptionId = useId();
	async function select(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setError(null);
		if (!formats[kind].types.includes(file.type)) {
			setError(formats[kind].help);

			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setError('O arquivo deve ter no máximo 5 MB.');

			return;
		}
		setUploading(true);
		onUploadingChange?.(true);
		try {
			const data = new FormData();
			data.append('file', file);
			const response = await fetch(`/api/super-admin/settings/branding/assets?kind=${kind}`, {
				method: 'POST',
				body: data,
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível enviar o arquivo.');
			onChange({ id: body.fileId, url: body.url });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Falha no envio.');
		} finally {
			setUploading(false);
			onUploadingChange?.(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{label}</CardTitle>
				<CardDescription id={descriptionId}>{helper}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div
					className={cn(
						'relative flex h-36 items-center justify-center rounded-md border',
						surface === 'dark' ? 'bg-[#231A33] text-white' : 'bg-white text-[#231A33]',
					)}
				>
					{value ? (
						<Image
							src={value.url}
							alt={`Prévia: ${label}`}
							fill
							sizes="400px"
							unoptimized
							className={cn('object-contain p-6', kind !== 'logo' && 'mx-auto max-w-36')}
						/>
					) : (
						<p className="px-4 text-center text-xs">Nenhum arquivo selecionado</p>
					)}
					{uploading && (
						<div
							role="status"
							aria-label={`Enviando ${label}`}
							className="absolute inset-0 flex items-center justify-center bg-background/80"
						>
							<Spinner className="size-6" />
						</div>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={disabled || uploading}
						onClick={() => input.current?.click()}
					>
						<Upload className="mr-2 size-4" />
						{value ? 'Substituir arquivo' : 'Enviar arquivo'}
					</Button>
					{value && (
						<Button
							type="button"
							variant="ghost"
							disabled={disabled || uploading}
							onClick={() => {
								setError(null);
								onChange(null);
							}}
							aria-label={`Remover ${label}`}
						>
							<Trash2 className="mr-2 size-4" />
							Remover
						</Button>
					)}
				</div>
				<p className="text-xs text-muted-foreground">{formats[kind].help}</p>
				<Input
					ref={input}
					type="file"
					aria-label={label}
					aria-describedby={descriptionId}
					accept={formats[kind].types.join(',')}
					disabled={disabled || uploading}
					onChange={select}
					className="hidden"
				/>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</CardContent>
		</Card>
	);
}
