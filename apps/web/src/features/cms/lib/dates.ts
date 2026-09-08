const pad = (value: number) => String(value).padStart(2, '0');

/** ISO → valor de um `<input type="datetime-local">` no fuso do navegador. */
export function toDateTimeLocal(iso: string | null | undefined) {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
		date.getMinutes(),
	)}`;
}

/** Valor do `datetime-local` → ISO com fuso; vazio ou inválido vira `null`. */
export function fromDateTimeLocal(value: string) {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	date.setSeconds(0, 0);

	return date.toISOString();
}

const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' });
const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	['year', 1000 * 60 * 60 * 24 * 365],
	['month', 1000 * 60 * 60 * 24 * 30],
	['day', 1000 * 60 * 60 * 24],
	['hour', 1000 * 60 * 60],
	['minute', 1000 * 60],
];

export function formatRelativeDate(iso: string, now: Date = new Date()) {
	const elapsed = new Date(iso).getTime() - now.getTime();
	if (Number.isNaN(elapsed)) return '';
	for (const [unit, size] of units) {
		if (Math.abs(elapsed) >= size) return relativeFormatter.format(Math.trunc(elapsed / size), unit);
	}

	return 'agora mesmo';
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function formatDateTime(iso: string | null | undefined) {
	if (!iso) return '—';
	const date = new Date(iso);

	return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}
