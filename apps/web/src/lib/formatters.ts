const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
	currency: 'BRL',
	style: 'currency',
});
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
	dateStyle: 'medium',
	timeStyle: 'short',
});

export function formatInteger(value: number) {
	return integerFormatter.format(value);
}

export function formatCurrency(value: number) {
	return currencyFormatter.format(value);
}

export function formatDateTime(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);

	return dateTimeFormatter.format(date);
}
