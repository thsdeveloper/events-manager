import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateCheckoutInput,
  CreatePixInput,
  CreateProductInput,
  PaymentCheckout,
  PaymentGateway,
  PaymentProduct,
  PixCharge,
  PixTransfer,
} from '../../application/payments/payment-gateway.js';
import { ApiError } from '../../shared/errors.js';

const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

interface AbacatePayEnvelope<T> {
  data: T | null;
  success: boolean;
  error: string | null;
}

export class AbacatePayGateway implements PaymentGateway {
  readonly provider = 'abacatepay' as const;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.abacatepay.com/v2',
  ) {}

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await response.json().catch(() => null)) as AbacatePayEnvelope<T> | null;
    if (!response.ok || !body?.success || !body.data) {
      throw new ApiError(body?.error ?? 'Não foi possível processar a operação no AbacatePay.', 502, 'PAYMENT_PROVIDER_ERROR');
    }
    return body.data;
  }

  async createProduct(input: CreateProductInput): Promise<PaymentProduct> {
    const product = await this.request<{ id: string; externalId: string }>('/products/create', {
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

  async createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout> {
    const checkout = await this.request<{ id: string; url: string; amount: number }>('/checkouts/create', {
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

  async createPixCharge(input: {
    externalId: string;
    amountInCents: number;
    description: string;
    expiresInSeconds: number;
    customer: { name: string; email: string; taxId?: string; cellphone?: string };
    metadata: Record<string, string>;
  }): Promise<PixCharge> {
    const charge = await this.request<{
      id: string;
      brCode: string;
      brCodeBase64: string | null;
      expiresAt: string | null;
    }>('/transparents/create', {
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

  async sendPix(input: CreatePixInput): Promise<PixTransfer> {
    const transfer = await this.request<{
      id: string;
      status: string;
      receiptUrl: string | null;
      platformFee: number;
    }>('/pix/send', {
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

export function verifyAbacatePayWebhook(rawBody: Buffer, signature: string) {
  const expected = Buffer.from(
    createHmac('sha256', ABACATEPAY_WEBHOOK_PUBLIC_KEY).update(rawBody).digest('base64'),
  );
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
