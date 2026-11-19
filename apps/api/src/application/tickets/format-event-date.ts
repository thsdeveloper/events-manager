const formatter = new Intl.DateTimeFormat('pt-BR', {
	dateStyle: 'full',
	timeStyle: 'short',
	timeZone: 'America/Sao_Paulo',
});

export function formatEventDate(value: string | null): string | null {
	if (!value) return null;
	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? null : formatter.format(date);
}
