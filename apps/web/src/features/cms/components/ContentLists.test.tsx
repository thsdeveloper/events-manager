import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import type { CmsActivityEntry, CmsFormRow, CmsPageRow, CmsPostListRow } from '../types';
import { ActivityPanel } from './ActivityPanel';
import { CmsOverview } from './CmsOverview';
import { CmsPageHeader } from './CmsPageHeader';
import { FormSubmissionsTable } from './FormSubmissionsTable';
import { FormsList } from './FormsList';
import { PagesList } from './PagesList';
import { PaginationLinks } from './PaginationLinks';
import { PostsList } from './PostsList';
import { StatusBadge } from './StatusBadge';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const page: CmsPageRow = {
	id: 'p1',
	title: 'Sobre',
	permalink: '/sobre',
	status: 'published',
	published_at: '2026-01-01T00:00:00Z',
	seo: null,
	sort: null,
	date_created: '2026-01-01T00:00:00Z',
	date_updated: null,
};

describe('content lists', () => {
	it('summarises the overview counts per status and links each card to its section', () => {
		renderWithProviders(
			<CmsOverview
				data={{
					pages: { draft: 1, in_review: 2, published: 3 },
					posts: { draft: 0, in_review: 0, published: 4 },
					forms: 1,
					submissions: 7,
					media: 9,
					redirects: 2,
					navigations: 2,
				}}
			/>,
		);

		const pages = screen.getByRole('link', { name: /páginas/i });
		expect(pages).toHaveAttribute('href', '/super-admin/conteudo/paginas');
		expect(pages).toHaveTextContent('6');
		expect(pages).toHaveTextContent('3 publicado');
		const forms = screen
			.getAllByRole('link')
			.find((link) => link.getAttribute('href') === '/super-admin/conteudo/formularios');
		expect(forms).toHaveTextContent('7 respostas recebidas');
	});

	it('lists pages with status, permalink and an edit link, or an empty state', () => {
		const { rerender } = renderWithProviders(
			<PagesList pages={[page, { ...page, id: 'p2', status: 'draft', title: 'Rascunho' }]} />,
		);

		const rows = screen.getAllByRole('row').slice(1);
		expect(rows[0]).toHaveTextContent('/sobre');
		expect(rows[0]).toHaveTextContent('Publicado');
		expect(within(rows[1]).getByRole('link', { name: /editar/i })).toHaveAttribute(
			'href',
			'/super-admin/conteudo/paginas/p2',
		);

		rerender(<PagesList pages={[]} />);
		expect(screen.getByText(/nenhuma página encontrada/i)).toBeInTheDocument();
	});

	it('flags published content with a future date as scheduled', () => {
		renderWithProviders(<StatusBadge status="published" publishedAt="2999-01-01T00:00:00Z" />);

		expect(screen.getByText('Agendado')).toBeInTheDocument();
	});

	it('lists posts and forms with their public paths and states', () => {
		const post: CmsPostListRow = {
			id: 'x',
			title: 'Olá',
			slug: 'ola',
			description: 'Resumo',
			status: 'draft',
			published_at: null,
			date_updated: null,
			image: null,
		};
		const form: CmsFormRow = {
			id: 'f',
			title: 'Contato',
			submit_label: null,
			success_message: null,
			on_success: 'redirect',
			success_redirect_url: '/ok',
			is_active: false,
			emails: null,
			sort: null,
			date_created: '2026-01-01T00:00:00Z',
			date_updated: null,
		};
		const { rerender } = renderWithProviders(<PostsList posts={[post]} />);
		expect(screen.getByText('/blog/ola')).toBeInTheDocument();
		rerender(<PostsList posts={[]} />);
		expect(screen.getByText(/nenhum post encontrado/i)).toBeInTheDocument();

		rerender(<FormsList forms={[form]} />);
		expect(screen.getByText('Inativo')).toBeInTheDocument();
		expect(screen.getByText(/redireciona ao enviar/i)).toBeInTheDocument();
		rerender(<FormsList forms={[]} />);
		expect(screen.getByText(/nenhum formulário/i)).toBeInTheDocument();
	});

	it('only paginates when there is more than one page and keeps the filters in the links', () => {
		const { rerender } = renderWithProviders(
			<PaginationLinks
				pagination={{ page: 2, limit: 20, total: 45, pageCount: 3 }}
				pathname="/x"
				query={{ search: 'a', status: undefined }}
			/>,
		);

		expect(screen.getByRole('link', { name: /anterior/i })).toHaveAttribute('href', '/x?search=a&page=1');
		expect(screen.getByRole('link', { name: /próxima/i })).toHaveAttribute('href', '/x?search=a&page=3');

		rerender(<PaginationLinks pagination={{ page: 1, limit: 20, total: 3, pageCount: 1 }} pathname="/x" />);
		expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
	});

	it('narrates the activity log with the actor name and a readable action', () => {
		const entries: CmsActivityEntry[] = [
			{
				id: '1',
				action: 'update',
				resource_type: 'page',
				resource_id: 'p',
				before_data: null,
				after_data: null,
				metadata: null,
				date_created: new Date().toISOString(),
				actor: { id: 'u', first_name: 'Ana', last_name: 'Silva', email: null },
			},
			{
				id: '2',
				action: 'reorder',
				resource_type: 'page_block',
				resource_id: 'p',
				before_data: null,
				after_data: null,
				metadata: null,
				date_created: new Date().toISOString(),
				actor: null,
			},
		];
		const { rerender } = renderWithProviders(<ActivityPanel entries={entries} />);

		const items = screen.getAllByRole('listitem');
		expect(items[0]).toHaveTextContent('Ana Silva atualizou a página');
		expect(items[1]).toHaveTextContent('Sistema reordenou um bloco');

		rerender(<ActivityPanel entries={[]} />);
		expect(screen.getByText(/nenhuma atividade/i)).toBeInTheDocument();
	});

	it('renders submissions as one column per field, linking uploaded files', () => {
		const fields = [
			{
				id: 'f1',
				name: 'nome',
				type: 'text' as const,
				label: 'Nome',
				placeholder: null,
				help: null,
				validation: null,
				width: '100' as const,
				choices: null,
				required: true,
			},
			{
				id: 'f2',
				name: 'anexo',
				type: 'file' as const,
				label: 'Anexo',
				placeholder: null,
				help: null,
				validation: null,
				width: '100' as const,
				choices: null,
				required: false,
			},
		];
		const submissions = [
			{
				id: 's1',
				timestamp: '2026-01-01T12:00:00Z',
				submitted_by: null,
				values: [
					{
						id: 'v1',
						value: 'Ana',
						sort: 1,
						file: null,
						field: { id: 'f1', name: 'nome', label: 'Nome', type: 'text' },
					},
					{
						id: 'v2',
						value: null,
						sort: 2,
						file: 'media-1',
						field: { id: 'f2', name: 'anexo', label: 'Anexo', type: 'file' },
					},
				],
			},
		];
		const { rerender } = renderWithProviders(
			<FormSubmissionsTable
				formId="f"
				fields={fields}
				submissions={submissions}
				pagination={{ page: 1, limit: 25, total: 1, pageCount: 1 }}
			/>,
		);

		expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
		expect(screen.getByText('Ana')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /arquivo/i })).toHaveAttribute('href', '/api/media/media-1');

		rerender(
			<FormSubmissionsTable
				formId="f"
				fields={fields}
				submissions={[]}
				pagination={{ page: 1, limit: 25, total: 0, pageCount: 0 }}
			/>,
		);
		expect(screen.getByText(/nenhuma resposta/i)).toBeInTheDocument();
	});

	it('renders the section header with eyebrow, title and actions', () => {
		renderWithProviders(<CmsPageHeader title="Páginas" description="Tudo" actions={<button>Nova</button>} />);

		expect(screen.getByRole('heading', { name: 'Páginas' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Nova' })).toBeInTheDocument();
	});
});
