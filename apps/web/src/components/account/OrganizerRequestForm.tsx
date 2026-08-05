'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const organizerRequestSchema = z.object({
	organizationName: z.string().min(3, 'Informe o nome da organização'),
	contactEmail: z.string().email('Email inválido'),
	phone: z
		.string()
		.min(10, 'Informe telefone com DDD')
		.max(20, 'Telefone muito longo')
		.optional()
		.or(z.literal('')),
	description: z
		.string()
		.min(20, 'Conte um pouco mais sobre seus eventos e planos'),
	website: z
		.string()
		.url('URL inválida')
		.optional()
		.or(z.literal('')),
});

type OrganizerRequestSchema = z.infer<typeof organizerRequestSchema>;

type OrganizerRequestFormProps = {
	user: {
		id: string;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
	};
	onSuccess?: () => void;
};

export function OrganizerRequestForm({ user, onSuccess }: OrganizerRequestFormProps) {
	const { toast } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<OrganizerRequestSchema>({
		resolver: zodResolver(organizerRequestSchema),
		defaultValues: {
			organizationName: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
			contactEmail: user.email || '',
			phone: '',
			description: '',
			website: '',
		},
	});

	const handleSubmit = async (values: OrganizerRequestSchema) => {
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/organizer/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: values.organizationName,
					email: values.contactEmail,
					phone: values.phone || null,
					description: values.description,
					website: values.website || null,
				}),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Não foi possível enviar sua solicitação');
			}

			toast({
				title: 'Solicitação enviada',
				description: 'Vamos analisar seus dados e liberar o acesso em breve.',
				variant: 'success',
			});

			form.reset();
			onSuccess?.();
		} catch (error: any) {
			console.error('Organizer request error:', error);
			toast({
				title: 'Erro ao enviar solicitação',
				description: error.message || 'Tente novamente mais tarde.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="organizationName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nome da organização ou marca *</FormLabel>
							<FormControl>
								<Input placeholder="Ex: Agência XYZ Eventos" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="contactEmail"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email de contato *</FormLabel>
							<FormControl>
								<Input type="email" placeholder="nome@empresa.com" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Telefone com DDD</FormLabel>
							<FormControl>
								<Input placeholder="(11) 99999-0000" {...field} />
							</FormControl>
							<FormDescription>
								Usaremos esse contato apenas se precisarmos falar sobre a sua solicitação
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="website"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Site ou rede social</FormLabel>
							<FormControl>
								<Input placeholder="https://instagram.com/suamarca" {...field} value={field.value || ''} />
							</FormControl>
							<FormDescription>
								Ajuda nossa equipe a entender o perfil dos seus eventos
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Conte-nos sobre seus eventos *</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Fale sobre o tipo de evento, público, histórico e planos para os próximos meses"
									className="min-h-[120px]"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex justify-end">
					<Button type="submit" className="gap-2" disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Enviando...
							</>
						) : (
							<>
								<Send className="size-4" />
								Enviar solicitação
							</>
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
