import { z } from 'zod';
import { brDocumentSchema, brPhoneSchema } from './schemas.js';
/**
 * Participante de uma unidade de ingresso. Ingressos são nominais: cada
 * unidade pode ir para uma pessoa diferente, cadastrada ou não. Só nome e
 * e-mail são obrigatórios; documento e telefone ajudam no credenciamento e
 * no cadastro no provedor, mas não travam a compra.
 */
export const checkoutAttendeeSchema = z.object({
    name: z.string().trim().min(1, 'Informe o nome do participante.').max(160),
    email: z.string().trim().email('Informe um e-mail válido.').max(254),
    document: brDocumentSchema.optional(),
    phone: brPhoneSchema.optional(),
});
/**
 * Um tipo de ingresso no carrinho. `attendees` traz um participante por
 * unidade, na ordem; `null` deixa a unidade pendente para nomear depois da
 * compra. Sem `attendees`, a primeira unidade fica com quem compra.
 */
export const checkoutTicketSelectionSchema = z
    .object({
    ticketId: z.string().uuid(),
    quantity: z.number().int().positive(),
    attendees: z.array(checkoutAttendeeSchema.nullable()).optional(),
})
    .superRefine((value, context) => {
    if (value.attendees && value.attendees.length !== value.quantity) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe um participante por ingresso.',
            path: ['attendees'],
        });
    }
});
//# sourceMappingURL=tickets.js.map