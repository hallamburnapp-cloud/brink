import { describe, expect, it } from 'vitest';
import { createHandler } from '../src/index';
import { parseSignatureHeader, signWebhookPayload, verifyWebhookSignature } from '../src/stripe';
import { makeEnv, paidSession, req, unpaidSession, WEBHOOK_SECRET } from './helpers';

const NOW = 1_760_000_000_000; // ms
const nowSec = Math.floor(NOW / 1000);

describe('verifyWebhookSignature', () => {
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });

  it('accepts a fresh, correctly signed payload', async () => {
    const header = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec - 30);
    expect(parseSignatureHeader(header)).toEqual({ t: nowSec - 30, v1: [expect.stringMatching(/^[0-9a-f]{64}$/)] });
    expect(await verifyWebhookSignature(payload, header, WEBHOOK_SECRET, nowSec)).toBe(true);
  });

  it('accepts when any v1 entry matches (secret rotation)', async () => {
    const good = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec);
    const header = `${good},v1=${'0'.repeat(64)}`;
    expect(await verifyWebhookSignature(payload, header, WEBHOOK_SECRET, nowSec)).toBe(true);
  });

  it('rejects an expired timestamp (beyond 5 minutes either way)', async () => {
    const old = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec - 301);
    expect(await verifyWebhookSignature(payload, old, WEBHOOK_SECRET, nowSec)).toBe(false);
    const future = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec + 301);
    expect(await verifyWebhookSignature(payload, future, WEBHOOK_SECRET, nowSec)).toBe(false);
    const edge = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec - 300);
    expect(await verifyWebhookSignature(payload, edge, WEBHOOK_SECRET, nowSec)).toBe(true);
  });

  it('rejects the wrong secret, a modified payload and garbage headers', async () => {
    const header = await signWebhookPayload(payload, 'whsec_other', nowSec);
    expect(await verifyWebhookSignature(payload, header, WEBHOOK_SECRET, nowSec)).toBe(false);
    const ok = await signWebhookPayload(payload, WEBHOOK_SECRET, nowSec);
    expect(await verifyWebhookSignature(payload + ' ', ok, WEBHOOK_SECRET, nowSec)).toBe(false);
    expect(await verifyWebhookSignature(payload, null, WEBHOOK_SECRET, nowSec)).toBe(false);
    expect(await verifyWebhookSignature(payload, 'v1=abc', WEBHOOK_SECRET, nowSec)).toBe(false);
    expect(await verifyWebhookSignature(payload, `t=${nowSec}`, WEBHOOK_SECRET, nowSec)).toBe(false);
    expect(await verifyWebhookSignature(payload, ok, '', nowSec)).toBe(false);
  });
});

describe('POST /webhook', () => {
  const handle = createHandler({ now: () => NOW });

  async function post(body: string, header: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (header) headers['Stripe-Signature'] = header;
    return req('/webhook', { method: 'POST', body, headers });
  }

  it('pre-stores the purchase record for a paid checkout.session.completed', async () => {
    const { env, kv } = await makeEnv();
    const session = paidSession('cs_test_webhook_001', 'Buyer@Example.com');
    const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: session } });
    const res = await handle(await post(body, await signWebhookPayload(body, WEBHOOK_SECRET, nowSec)), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    const subKeys = [...kv.store.keys()].filter((k) => k.startsWith('sub:'));
    expect(subKeys).toHaveLength(1);
    const record = JSON.parse((await kv.get(subKeys[0]))!);
    expect(record).toEqual({ sessionId: 'cs_test_webhook_001', issuedAt: new Date(NOW).toISOString() });
  });

  it('ignores unpaid sessions and unrelated event types', async () => {
    const { env, kv } = await makeEnv();
    for (const event of [
      { id: 'evt_2', type: 'checkout.session.completed', data: { object: unpaidSession() } },
      { id: 'evt_3', type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', object: 'payment_intent' } } },
    ]) {
      const body = JSON.stringify(event);
      const res = await handle(await post(body, await signWebhookPayload(body, WEBHOOK_SECRET, nowSec)), env);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true, ignored: true });
    }
    expect(kv.store.size).toBe(0);
  });

  it('rejects bad or missing signatures with 400 and stores nothing', async () => {
    const { env, kv } = await makeEnv();
    const body = JSON.stringify({ id: 'evt_4', type: 'checkout.session.completed', data: { object: paidSession() } });
    expect((await handle(await post(body, await signWebhookPayload(body, 'whsec_wrong', nowSec)), env)).status).toBe(400);
    expect((await handle(await post(body, await signWebhookPayload(body, WEBHOOK_SECRET, nowSec - 3600)), env)).status).toBe(400);
    expect((await handle(await post(body, null), env)).status).toBe(400);
    expect(kv.store.size).toBe(0);
  });

  it('returns 500 when the webhook secret is not configured', async () => {
    const { env } = await makeEnv({ STRIPE_WEBHOOK_SECRET: '' });
    const res = await handle(await post('{}', 't=1,v1=' + '0'.repeat(64)), env);
    expect(res.status).toBe(500);
  });
});
