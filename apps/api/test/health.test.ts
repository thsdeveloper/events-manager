import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    auth: { getUser: vi.fn() },
  }),
}));

import { buildApp } from '../src/app.js';
import type { ApiEnv } from '../src/config/env.js';

const env: ApiEnv = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 3333,
  WEB_URL: 'http://localhost:3003',
  SUPABASE_URL: 'http://127.0.0.1:55321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  COOKIE_SECRET: 'test-cookie-secret-value',
  PAYMENTS_MODE: 'mock',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: 55325,
  SMTP_SECURE: false,
  EMAIL_FROM: 'Events Manager <test@events.local>',
};

describe('GET /health', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns API and database health', async () => {
    const app = await buildApp(env);
    const response = await app.inject({ method: 'GET', url: '/health' });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'connected' });
  });
});

describe('API boundaries', () => {
  it('preserves native Fastify client errors instead of returning 500', async () => {
    const app = await buildApp(env);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/login',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ status: 400, title: 'BAD_REQUEST' });
  });

  it('rejects protected routes without a session', async () => {
    const app = await buildApp(env);
    const response = await app.inject({ method: 'GET', url: '/api/events' });
    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ status: 401, title: 'UNAUTHORIZED' });
  });

  it('returns validation details for malformed credentials', async () => {
    const app = await buildApp(env);
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'invalid', password: 'short' },
    });
    await app.close();

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ status: 422, title: 'VALIDATION_ERROR' });
  });
});
