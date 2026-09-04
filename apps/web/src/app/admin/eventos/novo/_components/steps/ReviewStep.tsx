'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFormContext } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { EventCategory } from '@events-manager/contracts';
import type { EventWizardFormValues } from '../types';

interface ReviewStepProps {
	categories: EventCategory[];
}

const STATUS_LABELS: Record<EventWizardFormValues['status'], string> = {
	draft: 'Rascunho',
	published: 'Publicado',
	cancelled: 'Cancelado',
	archived: 'Arquivado',
};

export function ReviewStep({ categories }: ReviewStepProps) {
	const form = useFormContext<EventWizardFormValues>();
	const values = form.watch();
	const category = categories.find(item => String(item.id) === values.category_id);

	const formatDateTime = (value: string) => {
		if (!value) return '-';
		try {
			return format(new Date(value), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
		} catch {
			return value;
		}
	};

	return (
		<div className="space-y-8">
			<div className="rounded-lg border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Revise antes de publicar</h2>
							<p className="text-sm text-muted-foreground">
								Confira se tudo está pronto. Você ainda poderá editar depois de criar o evento.
							</p>
						</div>
					</div>

					<div className="mt-6 space-y-6">

			<Card className="space-y-6 p-6">
				<section>
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Informações básicas</h3>
					<div className="mt-3 grid gap-2 text-sm">
						<p>
							<span className="font-medium text-foreground">Título:</span> {values.title || '-'}
						</p>
						<p>
							<span className="font-medium text-foreground">Categoria:</span> {category?.name ?? '-'}
						</p>
						<p className="text-muted-foreground">{values.short_description || 'Sem descrição curta'}</p>
					</div>
				</section>

				<Separator />

				<section>
					<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conteúdo</h3>
					<div className="mt-3 space-y-3 text-sm">
						<p className="text-muted-foreground whitespace-pre-wrap">{values.description || '-'}</p>
						{(values.tags?.length ?? 0) > 0 && (
							<div className="flex flex-wrap gap-2">
								{values.tags!.map(tag => (
									<Badge key={tag} variant="secondary">
										#{tag}
									</Badge>
								))}
							</div>
						)}
					</div>
				</section>

				<Separator />

				<section className="grid gap-3 text-sm md:grid-cols-2">
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Agenda</h3>
						<p className="mt-2">
							<span className="font-medium text-foreground">Início:</span> {formatDateTime(values.start_date)}
						</p>
						<p>
							<span className="font-medium text-foreground">Término:</span> {formatDateTime(values.end_date)}
						</p>
						<p>
							<span className="font-medium text-foreground">Inscrições:</span>{' '}
							{values.registration_start && values.registration_end
								? `${formatDateTime(values.registration_start)} até ${formatDateTime(values.registration_end)}`
								: 'Abertas até o evento'}
						</p>
					</div>
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Formato</h3>
						<p className="mt-2 capitalize">
							<span className="font-medium text-foreground">Tipo:</span>{' '}
							{values.event_type === 'in_person' ? 'Presencial' : values.event_type === 'online' ? 'Online' : 'Híbrido'}
						</p>
						{(values.event_type === 'in_person' || values.event_type === 'hybrid') && (
							<div className="mt-2 text-muted-foreground">
								<p>{values.location_name}</p>
								<p>{values.location_address}</p>
							</div>
						)}
						{(values.event_type === 'online' || values.event_type === 'hybrid') && (
							<p className="mt-2 truncate text-muted-foreground">{values.online_url}</p>
						)}
					</div>
				</section>

				<Separator />

				<section className="grid gap-3 text-sm md:grid-cols-2">
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ingressos</h3>
						<p className="mt-2">
							<span className="font-medium text-foreground">{values.is_free ? 'Evento gratuito' : 'Evento pago'}</span>
						</p>
						<p className="text-muted-foreground">
							{values.max_attendees ? `${values.max_attendees} vagas disponíveis` : 'Sem limite definido'}
						</p>
					</div>
					<div>
						<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publicação</h3>
						<p className="mt-2">
							<span className="font-medium text-foreground">Status:</span> {STATUS_LABELS[values.status]}
						</p>
						<p className="text-muted-foreground">
							{values.featured ? 'Evento será destacado na página inicial.' : 'Sem destaque na home.'}
						</p>
						<p className="text-muted-foreground">
							{values.publish_after_create
								? 'Publicaremos automaticamente após a criação.'
								: 'Você poderá publicar depois manualmente.'}
						</p>
					</div>
				</section>
			</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
