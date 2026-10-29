import { ApiError } from '../../shared/errors.js';
import { CouponExhausted, CouponExpired, CouponNotFound, CouponNotStarted, EventNotOwned, TicketNotInEvent, } from './coupon-service.js';
/**
 * Traduz uma recusa do serviço de cupom em um problema HTTP que a pessoa
 * consegue agir sobre, em vez de um "cupom inválido" genérico que não diz se o
 * código está errado, se venceu ou se acabou. Devolve `null` para qualquer
 * outro erro, que deve continuar subindo intacto.
 */
export function couponProblem(error) {
    if (error instanceof CouponNotFound)
        return new ApiError('Cupom não encontrado para este evento.', 404, 'COUPON_NOT_FOUND');
    if (error instanceof CouponNotStarted)
        return new ApiError('Este cupom ainda não começou a valer.', 422, 'COUPON_NOT_STARTED');
    if (error instanceof CouponExpired)
        return new ApiError('Este cupom expirou.', 422, 'COUPON_EXPIRED');
    if (error instanceof CouponExhausted)
        return new ApiError('Este cupom atingiu o limite de usos.', 422, 'COUPON_EXHAUSTED');
    if (error instanceof TicketNotInEvent)
        return new ApiError('Ingresso não pertence a este evento.', 422, 'TICKET_NOT_IN_EVENT');
    if (error instanceof EventNotOwned)
        return new ApiError('Este evento não é seu.', 403, 'EVENT_NOT_OWNED');
    return null;
}
//# sourceMappingURL=coupon-problem.js.map