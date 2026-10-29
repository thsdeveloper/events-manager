import { z } from 'zod';
/**
 * Participante de uma unidade de ingresso. Ingressos são nominais: cada
 * unidade pode ir para uma pessoa diferente, cadastrada ou não. Só nome e
 * e-mail são obrigatórios; documento e telefone ajudam no credenciamento e
 * no cadastro no provedor, mas não travam a compra.
 */
export declare const checkoutAttendeeSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    document: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    phone: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    phone?: string | undefined;
    document?: string | undefined;
}, {
    name: string;
    email: string;
    phone?: string | undefined;
    document?: string | undefined;
}>;
export type CheckoutAttendee = z.infer<typeof checkoutAttendeeSchema>;
/**
 * Um tipo de ingresso no carrinho. `attendees` traz um participante por
 * unidade, na ordem; `null` deixa a unidade pendente para nomear depois da
 * compra. Sem `attendees`, a primeira unidade fica com quem compra.
 */
export declare const checkoutTicketSelectionSchema: z.ZodEffects<z.ZodObject<{
    ticketId: z.ZodString;
    quantity: z.ZodNumber;
    attendees: z.ZodOptional<z.ZodArray<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        document: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
        phone: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    }, {
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    }>>, "many">>;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    ticketId: string;
    attendees?: ({
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    } | null)[] | undefined;
}, {
    quantity: number;
    ticketId: string;
    attendees?: ({
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    } | null)[] | undefined;
}>, {
    quantity: number;
    ticketId: string;
    attendees?: ({
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    } | null)[] | undefined;
}, {
    quantity: number;
    ticketId: string;
    attendees?: ({
        name: string;
        email: string;
        phone?: string | undefined;
        document?: string | undefined;
    } | null)[] | undefined;
}>;
export type CheckoutTicketSelection = z.infer<typeof checkoutTicketSelectionSchema>;
//# sourceMappingURL=tickets.d.ts.map