import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { RecordTable } from '@/components/ui/record-table';
import { formatDateTime } from '../lib/dates';
import type { CmsFormFieldRow, CmsFormSubmission, CmsPagination } from '../types';
import { PaginationLinks } from './PaginationLinks';

interface FormSubmissionsTableProps {
	formId: string;
	fields: CmsFormFieldRow[];
	submissions: CmsFormSubmission[];
	pagination: CmsPagination;
}

/** Tabela de respostas com uma coluna por campo do formulário. */
export function FormSubmissionsTable({ formId, fields, submissions, pagination }: FormSubmissionsTableProps) {
	if (submissions.length === 0) {
		return (
			<Empty className="rounded-lg border border-dashed bg-muted px-6 py-10 text-center text-sm text-muted-foreground">
				Nenhuma resposta recebida ainda.
			</Empty>
		);
	}
	const columns = fields.filter(
		(field) => field.type !== 'hidden' || submissions.some((s) => s.values.some((v) => v.field?.id === field.id)),
	);

	return (
		<div className="space-y-4">
			<Card className="overflow-x-auto">
				<RecordTable
					headers={['Recebida em', ...columns.map((field) => field.label)]}
					paginate={false}
					rows={submissions.map((submission) => {
						const byField = new Map(submission.values.map((value) => [value.field?.id ?? value.field?.name, value]));

						return {
							id: submission.id,
							cells: [
								<span key="timestamp" className="whitespace-nowrap text-muted-foreground">
									{formatDateTime(submission.timestamp)}
								</span>,
								...columns.map((field) => {
									const value = byField.get(field.id);

									return value?.file ? (
										<a
											key={field.id}
											href={`/api/media/${value.file}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											Arquivo
										</a>
									) : (
										<span key={field.id} className="line-clamp-3 whitespace-pre-wrap">
											{value?.value || '—'}
										</span>
									);
								}),
							],
						};
					})}
				/>
			</Card>
			<PaginationLinks
				pagination={pagination}
				pathname={`/super-admin/conteudo/formularios/${formId}`}
				query={{ tab: 'respostas' }}
			/>
		</div>
	);
}
