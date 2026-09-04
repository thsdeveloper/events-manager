'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AppUser } from '@events-manager/contracts';
import { Save, Upload } from 'lucide-react';
import { getMediaAssetUrl } from '@/lib/media';

const userProfileSchema = z.object({
	first_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional().nullable(),
	last_name: z.string().min(2, 'Sobrenome deve ter no mínimo 2 caracteres').optional().nullable(),
	email: z.string().email('Email inválido').optional().nullable(),
	location: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;

interface UserProfileFormProps {
	user: AppUser;
}

export function UserProfileForm({ user }: UserProfileFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const { toast } = useToast();

	const form = useForm<UserProfileFormValues>({
		resolver: zodResolver(userProfileSchema),
		defaultValues: {
			first_name: user.first_name || '',
			last_name: user.last_name || '',
			email: user.email || '',
			location: user.location || '',
			title: user.title || '',
			description: user.description || '',
		},
	});

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatarFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setAvatarPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const onSubmit = async (values: UserProfileFormValues) => {
		setIsSubmitting(true);

		try {
			let avatarId: string | undefined;

			// Upload avatar if a new file was selected
			if (avatarFile) {
				const formData = new FormData();
				formData.append('file', avatarFile);

				const uploadResponse = await fetch('/api/upload?folder=avatars', { method: 'POST', body: formData });
				if (!uploadResponse.ok) throw new Error('Não foi possível enviar a foto.');
				avatarId = (await uploadResponse.json()).fileId;
			}

			// Update user profile
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					first_name: values.first_name || null,
					last_name: values.last_name || null,
					location: values.location || null,
					title: values.title || null,
					description: values.description || null,
					...(avatarId && { avatar: avatarId }),
				}),
			});
			if (!response.ok) throw new Error('Não foi possível atualizar o perfil.');

			toast({
				title: 'Perfil atualizado',
				description: 'Suas informações foram atualizadas com sucesso.',
				variant: 'success',
			});

			// Reset avatar file state
			setAvatarFile(null);
			setAvatarPreview(null);

			// Reload page to show updated data
			window.location.reload();
		} catch (error: any) {
			console.error('Error updating profile:', error);
			toast({
				title: 'Erro ao atualizar perfil',
				description: error.message || 'Ocorreu um erro ao atualizar suas informações. Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const currentAvatarUrl = user.avatar ? getMediaAssetUrl(user.avatar) : null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Avatar Upload */}
				<div className="space-y-2">
					<FormLabel>Foto de Perfil</FormLabel>
					<div className="flex items-center gap-4">
						<div className="flex items-center justify-center size-20 rounded-full bg-blue-500 text-white font-semibold text-2xl overflow-hidden">
							{avatarPreview || currentAvatarUrl ? (
								<img
									src={avatarPreview || currentAvatarUrl || ''}
									alt="Avatar"
									className="size-full object-cover"
								/>
							) : (
								`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
							)}
						</div>
						<div>
							<Input
								type="file"
								accept="image/*"
								onChange={handleAvatarChange}
								className="hidden"
								id="avatar-upload"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => document.getElementById('avatar-upload')?.click()}
							>
								<Upload className="size-4 mr-2" />
								{avatarPreview ? 'Alterar Foto' : 'Fazer Upload'}
							</Button>
							<FormDescription className="mt-2">
								Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
							</FormDescription>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="first_name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nome</FormLabel>
								<FormControl>
									<Input placeholder="Seu nome" {...field} value={field.value || ''} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="last_name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Sobrenome</FormLabel>
								<FormControl>
									<Input placeholder="Seu sobrenome" {...field} value={field.value || ''} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input placeholder="seu@email.com" {...field} value={field.value || ''} disabled />
							</FormControl>
							<FormDescription>
								O email não pode ser alterado diretamente. Entre em contato com o suporte se
								necessário.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Cargo/Título</FormLabel>
							<FormControl>
								<Input
									placeholder="Ex: Desenvolvedor, Designer, etc."
									{...field}
									value={field.value || ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="location"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Localização</FormLabel>
							<FormControl>
								<Input
									placeholder="Ex: São Paulo, SP"
									{...field}
									value={field.value || ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Sobre Você</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Conte um pouco sobre você..."
									className="min-h-[100px]"
									{...field}
									value={field.value || ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end">
					<Button type="submit" loading={isSubmitting} className="gap-2">
						<Save className="size-4" />
						Salvar Alterações
					</Button>
				</div>
			</form>
		</Form>
	);
}
