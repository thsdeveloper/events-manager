import { PageHeader, type PageHeaderProps } from '@/components/design-system/molecules/PageHeader';

export function CmsPageHeader({ eyebrow = 'Conteúdo', ...props }: PageHeaderProps) {
	return <PageHeader eyebrow={eyebrow} {...props} />;
}
