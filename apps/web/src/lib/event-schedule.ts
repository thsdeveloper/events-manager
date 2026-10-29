const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const isoDayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

function toDate(value: string | null | undefined) {
	if (!value) return null;
	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Data legível de um evento. Um evento que começa e termina no mesmo dia mostra
 * a data uma vez e o intervalo de horas; um que atravessa dias mostra as duas
 * datas, porque aí o horário sozinho confundiria.
 */
export function formatEventDateRange(start: string | null | undefined, end: string | null | undefined) {
	const startDate = toDate(start);
	if (!startDate) return '';

	const endDate = toDate(end);
	if (!endDate) return `${dayFormatter.format(startDate)}, ${timeFormatter.format(startDate)}`;

	const sameDay = isoDayFormatter.format(startDate) === isoDayFormatter.format(endDate);

	return sameDay
		? `${dayFormatter.format(startDate)}, ${timeFormatter.format(startDate)} às ${timeFormatter.format(endDate)}`
		: `${dayFormatter.format(startDate)} a ${dayFormatter.format(endDate)}`;
}

/** Onde o evento acontece, sem deixar um campo vazio virar espaço em branco. */
export function formatEventLocation(
	eventType: string | null | undefined,
	locationName: string | null | undefined,
	locationAddress: string | null | undefined,
) {
	const place = locationName?.trim() || locationAddress?.trim() || null;
	if (eventType === 'online') return 'Evento online';
	if (eventType === 'hybrid') return place ? `${place} · também online` : 'Presencial e online';

	return place ?? 'Local a confirmar';
}
