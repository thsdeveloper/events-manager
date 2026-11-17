import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
			<p className="rounded-lg border border-dashed bg-muted/40 px-6 py-10 text-center text-sm text-muted-foreground">
				Nenhuma resposta recebida ainda.
			</p>
		);
	}
	const columns = fields.filter(
		(field) => field.type !== 'hidden' || submissions.some((s) => s.values.some((v) => v.field?.id === field.id)),
	);

	return (
		<div className="space-y-4">
			<Card className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
				<Table className="w-full text-left text-sm">
					<TableHeader className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
						<TableRow>
							<TableHead className="px-4 py-3">Recebida em</TableHead>
							{columns.map((field) => (
								<TableHead key={field.id} className="px-4 py-3">
									{field.label}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody className="divide-y divide-border">
						{submissions.map((submission) => {
							const byField = new Map(submission.values.map((value) => [value.field?.id ?? value.field?.name, value]));

							return (
								<TableRow key={submission.id} className="align-top hover:bg-muted/40">
									<TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
										{formatDateTime(submission.timestamp)}
									</TableCell>
									{columns.map((field) => {
										const value = byField.get(field.id);

										return (
											<TableCell key={field.id} className="max-w-xs px-4 py-3 text-foreground">
												{value?.file ? (
													<a
														href={`/api/media/${value.file}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline"
													>
														Arquivo
													</a>
												) : (
													<span className="line-clamp-3 whitespace-pre-wrap">{value?.value || '—'}</span>
												)}
											</TableCell>
										);
									})}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>
			<PaginationLinks
				pagination={pagination}
				pathname={`/super-admin/conteudo/formularios/${formId}`}
				query={{ tab: 'respostas' }}
			/>
		</div>
	);
}
