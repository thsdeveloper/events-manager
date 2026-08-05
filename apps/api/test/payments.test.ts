import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  calculateOrganizerNet,
  calculatePlatformFee,
  calculateProviderFee,
} from '../src/application/payments/fees.js';
import { verifyAbacatePayWebhook } from '../src/infrastructure/payments/abacatepay-gateway.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';

const configuration = {
  platform_fee_percentage: 5,
  pix_fee_fixed: 0.8,
  card_fee_percentage: 3.5,
  card_fee_fixed: 0.6,
  card_installment_2_6_percentage: 4,
  card_installment_7_12_percentage: 4.5,
  boleto_fee_fixed: 2.5,
};

const webhookPublicKey =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

describe('payment fees', () => {
  it('uses the configured AbacatePay rates for each payment method', () => {
    expect(calculatePlatformFee(100, configuration)).toBe(5);
    expect(calculateProviderFee(100, 'pix', configuration)).toBe(0.8);
    expect(calculateProviderFee(100, 'card', configuration)).toBe(4.1);
    expect(calculateProviderFee(100, 'card', configuration, 6)).toBe(4.6);
    expect(calculateProviderFee(100, 'card', configuration, 12)).toBe(5.1);
    expect(calculateProviderFee(100, 'boleto', configuration)).toBe(2.5);
  });

  it('does not subtract a platform fee twice when the buyer paid it', () => {
    expect(calculateOrganizerNet(100, 105, 5, 0.8)).toBe(99.2);
    expect(calculateOrganizerNet(100, 100, 5, 0.8)).toBe(94.2);
  });
});

describe('AbacatePay webhook security', () => {
  it('validates the documented HMAC-SHA256 signature using the raw body', () => {
    const body = Buffer.from(JSON.stringify({ id: 'log_test', event: 'checkout.completed' }));
    const signature = createHmac('sha256', webhookPublicKey).update(body).digest('base64');
    expect(verifyAbacatePayWebhook(body, signature)).toBe(true);
    expect(verifyAbacatePayWebhook(body, Buffer.from('invalid').toString('base64'))).toBe(false);
  });
});

describe('mock payment gateway', () => {
  it('keeps the same application contract without external network calls', async () => {
    const gateway = new MockPaymentGateway();
    const checkout = await gateway.createCheckout({
      externalId: 'order-1',
      items: [{ productId: 'product-1', quantity: 1 }],
      methods: ['PIX'],
      returnUrl: 'http://localhost/cancel',
      completionUrl: 'http://localhost/success',
      metadata: {},
    });
    expect(checkout.id).toBe('mock_checkout_order-1');
    expect(checkout.url).toBe('http://localhost/success');
  });
});

