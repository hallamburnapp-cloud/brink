/**
 * Minimal Stripe REST wrappers. `fetch` is injectable so the routes can be
 * tested without network access. Only the fields the worker reads are typed.
 */
import { hmacSha256Hex, timingSafeEqual } from './crypto';

const API = 'https://api.stripe.com/v1';

export interface CheckoutSession {
  id: string;
  object?: 'checkout.session';
  payment_status: 'paid' | 'unpaid' | 'no_payment_required' | string;
  status?: 'open' | 'complete' | 'expired' | string | null;
  mode?: string;
  created?: number;
  customer?: string | { id: string } | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  line_items?: { data?: Array<{ price?: { id?: string } | null }> } | null;
}

interface StripeList<T> {
  object: 'list';
  data: T[];
  has_more?: boolean;
}

export class StripeError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

export interface StripeClient {
  /** Null when Stripe returns 404 (unknown session id). */
  getCheckoutSession(id: string): Promise<CheckoutSession | null>;
  /** Paid Checkout Sessions for an email, newest first. Empty when none. */
  findPaidSessionsByEmail(email: string): Promise<CheckoutSession[]>;
}

/** The email Stripe collected at checkout, normalised for hashing. */
export function sessionEmail(s: CheckoutSession): string | null {
  const raw = s.customer_details?.email ?? s.customer_email ?? null;
  return raw ? normaliseEmail(raw) : null;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPaid(s: CheckoutSession): boolean {
  return s.payment_status === 'paid';
}

/**
 * When STRIPE_PRICE_ID is configured and the session carries expanded line
 * items, require one of them to be that price. Sessions without line items
 * (webhook payloads) pass, which keeps the check advisory rather than a wall.
 */
export function matchesPrice(s: CheckoutSession, priceId: string | undefined): boolean {
  if (!priceId || /REPLACE/i.test(priceId)) return true;
  const items = s.line_items?.data;
  if (!items || items.length === 0) return true;
  return items.some((li) => li.price?.id === priceId);
}

export function createStripeClient(secretKey: string, fetchImpl: typeof fetch = globalThis.fetch): StripeClient {
  async function call<T>(path: string): Promise<{ status: number; body: T }> {
    const res = await fetchImpl(`${API}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: 'application/json',
        'User-Agent': 'brink-unlock-worker/0.1',
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!res.ok) {
      const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
      throw new StripeError(res.status, err?.code, err?.message ?? `Stripe ${res.status}`);
    }
    return { status: res.status, body: body as T };
  }

  async function getCheckoutSession(id: string): Promise<CheckoutSession | null> {
    try {
      const { body } = await call<CheckoutSession>(`/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`);
      return body;
    } catch (e) {
      if (e instanceof StripeError && e.status === 404) return null;
      throw e;
    }
  }

  async function listByCustomerDetailsEmail(email: string): Promise<CheckoutSession[] | null> {
    try {
      const { body } = await call<StripeList<CheckoutSession>>(
        `/checkout/sessions?customer_details[email]=${encodeURIComponent(email)}&limit=5&expand[]=data.line_items`,
      );
      return body.data ?? [];
    } catch (e) {
      // Unsupported filter on this API version: fall back to the customer search.
      if (e instanceof StripeError && e.status === 400) return null;
      throw e;
    }
  }

  async function listViaCustomers(email: string): Promise<CheckoutSession[]> {
    const { body: customers } = await call<StripeList<{ id: string }>>(
      `/customers?email=${encodeURIComponent(email)}&limit=5`,
    );
    const out: CheckoutSession[] = [];
    for (const c of customers.data ?? []) {
      const { body } = await call<StripeList<CheckoutSession>>(
        `/checkout/sessions?customer=${encodeURIComponent(c.id)}&limit=5&expand[]=data.line_items`,
      );
      out.push(...(body.data ?? []));
    }
    return out;
  }

  async function findPaidSessionsByEmail(email: string): Promise<CheckoutSession[]> {
    const wanted = normaliseEmail(email);
    const direct = await listByCustomerDetailsEmail(wanted);
    const sessions = direct ?? (await listViaCustomers(wanted));
    return sessions
      .filter((s) => isPaid(s) && sessionEmail(s) === wanted)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  }

  return { getCheckoutSession, findPaidSessionsByEmail };
}

// ---------------------------------------------------------------------------
// Webhook signatures: https://docs.stripe.com/webhooks#verify-manually

export const WEBHOOK_TOLERANCE_SEC = 300;

export function parseSignatureHeader(header: string): { t: number; v1: string[] } | null {
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 't') t = Number(v);
    else if (k === 'v1' && /^[0-9a-f]{64}$/.test(v)) v1.push(v);
  }
  if (t === null || !Number.isFinite(t) || v1.length === 0) return null;
  return { t, v1 };
}

/** Value for the `Stripe-Signature` header (used by tests and the smoke script). */
export async function signWebhookPayload(payload: string, secret: string, tSec: number): Promise<string> {
  const v1 = await hmacSha256Hex(secret, `${tSec}.${payload}`);
  return `t=${tSec},v1=${v1}`;
}

export async function verifyWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSec: number,
  toleranceSec: number = WEBHOOK_TOLERANCE_SEC,
): Promise<boolean> {
  if (!header || !secret) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSec - parsed.t) > toleranceSec) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.t}.${payload}`);
  return parsed.v1.some((sig) => timingSafeEqual(sig, expected));
}
