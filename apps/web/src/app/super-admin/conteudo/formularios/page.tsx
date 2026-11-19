import { PlatformCan } from '@/features/platform-access/PlatformPermissions';
import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchCmsForms } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { FormsList } from '@/features/cms/components/FormsList';

export default async function FormsPage() {
	if (!(await canOpenPlatformPage('/super-admin/conteudo/formularios'))) return <AccessDenied scope="platform" />;

	const { data } = await fetchCmsForms();

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Formulários"
				description="Formulários de contato, inscrição ou pesquisa. Exiba-os com o bloco “Formulário” em qualquer página."
				actions={
					<PlatformCan permission="platform_forms.update">
						<Button asChild>
							<Link href="/super-admin/conteudo/formularios/novo">
								<Plus className="mr-2 size-4" />
								Novo formulário
							</Link>
						</Button>
					</PlatformCan>
				}
			/>
			<FormsList forms={data} />
		</div>
	);
}
