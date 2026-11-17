import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Calendar } from 'lucide-react';
import { renderWithProviders } from '@/test';
import { Input } from '@/components/ui/input';
import { FormField } from './FormField';
import { FormSection } from './FormSection';
import ImageUpload from './ImageUpload';

describe('admin form compositions', () => {
	it('restores a pending cover when returning to the step and clears the held file on removal', async () => {
		const onChange = vi.fn(),
			onFileSelected = vi.fn();
		const { user } = renderWithProviders(
			<ImageUpload
				label="Capa"
				required
				description="Capa exibida na página do evento"
				value="local-file"
				pendingPreviewUrl="blob:pending-cover"
				uploadOnSelect={false}
				onChange={onChange}
				onFileSelected={onFileSelected}
			/>,
		);
		expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'blob:pending-cover');
		expect(screen.getByLabelText(/Capa \*/)).toHaveAttribute('type', 'file');
		expect(screen.getByText('Capa exibida na página do evento')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Remover imagem' }));
		expect(onChange).toHaveBeenCalledWith(null);
		expect(onFileSelected).toHaveBeenCalledWith(null);
		expect(screen.queryByRole('img', { name: 'Preview' })).not.toBeInTheDocument();
	});
	it('keeps an empty required summary usable before showing length guidance', async () => {
		const { user } = renderWithProviders(
			<FormField label="Resumo" name="short_description" required maxLength={50} showCounter hint="Descreva o evento">
				<Input id="short_description" />
			</FormField>,
		);
		const input = screen.getByRole('textbox', { name: /Resumo/ });
		expect(screen.getByText('0/50')).toBeInTheDocument();
		expect(screen.getByText('Descreva o evento')).toBeInTheDocument();
		expect(screen.queryByText(/Adicione mais/)).not.toBeInTheDocument();
		await user.click(input);
		await user.tab();
		expect(input).not.toHaveFocus();
	});
	it('keeps blur validation and the short-description guidance when editing', async () => {
		const onBlur = vi.fn();
		const { user, rerender } = renderWithProviders(
			<FormField
				label="Resumo"
				name="short_description"
				required
				value="Festa"
				maxLength={50}
				showCounter
				onBlur={onBlur}
			>
				<Input id="short_description" />
			</FormField>,
		);
		expect(screen.getByText(/Adicione mais 45 caracteres/)).toBeInTheDocument();
		await user.click(screen.getByRole('textbox', { name: /Resumo/ }));
		await user.tab();
		expect(onBlur).toHaveBeenCalled();
		rerender(
			<FormField
				label="Resumo"
				name="short_description"
				value={'x'.repeat(50)}
				maxLength={50}
				showCounter
				validationState="valid"
			>
				<Input id="short_description" />
			</FormField>,
		);
		expect(screen.queryByText(/Adicione mais/)).not.toBeInTheDocument();
		expect(screen.getByText('50/50')).toBeInTheDocument();
		rerender(
			<FormField label="Resumo" name="short_description" error="Revise o resumo" hint="Ajuda" validationState="error">
				<Input id="short_description" />
			</FormField>,
		);
		expect(screen.getByText('Revise o resumo')).toBeInTheDocument();
		expect(screen.queryByText('Ajuda')).not.toBeInTheDocument();
	});

	it.each(['📅', Calendar])('supports optional section icons without hiding the heading', (icon) => {
		renderWithProviders(
			<FormSection title="Agenda" icon={icon}>
				<p>Datas</p>
			</FormSection>,
		);
		expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
		expect(screen.queryByText('Obrigatório')).not.toBeInTheDocument();
	});

	it.each([
		['type', true],
		['size', true],
		['type', false],
		['size', false],
	] as const)(
		'rejects an invalid image %s before uploading, with error callback: %s',
		async (invalid, withCallback) => {
			const onChange = vi.fn(),
				onUploadError = vi.fn();
			renderWithProviders(
				<ImageUpload label="Capa" onChange={onChange} onUploadError={withCallback ? onUploadError : undefined} />,
			);
			const file = new File(['image'], invalid === 'type' ? 'arquivo.txt' : 'capa.png', {
				type: invalid === 'type' ? 'text/plain' : 'image/png',
			});
			if (invalid === 'size') Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
			await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText('Capa'), file);
			expect(screen.getByRole('alert')).toHaveTextContent(
				invalid === 'type' ? 'selecione apenas arquivos de imagem' : 'no máximo 5MB',
			);
			if (withCallback) expect(onUploadError).toHaveBeenCalled();
			else expect(onUploadError).not.toHaveBeenCalled();
			expect(onChange).not.toHaveBeenCalled();
		},
	);
	it('announces when field validation is in progress', () => {
		renderWithProviders(
			<FormField label="Título" name="title" validationState="validating">
				<Input id="title" />
			</FormField>,
		);
		expect(screen.getByRole('status', { name: 'Validando campo' })).toBeInTheDocument();
	});
	it('keeps the field label, counter, hint and validation message', () => {
		const { rerender } = renderWithProviders(
			<FormField label="Título" name="title" hint="Informe o título" maxLength={50} value="Festa" showCounter>
				<Input id="title" defaultValue="Festa" />
			</FormField>,
		);
		expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Festa');
		expect(screen.getByText('5/50')).toBeInTheDocument();
		expect(screen.getByText('Informe o título')).toBeInTheDocument();
		rerender(
			<FormField label="Título" name="title" error="Título obrigatório">
				<Input id="title" />
			</FormField>,
		);
		expect(screen.getByText('Título obrigatório')).toBeInTheDocument();
	});

	it('presents the section heading, description and required indication', () => {
		renderWithProviders(
			<FormSection title="Dados do evento" description="Preencha os dados" required>
				<p>Campos</p>
			</FormSection>,
		);
		expect(screen.getByRole('heading', { name: /Dados do evento/ })).toBeInTheDocument();
		expect(screen.getByText('Preencha os dados')).toBeInTheDocument();
		expect(screen.getByText('Obrigatório')).toBeInTheDocument();
	});

	it('keeps the labelled file input and allows removing an existing cover', async () => {
		const onChange = vi.fn();
		const { user } = renderWithProviders(
			<ImageUpload label="Capa" value="00000000-0000-4000-8000-000000000001" onChange={onChange} />,
		);
		expect(screen.getByLabelText('Capa')).toHaveAttribute('type', 'file');
		await user.click(screen.getByRole('button', { name: 'Remover imagem' }));
		expect(onChange).toHaveBeenCalledWith(null);
		expect(screen.getByRole('button', { name: /Clique para selecionar/ })).toBeInTheDocument();
	});
});
