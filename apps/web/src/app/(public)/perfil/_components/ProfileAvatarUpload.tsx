'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getDisplayName, getInitials, type ProfileUser } from './types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

interface ProfileAvatarUploadProps {
	user: ProfileUser;
	avatarUrl: string;
	onUpdated: (user: ProfileUser) => void;
	className?: string;
}

/**
 * The avatar doubles as the upload control: clicking it opens the file picker
 * and the new photo is sent right away.
 *
 * Unlike the old field inside the "Dados pessoais" form, there is no save button
 * to defer to here, so upload and PATCH happen on selection.
 */
export function ProfileAvatarUpload({ user, avatarUrl, onUpdated, className }: ProfileAvatarUploadProps) {
	const { toast } = useToast();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const previewUrlRef = useRef<string | null>(null);
	const [preview, setPreview] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	// Holds the picked file while the crop dialog is open; upload starts only
	// after the framing is confirmed.
	const [fileToCrop, setFileToCrop] = useState<File | null>(null);

	useEffect(() => {
		return () => {
			if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		};
	}, []);

	const clearPreview = () => {
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		previewUrlRef.current = null;
		setPreview('');
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		// Reset immediately so picking the same file again still fires onChange.
		event.target.value = '';
		if (!file) return;

		if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
			toast({
				title: 'Não foi possível usar essa imagem',
				description: 'Escolha um arquivo JPG, PNG ou WebP de até 5 MB.',
				variant: 'destructive',
			});

			return;
		}

		setFileToCrop(file);
	};

	const handleCropped = async (file: File) => {
		setFileToCrop(null);

		// Shown while the request is in flight so the change feels immediate.
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		const nextPreview = URL.createObjectURL(file);
		previewUrlRef.current = nextPreview;
		setPreview(nextPreview);
		setIsUploading(true);

		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadResponse = await fetch('/api/upload?folder=avatars', { method: 'POST', body: formData });
			if (!uploadResponse.ok) throw new Error('Não foi possível enviar a nova foto.');
			const upload = (await uploadResponse.json()) as { fileId: string };

			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ avatar: upload.fileId }),
			});
			if (!response.ok) throw new Error('Não foi possível salvar a nova foto.');
			const result = (await response.json()) as { user: ProfileUser };

			onUpdated({ ...user, ...result.user, email: result.user.email || user.email });
			toast({ title: 'Foto atualizada', variant: 'success' });
		} catch (error) {
			// Drop the optimistic preview so the avatar goes back to the saved photo.
			clearPreview();
			toast({
				title: 'Não foi possível atualizar a foto',
				description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);
		}
	};

	const shownUrl = preview || avatarUrl;

	return (
		<>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				disabled={isUploading}
				aria-busy={isUploading || undefined}
				title="Alterar foto do perfil"
				className={cn(
					'group relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-white transition focus-visible:ring-2 focus-visible:ring-violet-600 disabled:cursor-not-allowed dark:ring-offset-slate-900',
					className,
				)}
			>
				<Avatar className="size-12 border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
					{shownUrl && <AvatarImage src={shownUrl} alt={`Foto de ${getDisplayName(user)}`} className="object-cover" />}
					<AvatarFallback className="bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
						{getInitials(user)}
					</AvatarFallback>
				</Avatar>

				{/* Only revealed on hover/focus so the sidebar stays calm at rest. */}
				<span
					className={cn(
						'absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/55 text-white transition-opacity',
						isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
					)}
				>
					{isUploading ? (
						<Loader2 aria-hidden="true" className="size-4 animate-spin" />
					) : (
						<Camera aria-hidden="true" className="size-4" />
					)}
				</span>
				<span className="sr-only">Alterar foto do perfil</span>
			</button>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onChange={handleChange}
				className="sr-only"
				aria-label="Escolher nova foto de perfil"
			/>

			<ImageCropperDialog
				file={fileToCrop}
				onCancel={() => setFileToCrop(null)}
				onCropped={handleCropped}
				aspectRatio={1}
				outputWidth={512}
				circular
				title="Ajustar foto do perfil"
				description="Escolha a área da imagem que ficará visível no seu avatar."
				confirmLabel="Salvar foto"
			/>
		</>
	);
}
