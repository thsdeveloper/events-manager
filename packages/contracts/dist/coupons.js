import { z } from 'zod';
export const COUPON_CODE_PATTERN = /^[A-Z0-9._-]{3,32}$/;
export const couponDiscountTypeSchema = z.enum(['percentage', 'fixed']);
/**
 * O código é digitado pela pessoa no checkout e colado em redes sociais, então
 * viaja sempre em caixa alta e sem espaços — a mesma forma guardada no banco.
 */
const couponCodeSchema = z
    .string()
    .trim()
    .transform((code) => code.toUpperCase())
    .refine((code) => COUPON_CODE_PATTERN.test(code), {
    message: 'Use de 3 a 32 caracteres, entre letras, números, ponto, hífen e sublinhado.',
});
const couponFieldsSchema = z.object({
    code: couponCodeSchema,
    description: z.string().trim().max(160).nullable().optional(),
    discount_type: couponDiscountTypeSchema,
    discount_value: z.number().positive(),
    status: z.enum(['active', 'inactive']).optional(),
    starts_at: z.string().datetime().nullable().optional(),
    expires_at: z.string().datetime().nullable().optional(),
    max_uses: z.number().int().positive().nullable().optional(),
});
function addCouponIssues(coupon, context) {
    // Acima de 100% o desconto passaria do subtotal e inverteria o total.
    if (coupon.discount_type === 'percentage' && coupon.discount_value > 100) {
        context.addIssue({
            code: 'custom',
            message: 'Um desconto percentual vai no máximo até 100%.',
            path: ['discount_value'],
        });
    }
    // Uma janela invertida jamais aceitaria o cupom; avisamos no cadastro.
    if (coupon.starts_at && coupon.expires_at && new Date(coupon.starts_at) >= new Date(coupon.expires_at)) {
        context.addIssue({
            code: 'custom',
            message: 'A expiração deve ser depois do início.',
            path: ['expires_at'],
        });
    }
}
export const couponInputSchema = couponFieldsSchema.superRefine(addCouponIssues);
export const couponPatchSchema = couponFieldsSchema.partial().superRefine((coupon, context) => {
    addCouponIssues(coupon, context);
});
/** Tentativa de aplicar um cupom no checkout. */
export const couponApplySchema = z.object({ code: couponCodeSchema });
//# sourceMappingURL=coupons.js.map