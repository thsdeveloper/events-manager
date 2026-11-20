export function birthDateIso(value: string): string {
	const iso = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split('/').reverse().join('-') : value;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
	const date = new Date(`${iso}T12:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : '';
}
