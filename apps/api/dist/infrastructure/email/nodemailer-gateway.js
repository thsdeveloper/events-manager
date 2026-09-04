import nodemailer from 'nodemailer';
export class NodemailerGateway {
    transport;
    constructor(config) {
        this.transport = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            ...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
            connectionTimeout: 10_000,
        });
    }
    async send(input) {
        const result = await this.transport.sendMail(input);
        return { messageId: result.messageId };
    }
}
//# sourceMappingURL=nodemailer-gateway.js.map