/**
 * BRINK unlock worker.
 *
 *   GET  /health                       liveness
 *   GET  /unlocked?session_id=cs_...   paid Stripe Checkout session -> signed token
 *   POST /restore   {email}            re-issue a token for a previous purchaser
 *   POST /webhook                      Stripe checkout.session.completed -> pre-store record
 *
 * Token: `brink1.<base64url(payload JSON)>.<base64url(ECDSA P-256 / SHA-256 signature)>`
 * with payload {sub: sha256hex(lowercased email), plan: 'endless', iat, v: 1}.
 */
import { importPrivateKey, parsePrivateJwk, sha256Hex, signToken, type TokenPayload } from './crypto';
import {
  createStripeClient,
  isPaid,
  matchesPrice,
  normaliseEmail,
  sessionEmail,
  StripeError,
  verifyWebhookSignature,
  type CheckoutSession,
  type StripeClient,
} from './stripe';

/** The subset of KVNamespace the worker uses; lets tests pass an in-memory stub. */
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  PURCHASES: KVLike;
  ALLOWED_ORIGIN: string;
  STRIPE_PRICE_ID?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SIGNING_PRIVATE_KEY_JWK: string;
}

export interface Deps {
  fetch: typeof fetch;
  /** Current time in ms. */
  now: () => number;
}

export interface PurchaseRecord {
  sessionId: string;
  /** ISO 8601 timestamp of the first token issuance (or webhook receipt). */
  issuedAt: string;
}

export const RESTORE_LIMIT_PER_DAY = 10;
const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{8,200}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;

const subKey = (sub: string) => `sub:${sub}`;
const rateKey = (sub: string, day: string) => `rl:restore:${sub}:${day}`;

// ---------------------------------------------------------------------------
// CORS

function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origins = allowedOrigins(env);
  const requestOrigin = request.headers.get('Origin');
  const allow = requestOrigin && origins.includes(requestOrigin) ? requestOrigin : origins[0] ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

// ---------------------------------------------------------------------------
// Token issuance

let cachedKey: { jwk: string; key: Promise<CryptoKey> } | null = null;

function signingKey(env: Env): Promise<CryptoKey> {
  if (!env.SIGNING_PRIVATE_KEY_JWK) throw new Error('SIGNING_PRIVATE_KEY_JWK is not set');
  if (!cachedKey || cachedKey.jwk !== env.SIGNING_PRIVATE_KEY_JWK) {
    const key = importPrivateKey(parsePrivateJwk(env.SIGNING_PRIVATE_KEY_JWK));
    cachedKey = { jwk: env.SIGNING_PRIVATE_KEY_JWK, key };
  }
  return cachedKey.key;
}

export function subjectFor(email: string): Promise<string> {
  return sha256Hex(normaliseEmail(email));
}

async function issueToken(env: Env, sub: string, nowMs: number): Promise<string> {
  const payload: TokenPayload = { sub, plan: 'endless', iat: Math.floor(nowMs / 1000), v: 1 };
  return signToken(payload, await signingKey(env));
}

/** Store the purchase record unless one exists already (the first purchase wins). */
async function recordPurchase(env: Env, sub: string, sessionId: string, nowMs: number): Promise<PurchaseRecord> {
  const existing = await env.PURCHASES.get(subKey(sub));
  if (existing) {
    try {
      return JSON.parse(existing) as PurchaseRecord;
    } catch {
      /* overwrite a corrupt record */
    }
  }
  const record: PurchaseRecord = { sessionId, issuedAt: new Date(nowMs).toISOString() };
  await env.PURCHASES.put(subKey(sub), JSON.stringify(record));
  return record;
}

// ---------------------------------------------------------------------------
// Routes

