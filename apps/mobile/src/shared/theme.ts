export const colors = {
	violet: '#743DF5',
	plum: '#231A33',
	apricot: '#FFD09D',
	mist: '#F3EEFF',
	white: '#FFFFFF',
	canvas: '#FCFAFF',
	muted: '#736A82',
	line: '#E7DEF3',
	success: '#147D58',
	successBg: '#E8F7EF',
	warning: '#9C600E',
	warningBg: '#FFF2DF',
	danger: '#B3364E',
};
export const fonts = { body: 'DMSans', bold: 'DMSansBold' };
export const money = (amount: number) =>
	new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
export const dateLabel = (date: string) =>
	new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'America/Sao_Paulo',
	}).format(new Date(date));
export const timeLabel = (date: string) =>
	new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(
		new Date(date),
	);
