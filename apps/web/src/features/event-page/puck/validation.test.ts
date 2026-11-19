import { describe, expect, it } from 'vitest';
import { buildDefaultEventPageLayout, buildEventPageSection } from '@events-manager/contracts';
import { describePageFieldIssue } from './validation';
describe('orientações de campos da página', () => {
	it('identifica a seção e o campo sem expor caminhos técnicos', () => {
		const layout = buildDefaultEventPageLayout({ title: 'Encontro' });
		expect(
			describePageFieldIssue(
				{ path: ['sections', 1, 'anchor'], message: 'Use só letras minúsculas, números e hífens.' },
				layout,
			),
		).toBe('Sobre · Âncora do link: Use só letras minúsculas, números e hífens.');
	});
	it('orienta o envio da imagem no item incompleto', () => {
		const layout = buildDefaultEventPageLayout({ title: 'Encontro' });
		layout.sections.push(buildEventPageSection('gallery'));
		expect(
			describePageFieldIssue(
				{ path: ['sections', 3, 'items', 0, 'image'], message: 'Expected string, received null' },
				layout,
			),
		).toBe('Galeria · Item 1 · Imagem: Escolha uma imagem para este campo.');
	});
	it('orienta a correção de links do cabeçalho e de campos gerais da página', () => {
		const layout = buildDefaultEventPageLayout({ title: 'Encontro' });
		expect(describePageFieldIssue({ path: ['header', 'nav', 0, 'anchor'], message: 'Informe a âncora.' }, layout)).toBe(
			'Cabeçalho · Âncora do link: Informe a âncora.',
		);
		expect(describePageFieldIssue({ path: ['theme', 'mode'], message: 'Selecione um tema.' }, layout)).toBe(
			'Aparência · Campo: Selecione um tema.',
		);
		expect(describePageFieldIssue({ path: [], message: 'Página inválida.' }, layout)).toBe(
			'Página · Campo: Página inválida.',
		);
	});
});
