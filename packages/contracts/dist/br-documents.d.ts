/**
 * Brazilian phone and taxpayer-id validation, shared by the API so the rules do
 * not live only in the browser. Values are stored as digits; punctuation typed
 * by the user is ignored here rather than rejected.
 */
export declare function onlyDigits(value: string): string;
export declare function isValidCPF(value: string): boolean;
export declare function isValidCNPJ(value: string): boolean;
export declare function isValidDocument(value: string): boolean;
export declare function isValidPhone(value: string): boolean;
//# sourceMappingURL=br-documents.d.ts.map