/** Quote CSV fields and prevent spreadsheet applications from evaluating input. */
export function csvCell(value: unknown) {
	const text = String(value ?? '');
	const literal =
		typeof value === 'string' && (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) ? `'${text}` : text;
	return `"${literal.replaceAll('"', '""')}"`;
}
