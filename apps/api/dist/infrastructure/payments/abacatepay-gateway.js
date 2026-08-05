import { createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../shared/errors.js';
const ABACATEPAY_WEBHOOK_PUBLIC_KEY = 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
export class AbacatePayGateway {
    apiKey;
    baseUrl;
    provider = 'abacatepay';
    constructor(apiKey, baseUrl = 'https://api.abacatepay.com/v2') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async request(path, init) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                ...init.headers,
            },
            signal: AbortSignal.timeout(15_000),
        });
        const body = (await response.json().catch(() => null));
        if (!response.ok || !body?.success || !body.data) {
            throw new ApiError(body?.error ?? 'Não foi possível processar a operação no AbacatePay.', 502, 'PAYMENT_PROVIDER_ERROR');
        }
        return body.data;
    }
    async createProduct(input) {
        const product = await this.request('/products/create', {
            method: 'POST',
            body: JSON.stringify({
                externalId: input.externalId,
                name: input.name,
                description: input.description,
                price: input.priceInCents,
                currency: 'BRL',
            }),
        });
        return { id: product.id, externalId: product.externalId };
    }
    async createCheckout(input) {
        const checkout = await this.request('/checkouts/create', {
            method: 'POST',
            body: JSON.stringify({
                externalId: input.externalId,
                items: input.items.map((item) => ({ id: item.productId, quantity: item.quantity })),
                methods: input.methods,
                returnUrl: input.returnUrl,
                completionUrl: input.completionUrl,
                metadata: input.metadata,
            }),
        });
        return { id: checkout.id, url: checkout.url, amountInCents: checkout.amount };
    }
    async createPixCharge(input) {
        const charge = await this.request('/transparents/create', {
            method: 'POST',
            body: JSON.stringify({
                externalId: input.externalId,
                data: {
                    amount: input.amountInCents,
                    description: input.description,
                    expiresIn: input.expiresInSeconds,
                    customer: input.customer,
                    metadata: input.metadata,
                },
            }),
        });
        return {
            id: charge.id,
            copyPasteCode: charge.brCode,
            qrCodeBase64: charge.brCodeBase64,
            expiresAt: charge.expiresAt,
        };
    }
    async sendPix(input) {
        const transfer = await this.request('/pix/send', {
            method: 'POST',
            body: JSON.stringify({
                amount: input.amountInCents,
                externalId: input.externalId,
                description: input.description,
                pix: { key: input.pixKey, type: input.pixKeyType },
            }),
        });
        return {
            id: transfer.id,
            status: transfer.status,
            receiptUrl: transfer.receiptUrl,
            providerFeeInCents: transfer.platformFee,
        };
    }
}
export function verifyAbacatePayWebhook(rawBody, signature) {
    const expected = Buffer.from(createHmac('sha256', ABACATEPAY_WEBHOOK_PUBLIC_KEY).update(rawBody).digest('base64'));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
}
//# sourceMappingURL=abacatepay-gateway.js.map