import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { FormEditor } from '@/features/cms/components/FormEditor';

export default async function NewFormPage() {
	if (!(await canOpenPlatformPage('/super-admin/conteudo/formularios/novo'))) return <AccessDenied scope="platform" />;

	return <FormEditor form={null} />;
}
