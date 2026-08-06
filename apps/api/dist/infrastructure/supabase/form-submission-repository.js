import { FormUnavailable, InvalidFormSubmission, } from '../../application/content/submit-form.js';
export class SupabaseFormSubmissionRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async getDefinition(formId) {
        const { data: form, error } = await this.database
            .from('forms')
            .select('id,is_active,fields:form_fields(id,type,required,validation,choices)')
            .eq('id', formId)
            .maybeSingle();
        if (error)
            throw error;
        if (!form)
            return null;
        return { active: form.is_active, fields: form.fields ?? [] };
    }
    async filesBelongToUser(fileIds, userId) {
        if (!fileIds.length)
            return true;
        if (!userId)
            return false;
        const uniqueIds = [...new Set(fileIds)];
        const { data, error } = await this.database
            .from('media_files')
            .select('id')
            .in('id', uniqueIds)
            .eq('uploaded_by', userId);
        if (error)
            throw error;
        return data?.length === uniqueIds.length;
    }
    async create(formId, userId, values) {
        const { data, error } = await this.database.rpc('create_validated_form_submission', {
            target_form: formId,
            target_submitted_by: userId,
            target_values: values.map((item) => ({ field: item.field, file: item.file, value: item.value })),
        });
        if (!error)
            return data;
        const message = error.message.toLowerCase();
        if (message.includes('form unavailable'))
            throw new FormUnavailable();
        if (message.includes('invalid form submission'))
            throw new InvalidFormSubmission('Submissão inválida.');
        throw error;
    }
}
//# sourceMappingURL=form-submission-repository.js.map