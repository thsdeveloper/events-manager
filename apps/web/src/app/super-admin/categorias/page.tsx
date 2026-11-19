import { PlatformWrite } from '@/features/platform-access/PlatformPermissions';
import { canOpenPlatformPage } from '@/features/platform-access/server';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { fetchEventCategories } from '@/features/super-admin/api/server';
import { CategoryManager } from '@/features/super-admin/components/CategoryManager';

export default async function CategoriesPage() {
	if (!(await canOpenPlatformPage('/super-admin/categorias'))) return <AccessDenied scope="platform" />;

	const { data } = await fetchEventCategories();

	return (
		<div className="space-y-6">
			<PageHeader
				eyebrow="Catálogo da plataforma"
				title="Categorias de evento"
				description={
					<>
						{' '}
						Estas categorias alimentam a etapa &ldquo;Básico&rdquo; do cadastro de eventos e a navegação pública. O
						ícone e a cor definidos aqui são os mesmos que o organizador vê ao escolher.{' '}
					</>
				}
			/>
			<PlatformWrite permission="platform_categories.update">
				<CategoryManager initialCategories={data} />
			</PlatformWrite>
		</div>
	);
}