async function handleUnlocked(url: URL, env: Env, stripe: StripeClient, deps: Deps, cors: Record<string, string>) {
  const sessionId = url.searchParams.get('session_id') ?? '';
  if (!SESSION_ID_RE.test(sessionId)) return json({ error: 'bad_request' }, 400, cors);

  const session = await stripe.getCheckoutSession(sessionId);
  if (!session) return json({ error: 'not_found' }, 404, cors);
  if (!isPaid(session)) return json({ error: 'not_paid' }, 402, cors);
  if (!matchesPrice(session, env.STRIPE_PRICE_ID)) return json({ error: 'wrong_product' }, 402, cors);

  const email = sessionEmail(session);
  if (!email) return json({ error: 'no_email' }, 422, cors);

  const sub = await subjectFor(email);
  const now = deps.now();
  await recordPurchase(env, sub, session.id, now);
  const token = await issueToken(env, sub, now);
  return json({ token, plan: 'endless' }, 200, cors);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function bumpRestoreCounter(env: Env, sub: string, nowMs: number): Promise<boolean> {
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const key = rateKey(sub, day);
  const count = Number((await env.PURCHASES.get(key)) ?? '0') || 0;
  if (count >= RESTORE_LIMIT_PER_DAY) return false;
  await env.PURCHASES.put(key, String(count + 1), { expirationTtl: 86_400 });
  return true;
}

async function handleRestore(request: Request, env: Env, stripe: StripeClient, deps: Deps, cors: Record<string, string>) {
  const body = await readJson(request);
  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) return json({ error: 'bad_request' }, 400, cors);

  const email = normaliseEmail(rawEmail);
  const sub = await subjectFor(email);
  const now = deps.now();

  if (!(await bumpRestoreCounter(env, sub, now))) return json({ error: 'rate_limited' }, 429, cors);

  let known = (await env.PURCHASES.get(subKey(sub))) !== null;
  if (!known) {
    const paid = (await stripe.findPaidSessionsByEmail(email)).filter((s) => matchesPrice(s, env.STRIPE_PRICE_ID));
    if (paid.length > 0) {
      await recordPurchase(env, sub, paid[0].id, now);
      known = true;
    }
  }
  if (!known) return json({ error: 'not_found' }, 404, cors);

  const token = await issueToken(env, sub, now);
  return json({ token, plan: 'endless' }, 200, cors);
}

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: CheckoutSession };
}

async function handleWebhook(request: Request, env: Env, deps: Deps) {
  const none: Record<string, string> = {};
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'webhook_not_configured' }, 500, none);

  const payload = await request.text();
  const ok = await verifyWebhookSignature(
    payload,
    request.headers.get('Stripe-Signature'),
    env.STRIPE_WEBHOOK_SECRET,
    Math.floor(deps.now() / 1000),
  );
  if (!ok) return json({ error: 'bad_signature' }, 400, none);

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return json({ error: 'bad_request' }, 400, none);
  }

  const relevant = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
  const session = event.data?.object;
  if (!relevant || !session || session.object !== 'checkout.session') return json({ received: true, ignored: true }, 200, none);

  const email = sessionEmail(session);
  if (!isPaid(session) || !email || !matchesPrice(session, env.STRIPE_PRICE_ID)) {
    return json({ received: true, ignored: true }, 200, none);
  }
  const sub = await subjectFor(email);
  await recordPurchase(env, sub, session.id, deps.now());
  return json({ received: true }, 200, none);
}

// ---------------------------------------------------------------------------
// Router

export function createHandler(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    fetch: overrides.fetch ?? ((input, init) => globalThis.fetch(input, init)),
    now: overrides.now ?? (() => Date.now()),
  };

  return async function handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (path === '/health') {
        if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);
        return json({ ok: true }, 200, cors);
      }
      if (path === '/unlocked') {
        if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);
        const stripe = createStripeClient(env.STRIPE_SECRET_KEY, deps.fetch);
        return await handleUnlocked(url, env, stripe, deps, cors);
      }
      if (path === '/restore') {
        if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
        const stripe = createStripeClient(env.STRIPE_SECRET_KEY, deps.fetch);
        return await handleRestore(request, env, stripe, deps, cors);
      }
      if (path === '/webhook') {
        if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, {});
        return await handleWebhook(request, env, deps);
      }
      return json({ error: 'not_found' }, 404, cors);
    } catch (e) {
      if (e instanceof StripeError) {
        // Stripe rejected the key or is unavailable; never leak the message to the client.
        console.error('stripe error', e.status, e.code, e.message);
        return json({ error: 'upstream' }, 502, cors);
      }
      console.error('unhandled', e instanceof Error ? e.message : e);
      return json({ error: 'internal' }, 500, cors);
    }
  };
}

const handler = createHandler();

export default {
  fetch: (request: Request, env: Env) => handler(request, env),
} satisfies ExportedHandler<Env>;
