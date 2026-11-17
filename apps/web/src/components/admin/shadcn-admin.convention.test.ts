import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const roots = [
	'src/app/admin',
	'src/app/super-admin',
	'src/components/admin',
	'src/components/map',
	'src/components/forms',
	'src/components/shared',
	'src/features/cms/components',
	'src/features/super-admin/components',
	'src/features/organizer-settings/components',
	'src/features/tickets/components',
	'src/features/coupons/components',
	'src/features/event-page/builder',
];

function sources(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);

		return entry.isDirectory() ? sources(path) : path.endsWith('.tsx') && !path.includes('.test.') ? [path] : [];
	});
}

describe('admin UI boundary', () => {
	it('composes interactive controls and tables from the shared Shadcn UI components', () => {
		const violations: string[] = [];
		const primitives = new Set([
			'button',
			'input',
			'select',
			'textarea',
			'label',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'dialog',
			'progress',
			'details',
		]);
		for (const file of roots.flatMap(sources)) {
			const source = ts.createSourceFile(
				file,
				readFileSync(file, 'utf8'),
				ts.ScriptTarget.Latest,
				true,
				ts.ScriptKind.TSX,
			);
			const visit = (node: ts.Node) => {
				if (
					(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
					primitives.has(node.tagName.getText(source))
				) {
					violations.push(
						`${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} <${node.tagName.getText(source)}>`,
					);
				}
				ts.forEachChild(node, visit);
			};
			visit(source);
		}
		expect(violations).toEqual([]);
	});
});
