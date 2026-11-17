'use client';

import ImageUpload, { ImageUploadRef } from '@/components/admin/ImageUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Event, EventCategory } from '@events-manager/contracts';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface PageProps {
	params: Promise<{ evento_id: string }>;
}

export default function EditarEventoPage({ params }: PageProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [id, setId] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [event, setEvent] = useState<Event | null>(null);
	const [categories, setCategories] = useState<EventCategory[]>([]);
	const [eventType, setEventType] = useState<'in_person' | 'online' | 'hybrid'>('in_person');
	const [isFree, setIsFree] = useState(true);
	const [tags, setTags] = useState<string[]>([]);
	const [currentTag, setCurrentTag] = useState('');
	const [status, setStatus] = useState('draft');
	const [categoryId, setCategoryId] = useState('');
	const [coverImage, setCoverImage] = useState<string | null>(null);
	const imageUploadRef = useRef<ImageUploadRef>(null);

	useEffect(() => {
		params.then((p) => setId(p.evento_id)).catch(console.error);
	}, [params]);

	// Fetch event data and categories
	useEffect(() => {
		if (!id) return;

		const fetchData = async () => {
			try {
				const eventResponse = await fetch(`/api/events/${id}`);
				if (!eventResponse.ok) throw new Error('Não foi possível carregar o evento.');
				const eventData = (await eventResponse.json()) as Event;

				setEvent(eventData as Event);

				// Set form values from event data
				setStatus(eventData.status || 'draft');
				setEventType(eventData.event_type || 'in_person');
				setIsFree(eventData.is_free || false);
				setCategoryId(
					typeof eventData.category_id === 'string' ? eventData.category_id : eventData.category_id?.id || '',
				);
				setTags(Array.isArray(eventData.tags) ? eventData.tags : []);
				setCoverImage(
					typeof eventData.cover_image === 'string' ? eventData.cover_image : eventData.cover_image?.id || null,
				);

				// Fetch categories
				const categoriesResponse = await fetch('/api/event-categories');
				if (!categoriesResponse.ok) throw new Error('Não foi possível carregar as categorias.');
				const categoriesPayload = (await categoriesResponse.json()) as { data: EventCategory[] };
				setCategories(categoriesPayload.data ?? []);

				setLoading(false);
			} catch (error: any) {
				console.error('Error fetching data:', error);
				setError(error.message || 'Erro ao carregar evento');
				setLoading(false);
			}
		};

		fetchData();
	}, [id]);

	const addTag = () => {
		if (currentTag.trim() && !tags.includes(currentTag.trim())) {
			setTags([...tags, currentTag.trim()]);
			setCurrentTag('');
		}
	};

	const removeTag = (tagToRemove: string) => {
		setTags(tags.filter((tag) => tag !== tagToRemove));
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			// Se o evento está sendo marcado como gratuito, verificar se há ingressos
			if (isFree && event) {
				const tickets = Array.isArray(event.tickets) ? event.tickets : [];
				if (tickets.length > 0) {
					toast({
						title: 'Não é possível salvar',
						description: `Este evento possui ${tickets.length} ingresso(s) cadastrado(s). Remova todos os ingressos antes de marcá-lo como gratuito.`,
						variant: 'destructive',
					});
					setIsLoading(false);

					return;
				}
			}

			const formData = new FormData(e.currentTarget);

			// Upload image first if there's a new one
			let uploadedImageId = coverImage;
			if (imageUploadRef.current) {
				try {
					uploadedImageId = await imageUploadRef.current.uploadFile();
				} catch (error) {
					toast({
						title: 'Erro',
						description: 'Erro ao fazer upload da imagem',
						variant: 'destructive',
					});
					setIsLoading(false);

					return;
				}
			}

			// Parse form data
			const title = formData.get('title') as string;
			const description = formData.get('description') as string;
			const shortDescription = formData.get('short_description') as string;
			const startDate = formData.get('start_date') as string;
			const endDate = formData.get('end_date') as string;
			const maxAttendees = formData.get('max_attendees') as string;
			const locationName = formData.get('location_name') as string;
			const locationAddress = formData.get('location_address') as string;
			const onlineUrl = formData.get('online_url') as string;
			const registrationStart = formData.get('registration_start') as string;
			const registrationEnd = formData.get('registration_end') as string;
			const price = formData.get('price') as string;
			const featured = formData.get('featured') === 'on';

			// Validate required fields
			if (!title || !description || !startDate) {
				toast({
					title: 'Erro',
					description: 'Preencha todos os campos obrigatórios',
					variant: 'destructive',
				});
				setIsLoading(false);

				return;
			}

			// Create event data
			const eventData: any = {
				title,
				description,
				short_description: shortDescription || null,
				start_date: startDate,
				end_date: endDate || startDate,
				event_type: eventType,
				location_name: locationName || null,
				location_address: locationAddress || null,
				online_url: onlineUrl || null,
				max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
				registration_start: registrationStart || null,
				registration_end: registrationEnd || null,
				status: status || 'draft',
				is_free: isFree,
				price: !isFree && price ? parseFloat(price) : null,
				category_id: categoryId || null,
				tags: tags.length > 0 ? tags : null,
				featured: featured,
				cover_image: uploadedImageId,
			};

			const response = await fetch(`/api/events/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(eventData),
			});
			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail ?? 'Erro ao atualizar evento');
			}

			toast({
				title: 'Sucesso',
				description: 'Evento atualizado com sucesso!',
				variant: 'success',
			});

			router.push(`/admin/eventos/${id}`);
		} catch (error: any) {
			console.error('Error updating event:', error);
			toast({
				title: 'Erro',
				description: error.message || 'Erro ao atualizar evento',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<div className="inline-block animate-spin rounded-full size-8 border-b-2 border-accent"></div>
					<p className="mt-4 text-muted-foreground ">Carregando evento...</p>
				</div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button asChild variant="ghost" size="icon">
						<Link
							aria-label="Voltar aos eventos"
							href="/admin/eventos"
							className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-lg transition-colors"
						>
							<ArrowLeft className="size-5" />
						</Link>
					</Button>
					<h1 className="text-3xl font-bold text-foreground ">Erro</h1>
				</div>
				<Alert className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<p className="text-red-600 dark:text-red-400">{error || 'Evento não encontrado'}</p>
				</Alert>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button asChild variant="ghost" size="icon">
					<Link
						aria-label="Voltar ao evento"
						href={`/admin/eventos/${id}`}
						className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-lg transition-colors"
					>
						<ArrowLeft className="size-5" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold text-foreground ">Editar Evento</h1>
					<p className="text-muted-foreground  mt-1">{event.title}</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Status e Publicação */}
				<Card className="bg-card  rounded-lg border border-border  p-6 space-y-4">
					<h2 className="text-lg font-semibold text-foreground  flex items-center gap-2">📋 Status e Publicação</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
								Status do Evento *
							</Label>
							<Select value={status} onValueChange={setStatus}>
								<SelectTrigger id="status" className="w-full">
									<SelectValue placeholder="Selecione o status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="draft">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-gray-500"></span>
											Rascunho
										</div>
									</SelectItem>
									<SelectItem value="published">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-green-500"></span>
											Publicado
										</div>
									</SelectItem>
									<SelectItem value="cancelled">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-red-500"></span>
											Cancelado
										</div>
									</SelectItem>
									<SelectItem value="archived">
										<div className="flex items-center gap-2">
											<span className="inline-block size-2 rounded-full bg-yellow-500"></span>
											Arquivado
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="category" className="block text-sm font-medium text-foreground  mb-2">
								Categoria
							</Label>
							<Select value={categoryId} onValueChange={setCategoryId}>
								<SelectTrigger id="category" className="w-full">
									<SelectValue placeholder="Selecione uma categoria" />
								</SelectTrigger>
								<SelectContent>
									{categories.length === 0 ? (
										<div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma categoria disponível</div>
									) : (
										categories.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.icon && <span className="mr-2">{category.icon}</span>}
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox name="featured" id="featured" defaultChecked={event.featured || false} />
						<Label htmlFor="featured" className="text-sm text-foreground ">
							⭐ Destacar este evento na página inicial
						</Label>
					</div>
				</Card>

				{/* Informações Básicas */}
				<Card className="bg-card  rounded-lg border border-border  p-6 space-y-4">
					<h2 className="text-lg font-semibold text-foreground  flex items-center gap-2">📝 Informações Básicas</h2>

					<ImageUpload
						ref={imageUploadRef}
						value={coverImage}
						onChange={setCoverImage}
						label="Imagem de Capa"
						description="Imagem principal do evento (recomendado: 1200x630px)"
					/>

					<div>
						<Label htmlFor="title" className="block text-sm font-medium text-foreground  mb-2">
							Nome do Evento *
						</Label>
						<Input
							type="text"
							id="title"
							name="title"
							required
							defaultValue={event.title}
							className="w-full"
							placeholder="Ex: Workshop de React Avançado"
						/>
					</div>

					<div>
						<Label htmlFor="short_description" className="block text-sm font-medium text-foreground  mb-2">
							Descrição Resumida
						</Label>
						<Input
							type="text"
							id="short_description"
							name="short_description"
							maxLength={160}
							defaultValue={event.short_description || ''}
							className="w-full"
							placeholder="Uma breve descrição para listagens (máx. 160 caracteres)"
						/>
						<p className="text-xs text-muted-foreground  mt-1">Aparecerá nos cards e compartilhamentos</p>
					</div>

					<div>
						<Label htmlFor="description" className="block text-sm font-medium text-foreground  mb-2">
							Descrição Completa *
						</Label>
						<Textarea
							id="description"
							name="description"
							required
							rows={6}
							defaultValue={event.description || ''}
							className="w-full"
							placeholder="Descreva detalhadamente seu evento: conteúdo, objetivos, o que os participantes vão aprender..."
						/>
					</div>

					<div>
						<Label htmlFor="tags" className="block text-sm font-medium text-foreground  mb-2">
							Tags
						</Label>
						<div className="space-y-2">
							<div className="flex gap-2">
								<Input
									type="text"
									id="tags"
									value={currentTag}
									onChange={(e) => setCurrentTag(e.target.value)}
									onKeyDown={handleKeyPress}
									className="flex-1"
									placeholder="Digite uma tag e pressione Enter"
								/>
								<Button
									variant="ghost"
									type="button"
									onClick={addTag}
									className="h-auto whitespace-normal px-4 py-2 bg-muted  text-foreground  rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
								>
									Adicionar
								</Button>
							</div>
							{tags.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{tags.map((tag) => (
										<Badge variant="secondary" key={tag} className="gap-1">
											{tag}
											<Button
												variant="ghost"
												type="button"
												onClick={() => removeTag(tag)}
												aria-label={`Remover tag ${tag}`}
												size="icon"
												className="size-5"
											>
												<X className="size-3" />
											</Button>
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				</Card>

				{/* Datas e Horários */}
				<Card className="bg-card  rounded-lg border border-border  p-6 space-y-4">
					<h2 className="text-lg font-semibold text-foreground  flex items-center gap-2">📅 Datas e Horários</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label htmlFor="start_date" className="block text-sm font-medium text-foreground  mb-2">
								Data e Hora de Início *
							</Label>
							<Input
								type="datetime-local"
								id="start_date"
								name="start_date"
								required
								defaultValue={event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : ''}
								className="w-full"
							/>
						</div>

						<div>
							<Label htmlFor="end_date" className="block text-sm font-medium text-foreground  mb-2">
								Data e Hora de Término
							</Label>
							<Input
								type="datetime-local"
								id="end_date"
								name="end_date"
								defaultValue={event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : ''}
								className="w-full"
							/>
						</div>
					</div>

					<div className="border-t border-border  pt-4">
						<h3 className="text-sm font-semibold text-foreground  mb-3">Período de Inscrições</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="registration_start" className="block text-sm font-medium text-foreground  mb-2">
									Início das Inscrições
								</Label>
								<Input
									type="datetime-local"
									id="registration_start"
									name="registration_start"
									defaultValue={
										event.registration_start ? new Date(event.registration_start).toISOString().slice(0, 16) : ''
									}
									className="w-full"
								/>
							</div>

							<div>
								<Label htmlFor="registration_end" className="block text-sm font-medium text-foreground  mb-2">
									Encerramento das Inscrições
								</Label>
								<Input
									type="datetime-local"
									id="registration_end"
									name="registration_end"
									defaultValue={
										event.registration_end ? new Date(event.registration_end).toISOString().slice(0, 16) : ''
									}
									className="w-full"
								/>
							</div>
						</div>
					</div>
				</Card>

				{/* Tipo e Localização */}
				<Card className="bg-card  rounded-lg border border-border  p-6 space-y-4">
					<h2 className="text-lg font-semibold text-foreground  flex items-center gap-2">📍 Tipo e Localização</h2>

					<div>
						<Label className="block text-sm font-medium text-foreground  mb-3">Tipo de Evento *</Label>
						<RadioGroup
							aria-label="Tipo de Evento"
							name="event_type"
							value={eventType}
							onValueChange={(value) => setEventType(value as typeof eventType)}
							className="grid gap-3 md:grid-cols-3"
						>
							{(
								[
									{ value: 'in_person', label: 'Presencial', description: 'Evento físico' },
									{ value: 'online', label: 'Online', description: 'Virtual' },
									{ value: 'hybrid', label: 'Híbrido', description: 'Ambos' },
								] as const
							).map((option) => (
								<Label
									key={option.value}
									htmlFor={`type-${option.value}`}
									className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
								>
									<RadioGroupItem value={option.value} id={`type-${option.value}`} />
									<span>
										<span className="block font-medium">{option.label}</span>
										<span className="text-xs text-muted-foreground">{option.description}</span>
									</span>
								</Label>
							))}
						</RadioGroup>
					</div>

					{(eventType === 'in_person' || eventType === 'hybrid') && (
						<div className="space-y-4 border-t border-border  pt-4">
							<div>
								<Label htmlFor="location_name" className="block text-sm font-medium text-foreground  mb-2">
									Nome do Local
								</Label>
								<Input
									type="text"
									id="location_name"
									name="location_name"
									defaultValue={event.location_name || ''}
									className="w-full"
									placeholder="Ex: Teatro Municipal, Centro de Convenções"
								/>
							</div>

							<div>
								<Label htmlFor="location_address" className="block text-sm font-medium text-foreground  mb-2">
									Endereço Completo
								</Label>
								<Input
									type="text"
									id="location_address"
									name="location_address"
									defaultValue={event.location_address || ''}
									className="w-full"
									placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
								/>
							</div>
						</div>
					)}

					{(eventType === 'online' || eventType === 'hybrid') && (
						<div className="border-t border-border  pt-4">
							<Label htmlFor="online_url" className="block text-sm font-medium text-foreground  mb-2">
								Link do Evento Online
							</Label>
							<Input
								type="url"
								id="online_url"
								name="online_url"
								defaultValue={event.online_url || ''}
								className="w-full"
								placeholder="https://zoom.us/j/123456789 ou https://meet.google.com/..."
							/>
						</div>
					)}
				</Card>

				{/* Ingressos e Vagas */}
				<Card className="bg-card  rounded-lg border border-border  p-6 space-y-4">
					<h2 className="text-lg font-semibold text-foreground  flex items-center gap-2">🎫 Ingressos e Vagas</h2>

					<div className="flex items-center gap-2 p-4 bg-muted/40  rounded-lg border border-border ">
						<Checkbox
							name="is_free"
							id="is_free"
							checked={isFree}
							onCheckedChange={(checked) => setIsFree(checked === true)}
						/>
						<Label htmlFor="is_free" className="text-sm font-medium text-foreground ">
							Este é um evento gratuito (entrada livre)
						</Label>
					</div>

					{isFree && (
						<Alert>
							<AlertDescription>
								⚠️ <strong>Atenção:</strong> Ao marcar este evento como gratuito, você não poderá cadastrar ingressos.
								Se você já possui ingressos cadastrados, eles deverão ser removidos antes de salvar.
							</AlertDescription>
						</Alert>
					)}

					<div>
						<Label htmlFor="max_attendees" className="block text-sm font-medium text-foreground  mb-2">
							Vagas Totais do Evento
						</Label>
						<Input
							type="number"
							id="max_attendees"
							name="max_attendees"
							min="1"
							defaultValue={event.max_attendees || ''}
							className="w-full"
							placeholder="Ex: 100 (deixe vazio para vagas ilimitadas)"
						/>
						<p className="text-xs text-muted-foreground  mt-1">
							Limite geral de participantes {!isFree && '(independente dos ingressos)'}
						</p>
					</div>
				</Card>

				{/* Actions */}
				<div className="flex gap-4 pt-4">
					<Button type="submit" disabled={isLoading} loading={isLoading}>
						{isLoading ? 'Salvando...' : 'Salvar Alterações'}
					</Button>
					<Button asChild variant="outline">
						<Link
							href={`/admin/eventos/${id}`}
							className="px-6 py-2 border border-input  rounded-lg hover:bg-muted/40 dark:hover:bg-gray-700 transition-colors"
						>
							Cancelar
						</Link>
					</Button>
				</div>
			</form>
		</div>
	);
}
