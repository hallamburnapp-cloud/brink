import { describe, expect, it } from 'vitest';
import { sha256Hex, verifyToken } from '../src/crypto';
import { createHandler, RESTORE_LIMIT_PER_DAY } from '../src/index';
import { fetchRouter, makeEnv, ORIGIN, paidSession, req, stripeJson, stripeNotFound, unpaidSession } from './helpers';

const NOW = 1_760_000_000_000;

describe('GET /health and CORS', () => {
  it('answers /health with CORS headers for the allowed origin', async () => {
    const { env } = await makeEnv();
    const res = await createHandler()(req('/health'), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(res.headers.get('Vary')).toBe('Origin');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('never echoes a foreign origin', async () => {
    const { env } = await makeEnv();
    const res = await createHandler()(req('/health', { origin: 'https://evil.example' }), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('echoes a listed origin when several are configured', async () => {
    const { env } = await makeEnv({ ALLOWED_ORIGIN: `${ORIGIN}, http://localhost:5173` });
    const res = await createHandler()(req('/health', { origin: 'http://localhost:5173' }), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    const other = await createHandler()(req('/health', { origin: 'https://evil.example' }), env);
    expect(other.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('handles OPTIONS preflight', async () => {
    const { env } = await makeEnv();
    const res = await createHandler()(req('/restore', { method: 'OPTIONS' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });

  it('404s unknown paths and 405s wrong methods', async () => {
    const { env } = await makeEnv();
    expect((await createHandler()(req('/nope'), env)).status).toBe(404);
    expect((await createHandler()(req('/unlocked', { method: 'POST' }), env)).status).toBe(405);
    expect((await createHandler()(req('/restore', { method: 'GET' }), env)).status).toBe(405);
  });
});

describe('GET /unlocked', () => {
  it('issues a verifiable token for a paid session and records the purchase', async () => {
    const { env, kv, publicKey } = await makeEnv();
    const { fetch, calls } = fetchRouter([
      ['/checkout/sessions/cs_test_paid_0001', () => stripeJson(paidSession('cs_test_paid_0001', 'Buyer@Example.com'))],
    ]);
    const handle = createHandler({ fetch, now: () => NOW });

    const res = await handle(req('/unlocked?session_id=cs_test_paid_0001'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(calls[0]).toContain('https://api.stripe.com/v1/checkout/sessions/cs_test_paid_0001');

    const body = (await res.json()) as { token: string; plan: string };
    expect(body.plan).toBe('endless');
    const payload = await verifyToken(body.token, publicKey);
    const expectedSub = await sha256Hex('buyer@example.com');
    expect(payload).toEqual({ sub: expectedSub, plan: 'endless', iat: NOW / 1000, v: 1 });

    const record = JSON.parse((await kv.get(`sub:${expectedSub}`))!);
    expect(record).toEqual({ sessionId: 'cs_test_paid_0001', issuedAt: new Date(NOW).toISOString() });
  });

  it('sends the secret key as a bearer token', async () => {
    const { env } = await makeEnv({ STRIPE_SECRET_KEY: 'sk_test_bearer' });
    let auth: string | null = null;
    const { fetch } = fetchRouter([
      [
        '/checkout/sessions/',
        (_url, init) => {
          auth = new Headers(init?.headers).get('Authorization');
          return stripeJson(paidSession());
        },
      ],
    ]);
    await createHandler({ fetch })(req('/unlocked?session_id=cs_test_paid_0001'), env);
    expect(auth).toBe('Bearer sk_test_bearer');
  });

  it('returns 402 for an unpaid session and stores nothing', async () => {
    const { env, kv } = await makeEnv();
    const { fetch } = fetchRouter([['/checkout/sessions/', () => stripeJson(unpaidSession('cs_test_unpaid_0001'))]]);
    const res = await createHandler({ fetch })(req('/unlocked?session_id=cs_test_unpaid_0001'), env);
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: 'not_paid' });
    expect(kv.store.size).toBe(0);
  });

  it('returns 404 for an unknown session', async () => {
    const { env } = await makeEnv();
    const { fetch } = fetchRouter([['/checkout/sessions/', () => stripeNotFound()]]);
    const res = await createHandler({ fetch })(req('/unlocked?session_id=cs_test_missing_0001'), env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });

  it('returns 400 for a malformed or missing session id without calling Stripe', async () => {
    const { env } = await makeEnv();
    const { fetch, calls } = fetchRouter([]);
    const handle = createHandler({ fetch });
    expect((await handle(req('/unlocked'), env)).status).toBe(400);
    expect((await handle(req('/unlocked?session_id=pi_123456789'), env)).status).toBe(400);
    expect((await handle(req('/unlocked?session_id=cs_test_%2F..%2Fx'), env)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('rejects a paid session for a different product when STRIPE_PRICE_ID is set', async () => {
    const { env } = await makeEnv({ STRIPE_PRICE_ID: 'price_endless' });
    const { fetch } = fetchRouter([
      ['cs_test_other_0001', () => stripeJson(paidSession('cs_test_other_0001', 'a@b.co', 'price_something_else'))],
      ['cs_test_right_0001', () => stripeJson(paidSession('cs_test_right_0001', 'a@b.co', 'price_endless'))],
    ]);
    const handle = createHandler({ fetch });
    expect((await handle(req('/unlocked?session_id=cs_test_other_0001'), env)).status).toBe(402);
    expect((await handle(req('/unlocked?session_id=cs_test_right_0001'), env)).status).toBe(200);
  });

  it('maps Stripe errors to 502 without leaking details', async () => {
    const { env } = await makeEnv();
    const { fetch } = fetchRouter([['/checkout/sessions/', () => stripeJson({ error: { message: 'Invalid API Key' } }, 401)]]);
    const res = await createHandler({ fetch })(req('/unlocked?session_id=cs_test_paid_0001'), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'upstream' });
  });
});

describe('POST /restore', () => {
  const restore = (email: unknown) =>
    req('/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });

  it('re-issues a token from the KV record without calling Stripe', async () => {
    const { env, kv, publicKey } = await makeEnv();
    const sub = await sha256Hex('buyer@example.com');
    await kv.put(`sub:${sub}`, JSON.stringify({ sessionId: 'cs_test_paid_0001', issuedAt: '2026-01-01T00:00:00.000Z' }));
    const { fetch, calls } = fetchRouter([]);

    const res = await createHandler({ fetch, now: () => NOW })(restore('  BUYER@example.com '), env);
    expect(res.status).toBe(200);
    const { token } = (await res.json()) as { token: string };
    expect((await verifyToken(token, publicKey))?.sub).toBe(sub);
    expect(calls).toHaveLength(0);
  });

  it('falls back to Stripe by email, stores the record, then issues a token', async () => {
    const { env, kv, publicKey } = await makeEnv();
    const { fetch, calls } = fetchRouter([
      [
        'customer_details[email]=buyer%40example.com',
        () => stripeJson({ object: 'list', data: [unpaidSession('cs_test_old'), paidSession('cs_test_found_0001', 'buyer@example.com')] }),
      ],
    ]);
    const res = await createHandler({ fetch, now: () => NOW })(restore('buyer@example.com'), env);
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    const sub = await sha256Hex('buyer@example.com');
    expect((await verifyToken(((await res.json()) as { token: string }).token, publicKey))?.sub).toBe(sub);
    expect(JSON.parse((await kv.get(`sub:${sub}`))!).sessionId).toBe('cs_test_found_0001');
  });

  it('uses the customers lookup when the customer_details filter is rejected', async () => {
    const { env } = await makeEnv();
    const { fetch, calls } = fetchRouter([
      ['customer_details[email]', () => stripeJson({ error: { code: 'parameter_unknown', message: 'Received unknown parameter' } }, 400)],
      ['/customers?email=', () => stripeJson({ object: 'list', data: [{ id: 'cus_1' }] })],
      ['/checkout/sessions?customer=cus_1', () => stripeJson({ object: 'list', data: [paidSession('cs_test_cust_0001', 'buyer@example.com')] })],
    ]);
    const res = await createHandler({ fetch })(restore('buyer@example.com'), env);
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(3);
  });

  it('returns 404 not_found when neither KV nor Stripe knows the email', async () => {
    const { env } = await makeEnv();
    const { fetch } = fetchRouter([['customer_details[email]', () => stripeJson({ object: 'list', data: [] })]]);
    const res = await createHandler({ fetch })(restore('nobody@example.com'), env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('ignores sessions for a different email or an unpaid state', async () => {
    const { env } = await makeEnv();
    const { fetch } = fetchRouter([
      [
        'customer_details[email]',
        () => stripeJson({ object: 'list', data: [paidSession('cs_test_x', 'someone-else@example.com'), unpaidSession('cs_test_y', 'buyer@example.com')] }),
      ],
    ]);
    expect((await createHandler({ fetch })(restore('buyer@example.com'), env)).status).toBe(404);
  });

  it('validates the body', async () => {
    const { env } = await makeEnv();
    const handle = createHandler({ fetch: fetchRouter([]).fetch });
    expect((await handle(restore('not-an-email'), env)).status).toBe(400);
    expect((await handle(restore(42), env)).status).toBe(400);
    expect((await handle(req('/restore', { method: 'POST', body: 'nope' }), env)).status).toBe(400);
  });

  it('rate-limits to 10 attempts per hashed email per day', async () => {
    let now = NOW;
    const { env } = await makeEnv({}, () => now);
    const { fetch } = fetchRouter([['customer_details[email]', () => stripeJson({ object: 'list', data: [] })]]);
    const handle = createHandler({ fetch, now: () => now });
    for (let i = 0; i < RESTORE_LIMIT_PER_DAY; i++) {
      expect((await handle(restore('nobody@example.com'), env)).status).toBe(404);
    }
    const limited = await handle(restore('nobody@example.com'), env);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'rate_limited' });
    // A different email is unaffected; the next day the counter has expired.
    expect((await handle(restore('other@example.com'), env)).status).toBe(404);
    now += 86_400_000 + 1;
    expect((await handle(restore('nobody@example.com'), env)).status).toBe(404);
  });
});
