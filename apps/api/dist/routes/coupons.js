import { couponApplySchema, couponInputSchema, couponPatchSchema } from '@events-manager/contracts';
import { z } from 'zod';
import { couponProblem } from '../application/coupons/coupon-problem.js';
import { CouponService } from '../application/coupons/coupon-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseCouponRepository } from '../infrastructure/supabase/coupon-repository.js';
import { requireUser } from './auth-context.js';
function mapCouponError(error) {
    throw couponProblem(error) ?? error;
}
const eventParams = z.object({ eventId: z.string().uuid() });
const couponParams = eventParams.extend({ couponId: z.string().uuid() });
const applyBodySchema = couponApplySchema.extend({
    items: z.array(z.object({ ticketId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});
export async function couponRoutes(app, options) {
    const { clients } = options;
    const auth = createSupabaseAuthService(clients);
    const coupons = new CouponService(new SupabaseCouponRepository(clients));
    // Quem compra não precisa de conta para conferir um cupom antes de pagar.
    app.post('/api/events/:eventId/coupons/apply', async (request) => {
        const { eventId } = eventParams.parse(request.params);
        const { code, items } = applyBodySchema.parse(request.body);
        try {
            return await coupons.apply({ code, eventId, items });
        }
        catch (error) {
            mapCouponError(error);
        }
    });
    app.get('/api/events/:eventId/coupons', async (request) => {
        const context = await requireUser(request, auth);
        const { eventId } = eventParams.parse(request.params);
        try {
            return { data: await coupons.listForEvent(context.user.id, eventId) };
        }
        catch (error) {
            mapCouponError(error);
        }
    });
    app.post('/api/events/:eventId/coupons', async (request, reply) => {
        const context = await requireUser(request, auth);
        const { eventId } = eventParams.parse(request.params);
        const input = couponInputSchema.parse(request.body);
        try {
            return reply.code(201).send(await coupons.create(context.user.id, eventId, input));
        }
        catch (error) {
            mapCouponError(error);
        }
    });
    app.patch('/api/events/:eventId/coupons/:couponId', async (request) => {
        const context = await requireUser(request, auth);
        const { couponId, eventId } = couponParams.parse(request.params);
        const input = couponPatchSchema.parse(request.body);
        try {
            return await coupons.update(context.user.id, eventId, couponId, input);
        }
        catch (error) {
            mapCouponError(error);
        }
    });
    app.delete('/api/events/:eventId/coupons/:couponId', async (request, reply) => {
        const context = await requireUser(request, auth);
        const { couponId, eventId } = couponParams.parse(request.params);
        try {
            await coupons.remove(context.user.id, eventId, couponId);
            return reply.code(204).send();
        }
        catch (error) {
            mapCouponError(error);
        }
    });
}
//# sourceMappingURL=coupons.js.map