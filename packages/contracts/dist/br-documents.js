/**
 * Brazilian phone and taxpayer-id validation, shared by the API so the rules do
 * not live only in the browser. Values are stored as digits; punctuation typed
 * by the user is ignored here rather than rejected.
 */
export function onlyDigits(value) {
    return value.replace(/\D/g, '');
}
export function isValidCPF(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 11)
        return false;
    // Repeated digits satisfy the checksum but are never issued.
    if (/^(\d)\1{10}$/.test(digits))
        return false;
    for (const [length, factor] of [
        [9, 10],
        [10, 11],
    ]) {
        let total = 0;
        for (let index = 0; index < length; index += 1)
            total += Number(digits[index]) * (factor - index);
        if ((((total * 10) % 11) % 10) !== Number(digits[length]))
            return false;
    }
    return true;
}
export function isValidCNPJ(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 14)
        return false;
    if (/^(\d)\1{13}$/.test(digits))
        return false;
    for (const length of [12, 13]) {
        let total = 0;
        let weight = length - 7;
        for (let index = 0; index < length; index += 1) {
            total += Number(digits[index]) * weight;
            weight = weight - 1 < 2 ? 9 : weight - 1;
        }
        const remainder = total % 11;
        if ((remainder < 2 ? 0 : 11 - remainder) !== Number(digits[length]))
            return false;
    }
    return true;
}
export function isValidDocument(value) {
    return onlyDigits(value).length === 14 ? isValidCNPJ(value) : isValidCPF(value);
}
const VALID_AREA_CODES = new Set([
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
    49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
]);
export function isValidPhone(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 10 && digits.length !== 11)
        return false;
    if (!VALID_AREA_CODES.has(Number(digits.slice(0, 2))))
        return false;
    // Every Brazilian mobile gained a leading 9; landline prefixes run 2–5.
    if (digits.length === 11 && digits[2] !== '9')
        return false;
    if (digits.length === 10 && !'2345'.includes(digits[2]))
        return false;
    return true;
}
//# sourceMappingURL=br-documents.js.map