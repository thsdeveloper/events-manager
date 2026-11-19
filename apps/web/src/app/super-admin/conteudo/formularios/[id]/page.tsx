import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { notFound } from 'next/navigation';
import { fetchCmsForm, fetchCmsFormSubmissions } from '@/features/cms/api/server';
import { FormEditor } from '@/features/cms/components/FormEditor';
import { FormSubmissionsTable } from '@/features/cms/components/FormSubmissionsTable';
import { BackendRequestError } from '@/lib/backend-auth';

interface EditFormPageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ tab?: string; page?: string }>;
}

export default async function EditFormPage({ params, searchParams }: EditFormPageProps) {
	if (!(await canOpenPlatformPage('/super-admin/conteudo/formularios/[id]'))) return <AccessDenied scope="platform" />;

	const [{ id }, query] = await Promise.all([params, searchParams]);
	try {
		const [form, submissions] = await Promise.all([
			fetchCmsForm(id),
			fetchCmsFormSubmissions(id, { page: Number(query.page ?? 1), limit: 25 }),
		]);

		return (
			<FormEditor
				form={form}
				initialTab={query.tab === 'respostas' ? 'respostas' : 'campos'}
				submissions={
					<FormSubmissionsTable
						formId={form.id}
						fields={form.fields}
						submissions={submissions.data}
						pagination={submissions.pagination}
					/>
				}
			/>
		);
	} catch (error) {
		if (error instanceof BackendRequestError && error.status === 404) notFound();
		throw error;
	}
}
