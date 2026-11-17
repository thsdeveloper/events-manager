'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { EventCategory } from '@events-manager/contracts';
import Text from '@/components/ui/Text';
import { structuredAddress } from '../wizard-content';
import type { EventWizardFormValues, EventWizardStepId } from '../types';

interface ReviewStepProps {
	categories: EventCategory[];
	mode?: 'create' | 'edit';
	onEdit?: (step: EventWizardStepId) => void;
}

const STATUS_LABELS: Record<EventWizardFormValues['status'], string> = {
	draft: 'Rascunho',
	published: 'Publicado',
	cancelled: 'Cancelado',
	archived: 'Arquivado',
};

export function ReviewStep({ categories, mode = 'create', onEdit }: ReviewStepProps) {
	const form = useFormContext<EventWizardFormValues>();
	const values = form.getValues();
	const category = categories.find((item) => String(item.id) === values.category_id);

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
			<Card className="p-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Confira antes de finalizar</h2>
							<p className="text-sm text-muted-foreground">
								Confira se tudo está pronto. Você ainda poderá editar depois de criar o evento.
							</p>
						</div>
					</div>

					<div className="mt-6 space-y-6">
						{onEdit && (
							<div className="flex flex-wrap gap-2" aria-label="Ajustar informações">
								{(
									[
										['basic', 'Básico'],
										['details', 'Descrição'],
										['schedule', 'Agenda'],
										['location', 'Local'],
										['tickets', 'Ingressos'],
										['visual', 'Capa'],
									] as const
								).map(([id, label]) => (
									<Button key={id} type="button" variant="outline" size="sm" onClick={() => onEdit(id)}>
										Editar {label.toLowerCase()}
									</Button>
								))}
							</div>
						)}
						<div className="space-y-6">
							<section>
								<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
									Informações básicas
								</h3>
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
									<Text className="prose prose-sm max-w-none" content={values.description || '<p>Sem descrição</p>'} />
									{values.description_en && <p>Descrição em inglês cadastrada.</p>}
									{values.description_es && <p>Descrição em espanhol cadastrada.</p>}
									{values.cover_image_alt && <p>Texto alternativo da capa: {values.cover_image_alt}</p>}
									{(values.tags?.length ?? 0) > 0 && (
										<div className="flex flex-wrap gap-2">
											{values.tags!.map((tag) => (
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
									<p>Período de vendas: definido em cada ingresso/lote.</p>
								</div>
								<div>
									<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Formato</h3>
									<p className="mt-2 capitalize">
										<span className="font-medium text-foreground">Tipo:</span>{' '}
										{values.event_type === 'in_person'
											? 'Presencial'
											: values.event_type === 'online'
												? 'Online'
												: 'Híbrido'}
									</p>
									{(values.event_type === 'in_person' || values.event_type === 'hybrid') && (
										<div className="mt-2 text-muted-foreground">
											<p>{values.location_tbd ? 'Local a definir' : values.location_name}</p>
											<p>{values.location_tbd ? '' : structuredAddress(values) || values.location_address}</p>
											{values.show_map === false && <p>Mapa oculto na página pública.</p>}
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
										<span className="font-medium text-foreground">
											{values.is_free ? 'Evento gratuito' : 'Evento pago'}
										</span>
									</p>
									<p className="text-muted-foreground">
										{values.max_attendees ? `${values.max_attendees} vagas disponíveis` : 'Sem limite definido'}
									</p>
									<ul className="mt-3 space-y-3">
										{values.tickets.map((ticket, index) => (
											<li key={ticket.id ?? ticket.clientId ?? index}>
												<p className="font-medium">
													{ticket.title} · {ticket.quantity} ingressos
												</p>
												<p className="text-muted-foreground">
													{ticket.sale_start_date
														? formatDateTime(ticket.sale_start_date)
														: 'Venda sem data de abertura'}{' '}
													— {ticket.sale_end_date ? formatDateTime(ticket.sale_end_date) : 'sem data de encerramento'}
												</p>
											</li>
										))}
									</ul>
								</div>
								<div>
									<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publicação</h3>
									<p className="mt-2">
										<span className="font-medium text-foreground">Status:</span> {STATUS_LABELS[values.status]}
									</p>
									<p>
										{values.visibility === 'unlisted'
											? 'Não listado — acesso pelo link'
											: 'Público — aparece no catálogo e nas buscas'}
									</p>
									<p className="text-muted-foreground">
										{values.visibility === 'unlisted'
											? 'Fora do catálogo, das buscas e dos destaques.'
											: values.featured
												? 'Evento será destacado na página inicial.'
												: 'Sem destaque na home.'}
									</p>
									{mode === 'create' && (
										<p className="text-muted-foreground">
											{values.status === 'published'
												? 'O evento será publicado ao concluir.'
												: 'O evento será salvo sem publicação.'}
										</p>
									)}
								</div>
							</section>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
