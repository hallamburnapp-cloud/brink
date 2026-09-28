import { generateKeyPair, importPublicKey } from '../src/crypto';
import type { Env, KVLike } from '../src/index';

export class MemoryKV implements KVLike {
  readonly store = new Map<string, { value: string; expiresAt?: number }>();
  constructor(private readonly now: () => number = () => Date.now()) {}
  async get(key: string): Promise<string | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expiresAt !== undefined && hit.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }
  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = options?.expirationTtl ? this.now() + options.expirationTtl * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }
}

export const ORIGIN = 'https://brink.example';
export const WEBHOOK_SECRET = 'whsec_test_secret';

export interface TestContext {
  env: Env;
  kv: MemoryKV;
  publicKey: CryptoKey;
  publicJwk: JsonWebKey;
}

export async function makeEnv(overrides: Partial<Env> = {}, now: () => number = () => Date.now()): Promise<TestContext> {
  const { privateJwk, publicJwk } = await generateKeyPair();
  const kv = new MemoryKV(now);
  const env: Env = {
    PURCHASES: kv,
    ALLOWED_ORIGIN: ORIGIN,
    STRIPE_PRICE_ID: '',
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SIGNING_PRIVATE_KEY_JWK: JSON.stringify(privateJwk),
    ...overrides,
  };
  return { env, kv, publicKey: await importPublicKey(publicJwk), publicJwk };
}

export function paidSession(id = 'cs_test_paid_0001', email = 'Buyer@Example.com', priceId = 'price_endless') {
  return {
    id,
    object: 'checkout.session',
    payment_status: 'paid',
    status: 'complete',
    mode: 'payment',
    created: 1_700_000_000,
    customer: null,
    customer_email: null,
    customer_details: { email },
    line_items: { data: [{ price: { id: priceId } }] },
  };
}

export function unpaidSession(id = 'cs_test_unpaid_0001', email = 'buyer@example.com') {
  return { ...paidSession(id, email), payment_status: 'unpaid', status: 'open' };
}

export function stripeJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function stripeNotFound(): Response {
  return stripeJson({ error: { code: 'resource_missing', message: 'No such checkout.session' } }, 404);
}

/** A fetch stub routed by URL substring; unmatched calls throw so tests fail loudly. */
export function fetchRouter(routes: Array<[match: string | RegExp, respond: (url: string, init?: RequestInit) => Response]>) {
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    for (const [match, respond] of routes) {
      if (typeof match === 'string' ? url.includes(match) : match.test(url)) return respond(url, init);
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { fetch: fn, calls };
}

export function req(path: string, init: RequestInit & { origin?: string } = {}): Request {
  const headers = new Headers(init.headers);
  if (init.origin !== undefined) headers.set('Origin', init.origin);
  else headers.set('Origin', ORIGIN);
  return new Request(`https://brink-unlock.workers.dev${path}`, { ...init, headers });
}
