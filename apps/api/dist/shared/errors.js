import { ZodError } from 'zod';
export class ApiError extends Error {
    statusCode;
    code;
    context;
    /**
     * Details of 5xx problems are masked by default, so an unexpected failure
     * never leaks internals. An application error can opt in when its message was
     * written for the person (e.g. "SMS is not configured in this environment").
     */
    exposeDetail;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', context, options = {}) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.context = context;
        this.exposeDetail = options.exposeDetail ?? false;
    }
}
export function installErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        const requestId = request.id;
        const apiError = normalizeError(error);
        if (apiError.statusCode >= 500) {
            request.log.error({ err: error, requestId }, apiError.message);
        }
        return sendProblem(reply, request, apiError, requestId);
    });
}
function normalizeError(error) {
    if (error instanceof ApiError)
        return error;
    if (error instanceof ZodError) {
        return new ApiError('Os dados enviados são inválidos.', 422, 'VALIDATION_ERROR', {
            errors: error.flatten(),
        });
    }
    if (error && typeof error === 'object' && 'code' in error) {
        const code = String(error.code);
        if (code === '23505')
            return new ApiError('Este registro já existe.', 409, 'CONFLICT');
        if (code === '23503')
            return new ApiError('Um registro relacionado não foi encontrado.', 422, 'INVALID_RELATION');
        if (code === '23514')
            return new ApiError('Os dados violam uma regra de negócio.', 422, 'CONSTRAINT_VIOLATION');
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = Number(error.statusCode);
        if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
            const message = statusCode >= 500
                ? 'Ocorreu um erro interno. Tente novamente em alguns instantes.'
                : error instanceof Error
                    ? error.message
                    : 'A requisição não pôde ser processada.';
            const code = statusCode === 404 ? 'NOT_FOUND' : statusCode < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR';
            return new ApiError(message, statusCode, code);
        }
    }
    return new ApiError('Ocorreu um erro interno. Tente novamente em alguns instantes.');
}
function sendProblem(reply, request, error, requestId) {
    if (error.statusCode === 429)
        reply.header('retry-after', '60');
    return reply
        .code(error.statusCode)
        .type('application/problem+json')
        .header('x-request-id', requestId)
        .send({
        type: `https://events-manager.local/problems/${error.code.toLowerCase()}`,
        title: error.code,
        status: error.statusCode,
        detail: error.statusCode >= 500 && !error.exposeDetail
            ? 'Ocorreu um erro interno. Tente novamente em alguns instantes.'
            : error.message,
        instance: request.url,
        requestId,
        ...(error.context ? { context: error.context } : {}),
    });
}
//# sourceMappingURL=errors.js.map