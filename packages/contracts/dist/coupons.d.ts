import { z } from 'zod';
export declare const COUPON_CODE_PATTERN: RegExp;
export declare const couponDiscountTypeSchema: z.ZodEnum<["percentage", "fixed"]>;
export type CouponDiscountType = z.infer<typeof couponDiscountTypeSchema>;
export declare const couponInputSchema: z.ZodEffects<z.ZodObject<{
    code: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    discount_type: z.ZodEnum<["percentage", "fixed"]>;
    discount_value: z.ZodNumber;
    status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
    starts_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expires_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    max_uses: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}, {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}>, {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}, {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}>;
export declare const couponPatchSchema: z.ZodEffects<z.ZodObject<{
    code: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    discount_type: z.ZodOptional<z.ZodEnum<["percentage", "fixed"]>>;
    discount_value: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<["active", "inactive"]>>>;
    starts_at: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    expires_at: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    max_uses: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    discount_type?: "percentage" | "fixed" | undefined;
    discount_value?: number | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}, {
    code?: string | undefined;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    discount_type?: "percentage" | "fixed" | undefined;
    discount_value?: number | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}>, {
    code?: string | undefined;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    discount_type?: "percentage" | "fixed" | undefined;
    discount_value?: number | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}, {
    code?: string | undefined;
    status?: "active" | "inactive" | undefined;
    description?: string | null | undefined;
    discount_type?: "percentage" | "fixed" | undefined;
    discount_value?: number | undefined;
    starts_at?: string | null | undefined;
    expires_at?: string | null | undefined;
    max_uses?: number | null | undefined;
}>;
/** Tentativa de aplicar um cupom no checkout. */
export declare const couponApplySchema: z.ZodObject<{
    code: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type CouponInput = z.infer<typeof couponInputSchema>;
export type CouponPatch = z.infer<typeof couponPatchSchema>;
export interface Coupon {
    id: string;
    event_id: string;
    code: string;
    description: string | null;
    discount_type: CouponDiscountType;
    discount_value: number;
    status: 'active' | 'inactive';
    starts_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    uses: number;
    date_created: string;
    date_updated: string;
}
/** O que o checkout devolve depois de aceitar um cupom. */
export interface AppliedCoupon {
    code: string;
    discount: number;
    subtotal: number;
    total: number;
}
//# sourceMappingURL=coupons.d.ts.map