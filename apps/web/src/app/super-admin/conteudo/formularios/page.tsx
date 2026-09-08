import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { fetchCmsForms } from '@/features/cms/api/server';
import { CmsPageHeader } from '@/features/cms/components/CmsPageHeader';
import { FormsList } from '@/features/cms/components/FormsList';

export default async function FormsPage() {
	const { data } = await fetchCmsForms();

	return (
		<div className="space-y-6">
			<CmsPageHeader
				title="Formulários"
				description="Formulários de contato, inscrição ou pesquisa. Exiba-os com o bloco “Formulário” em qualquer página."
				actions={
					<Button asChild>
						<Link href="/super-admin/conteudo/formularios/novo">
							<Plus className="mr-2 size-4" />
							Novo formulário
						</Link>
					</Button>
				}
			/>
			<FormsList forms={data} />
		</div>
	);
}
