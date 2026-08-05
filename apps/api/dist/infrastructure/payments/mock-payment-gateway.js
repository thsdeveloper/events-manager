export class MockPaymentGateway {
    provider = 'mock';
    async createProduct(input) {
        return { id: `mock_product_${input.externalId}`, externalId: input.externalId };
    }
    async createCheckout(input) {
        return { id: `mock_checkout_${input.externalId}`, url: input.completionUrl, amountInCents: 0 };
    }
    async createPixCharge(input) {
        return {
            id: `mock_pix_${input.externalId}`,
            copyPasteCode: `00020126EVENTSMANAGER${input.externalId}`,
            qrCodeBase64: null,
            expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
        };
    }
    async sendPix(input) {
        return {
            id: `mock_transfer_${input.externalId}`,
            status: 'COMPLETE',
            receiptUrl: null,
            providerFeeInCents: 0,
        };
    }
}
//# sourceMappingURL=mock-payment-gateway.js.map