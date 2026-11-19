import { createRef, useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import {
	Sidebar,
	SidebarProvider,
	SidebarTrigger,
	SidebarRail,
	SidebarContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuAction,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	useSidebar,
} from './sidebar';
function Status() {
	const { state } = useSidebar();

	return <output aria-label="Estado da navegação">{state}</output>;
}
beforeEach(() => {
	document.cookie = 'sidebar_state=;path=/;max-age=0';
});
it('composes navigation links with render and preserves their ref and event handlers', async () => {
	const ref = createRef<HTMLAnchorElement>();
	const parent = vi.fn(),
		child = vi.fn((e) => e.preventDefault());
	const { user } = renderWithProviders(
		<SidebarProvider>
			<Sidebar>
				<SidebarContent>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton render={<a href="/events" ref={ref} onClick={child} />} onClick={parent}>
								Eventos
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarContent>
			</Sidebar>
		</SidebarProvider>,
	);
	const link = screen.getByRole('link', { name: 'Eventos' });
	await user.click(link);
	expect(ref.current).toBe(link);
	expect(child).toHaveBeenCalledTimes(1);
	expect(parent).toHaveBeenCalledTimes(1);
	expect(screen.queryByRole('button', { name: 'Eventos' })).not.toBeInTheDocument();
});
it('supports render for group actions, labels, menu actions and nested links', () => {
	renderWithProviders(
		<SidebarProvider>
			<Sidebar>
				<SidebarGroupLabel render={<h2 />}>Organização</SidebarGroupLabel>
				<SidebarGroupAction render={<a href="/new" />}>Criar organização</SidebarGroupAction>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton>Configurações</SidebarMenuButton>
						<SidebarMenuAction render={<a href="/edit" />}>Editar</SidebarMenuAction>
						<SidebarMenuSub>
							<SidebarMenuSubItem>
								<SidebarMenuSubButton render={<a href="/receiving" />}>Recebimento</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						</SidebarMenuSub>
					</SidebarMenuItem>
				</SidebarMenu>
			</Sidebar>
		</SidebarProvider>,
	);
	expect(screen.getByRole('heading', { name: 'Organização' })).toBeInTheDocument();
	expect(screen.getByRole('link', { name: 'Criar organização' })).toHaveAttribute('href', '/new');
	expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/edit');
	expect(screen.getByRole('link', { name: 'Recebimento' })).toHaveAttribute('href', '/receiving');
});
it('exposes the expanded state and controlled region while persisting the desktop preference', async () => {
	const { user } = renderWithProviders(
		<SidebarProvider>
			<Sidebar>
				<p>Navegação</p>
				<SidebarRail />
			</Sidebar>
			<SidebarTrigger />
			<Status />
		</SidebarProvider>,
	);
	const trigger = screen.getByRole('button', { name: 'Alternar navegação' });
	expect(trigger).toHaveAttribute('aria-expanded', 'true');
	expect(document.getElementById(trigger.getAttribute('aria-controls')!)).toBeInTheDocument();
	await user.click(trigger);
	expect(trigger).toHaveAttribute('aria-expanded', 'false');
	expect(document.cookie).toContain('sidebar_state=false');
	await user.click(screen.getByRole('button', { name: 'Recolher ou expandir barra lateral' }));
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('expanded');
	expect(document.cookie).toContain('sidebar_state=true');
});
it('keeps controlled state in sync through the provider callback', async () => {
	function Controlled() {
		const [open, setOpen] = useState(false);

		return (
			<SidebarProvider open={open} onOpenChange={setOpen}>
				<SidebarTrigger />
				<Status />
			</SidebarProvider>
		);
	}
	const { user } = renderWithProviders(<Controlled />);
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('collapsed');
	await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('expanded');
});
it('reserves Ctrl+B for navigation outside editable fields', () => {
	renderWithProviders(
		<SidebarProvider>
			<SidebarTrigger />
			<Status />
			<input aria-label="Texto" />
			<div contentEditable aria-label="Editor" />
		</SidebarProvider>,
	);
	fireEvent.keyDown(screen.getByLabelText('Texto'), { key: 'b', ctrlKey: true });
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('expanded');
	fireEvent.keyDown(screen.getByLabelText('Editor'), { key: 'b', metaKey: true });
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('expanded');
	fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true });
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('collapsed');
});
it('allows custom trigger handlers to prevent toggling', async () => {
	const { user } = renderWithProviders(
		<SidebarProvider>
			<SidebarTrigger onClick={(e) => e.preventDefault()} />
			<Status />
		</SidebarProvider>,
	);
	await user.click(screen.getByRole('button', { name: 'Alternar navegação' }));
	expect(screen.getByLabelText('Estado da navegação')).toHaveTextContent('expanded');
});
it('does not submit a surrounding form when using sidebar controls', async () => {
	const submit = vi.fn((e) => e.preventDefault());
	const { user } = renderWithProviders(
		<form onSubmit={submit}>
			<SidebarProvider>
				<SidebarMenuButton>Seções</SidebarMenuButton>
				<SidebarMenuAction>Mais ações</SidebarMenuAction>
				<SidebarGroupAction>Nova seção</SidebarGroupAction>
				<SidebarRail />
			</SidebarProvider>
		</form>,
	);
	for (const name of ['Seções', 'Mais ações', 'Nova seção', 'Recolher ou expandir barra lateral'])
		await user.click(screen.getByRole('button', { name }));
	expect(submit).not.toHaveBeenCalled();
});
it('updates the mobile expanded state without overwriting the desktop preference', async () => {
	vi.stubGlobal('innerWidth', 390);
	try {
		const { user } = renderWithProviders(
			<SidebarProvider defaultOpen={false}>
				<Sidebar>
					<p>Menu móvel</p>
				</Sidebar>
				<SidebarTrigger />
			</SidebarProvider>,
		);
		const trigger = screen.getByRole('button', { name: 'Alternar navegação' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		await user.click(trigger);
		expect(await screen.findByRole('dialog', { name: 'Navegação' })).toBeInTheDocument();
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.cookie).not.toContain('sidebar_state=true');
	} finally {
		vi.unstubAllGlobals();
	}
});
