'use client';

import type { CmsContentStatus } from '@events-manager/contracts';
import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/dates';
import { STATUS_OPTIONS } from '../lib/status';
import { Field } from './FormPrimitives';

interface PublishingFieldsProps {
	status: CmsContentStatus;
	publishedAt: string | null;
	onStatusChange: (status: CmsContentStatus) => void;
	onPublishedAtChange: (iso: string | null) => void;
	error?: string | null;
}

/** Status + agendamento, compartilhado por páginas e posts. */
export function PublishingFields({
	status,
	publishedAt,
	onStatusChange,
	onPublishedAtChange,
	error,
}: PublishingFieldsProps) {
	const id = useId();
	const current = STATUS_OPTIONS.find((option) => option.value === status);

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-status`}>Status</Label>
				<Select value={status} onValueChange={(value) => onStatusChange(value as CmsContentStatus)}>
					<SelectTrigger id={`${id}-status`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{STATUS_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{current && <p className="text-xs text-slate-500">{current.description}</p>}
			</div>
			<Field
				id={`${id}-published-at`}
				label="Data de publicação"
				hint={
					status === 'published'
						? 'Uma data futura agenda a publicação. Vazio publica agora.'
						: 'Opcional: fica registrada e usada quando o status virar "Publicado".'
				}
				error={error}
			>
				<Input
					id={`${id}-published-at`}
					type="datetime-local"
					value={toDateTimeLocal(publishedAt)}
					onChange={(event) => onPublishedAtChange(fromDateTimeLocal(event.target.value))}
				/>
			</Field>
		</div>
	);
}
