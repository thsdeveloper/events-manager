/**
 * Brazilian phone and taxpayer-id handling.
 *
 * The database stores digits only — masks are presentation. Every helper here
 * therefore takes whatever the user typed and works on the digits, so a value
 * pasted with punctuation validates the same as one typed clean.
 */

export function onlyDigits(value: string) {
	return value.replace(/\D/g, '');
}

/** Landline: (11) 3456-7890 — mobile: (11) 91234-5678 */
export function maskPhone(value: string) {
	const digits = onlyDigits(value).slice(0, 11);
	if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1');
	if (digits.length <= 6) return digits.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
	if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');

	return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

export function maskCPF(value: string) {
	const digits = onlyDigits(value).slice(0, 11);

	return digits
		.replace(/^(\d{3})(\d)/, '$1.$2')
		.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
		.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskCNPJ(value: string) {
	const digits = onlyDigits(value).slice(0, 14);

	return digits
		.replace(/^(\d{2})(\d)/, '$1.$2')
		.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
		.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
		.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

/**
 * One field accepts both documents, so the mask switches on length. Eleven
 * digits is a complete CPF; anything longer can only be heading for a CNPJ.
 */
export function maskDocument(value: string) {
	return onlyDigits(value).length > 11 ? maskCNPJ(value) : maskCPF(value);
}

export function isValidCPF(value: string) {
	const digits = onlyDigits(value);
	if (digits.length !== 11) return false;
	// Repeated digits pass the checksum but are never issued.
	if (/^(\d)\1{10}$/.test(digits)) return false;

	for (const [length, factor] of [
		[9, 10],
		[10, 11],
	] as const) {
		let total = 0;
		for (let index = 0; index < length; index += 1) total += Number(digits[index]) * (factor - index);
		const remainder = (total * 10) % 11 % 10;
		if (remainder !== Number(digits[length])) return false;
	}

	return true;
}

export function isValidCNPJ(value: string) {
	const digits = onlyDigits(value);
	if (digits.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(digits)) return false;

	for (const length of [12, 13]) {
		let total = 0;
		let weight = length - 7;
		for (let index = 0; index < length; index += 1) {
			total += Number(digits[index]) * weight;
			weight = weight - 1 < 2 ? 9 : weight - 1;
		}
		const remainder = total % 11;
		const expected = remainder < 2 ? 0 : 11 - remainder;
		if (expected !== Number(digits[length])) return false;
	}

	return true;
}

export function isValidDocument(value: string) {
	const digits = onlyDigits(value);

	return digits.length === 14 ? isValidCNPJ(digits) : isValidCPF(digits);
}

/** Area codes actually in use; 10 or 11 digits, mobiles always start with 9. */
const VALID_AREA_CODES = new Set([
	11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
	49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
	91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function isValidPhone(value: string) {
	const digits = onlyDigits(value);
	if (digits.length !== 10 && digits.length !== 11) return false;
	if (!VALID_AREA_CODES.has(Number(digits.slice(0, 2)))) return false;
	// An 11-digit number is a mobile, and every Brazilian mobile gained a leading 9.
	if (digits.length === 11 && digits[2] !== '9') return false;
	// Landline prefixes run from 2 to 5.
	if (digits.length === 10 && !'2345'.includes(digits[2])) return false;

	return true;
}

export function documentKind(value: string): 'cpf' | 'cnpj' | 'unknown' {
	const length = onlyDigits(value).length;
	if (length === 11) return 'cpf';
	if (length === 14) return 'cnpj';

	return 'unknown';
}
