import { z } from 'zod';

export interface SubmittedFormValue {
	field: string;
	file?: string;
	value?: string;
}

export interface FormFieldDefinition {
	choices: unknown;
	id: string;
	required: boolean;
	type: string | null;
	validation: string | null;
}

export interface FormSubmissionRepository {
	create(formId: string, userId: string | null, values: SubmittedFormValue[]): Promise<string>;
	filesBelongToUser(fileIds: string[], userId: string | null): Promise<boolean>;
	getDefinition(formId: string): Promise<{ active: boolean; fields: FormFieldDefinition[] } | null>;
}

export class FormUnavailable extends Error {}
export class InvalidFormSubmission extends Error {}

function choicesOf(field: FormFieldDefinition) {
	if (!Array.isArray(field.choices)) return [];
	return field.choices.flatMap((choice) => {
		if (!choice || typeof choice !== 'object' || !('value' in choice)) return [];
		return [String(choice.value)];
	});
}

function validateRules(value: string, rules: string | null) {
	for (const rule of rules?.split('|') ?? []) {
		const [name, argument] = rule.split(':');
		if (name === 'email' && !z.string().email().safeParse(value).success) return false;
		if (name === 'url' && !z.string().url().safeParse(value).success) return false;
		const length = Number(argument);
		if (name === 'min' && Number.isFinite(length) && value.length < length) return false;
		if (name === 'max' && Number.isFinite(length) && value.length > length) return false;
		if (name === 'length' && Number.isFinite(length) && value.length !== length) return false;
	}
	return true;
}

export class SubmitForm {
	constructor(private readonly repository: FormSubmissionRepository) {}

	async execute(formId: string, userId: string | null, values: SubmittedFormValue[]) {
		const definition = await this.repository.getDefinition(formId);
		if (!definition?.active) throw new FormUnavailable();

		const fields = new Map(definition.fields.map((field) => [field.id, field]));
		const submitted = new Map<string, SubmittedFormValue>();
		for (const item of values) {
			if (submitted.has(item.field)) throw new InvalidFormSubmission('Um campo foi enviado mais de uma vez.');
			const field = fields.get(item.field);
			if (!field) throw new InvalidFormSubmission('A submissão contém um campo inválido.');
			const hasValue = typeof item.value === 'string' && item.value.trim().length > 0;
			const hasFile = Boolean(item.file);
			if (hasValue === hasFile) throw new InvalidFormSubmission('Informe texto ou arquivo para cada campo.');
			if (field.type === 'file' ? !hasFile : hasFile) {
				throw new InvalidFormSubmission('O tipo de resposta não corresponde ao campo.');
			}
			if (hasValue) {
				const value = item.value!.trim();
				if (!validateRules(value, field.validation)) {
					throw new InvalidFormSubmission('Uma resposta não atende às regras do campo.');
				}
				const choices = choicesOf(field);
				if (choices.length && !choices.includes(value)) {
					throw new InvalidFormSubmission('Uma opção enviada não pertence ao campo.');
				}
			}
			submitted.set(item.field, item);
		}

		for (const field of definition.fields) {
			if (field.required && !submitted.has(field.id)) {
				throw new InvalidFormSubmission('Preencha todos os campos obrigatórios.');
			}
		}

		const fileIds = values.flatMap((item) => (item.file ? [item.file] : []));
		if (!(await this.repository.filesBelongToUser(fileIds, userId))) {
			throw new InvalidFormSubmission('Um arquivo enviado não pertence ao usuário autenticado.');
		}

		return this.repository.create(formId, userId, values);
	}
}
