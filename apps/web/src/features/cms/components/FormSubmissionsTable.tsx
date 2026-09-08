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
			<p className="rounded-lg border border-dashed bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
				Nenhuma resposta recebida ainda.
			</p>
		);
	}
	const columns = fields.filter(
		(field) => field.type !== 'hidden' || submissions.some((s) => s.values.some((v) => v.field?.id === field.id)),
	);

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
				<table className="w-full text-left text-sm">
					<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
						<tr>
							<th className="px-4 py-3">Recebida em</th>
							{columns.map((field) => (
								<th key={field.id} className="px-4 py-3">
									{field.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{submissions.map((submission) => {
							const byField = new Map(submission.values.map((value) => [value.field?.id ?? value.field?.name, value]));

							return (
								<tr key={submission.id} className="align-top hover:bg-slate-50">
									<td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(submission.timestamp)}</td>
									{columns.map((field) => {
										const value = byField.get(field.id);

										return (
											<td key={field.id} className="max-w-xs px-4 py-3 text-slate-800">
												{value?.file ? (
													<a
														href={`/api/media/${value.file}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-violet-700 hover:underline"
													>
														Arquivo
													</a>
												) : (
													<span className="line-clamp-3 whitespace-pre-wrap">{value?.value || '—'}</span>
												)}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<PaginationLinks
				pagination={pagination}
				pathname={`/super-admin/conteudo/formularios/${formId}`}
				query={{ tab: 'respostas' }}
			/>
		</div>
	);
}
