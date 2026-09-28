/**
 * Endless unlock: token verification, storage and the /unlocked landing.
 *
 * Token format (issued by worker/): `brink1.<base64url(payload JSON)>.<base64url(signature)>`
 * payload = {sub: sha256hex(lowercased email), plan: 'endless', iat: unix seconds, v: 1}
 * signature = ECDSA P-256 / SHA-256 over the UTF-8 bytes of the payload segment.
 *
 * The public key arrives as VITE_UNLOCK_PUBLIC_KEY, a base64url-encoded JWK JSON
 * string ({kty:'EC', crv:'P-256', x, y}); verification is offline via WebCrypto.
 */
import { FEATURES } from '../config';

export interface UnlockPayload {
  sub: string;
  plan: 'endless';
  iat: number;
  v: 1;
}

export interface ParsedUnlockToken {
  payload: UnlockPayload;
  payloadB64: string;
  sigB64: string;
}

export type UnlockStatus = 'unlocked' | 'already' | 'invalid' | 'error' | 'none';
export type RestoreStatus = 'unlocked' | 'not_found' | 'error';

export const TOKEN_STORAGE_KEY = 'brink.unlock.token';
const TOKEN_PREFIX = 'brink1';
const ECDSA_KEY = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

// ---------------------------------------------------------------------------
// Encoding

function base64urlDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const utf8 = (s: string) => new TextEncoder().encode(s);
const fromUtf8 = (b: Uint8Array) => new TextDecoder().decode(b);

// ---------------------------------------------------------------------------
// Token parsing and verification

function isPayload(p: unknown): p is UnlockPayload {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.sub === 'string' &&
    /^[0-9a-f]{64}$/.test(o.sub) &&
    o.plan === 'endless' &&
    typeof o.iat === 'number' &&
    Number.isFinite(o.iat) &&
    o.v === 1
  );
}

export function parseToken(token: string): ParsedUnlockToken | null {
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !parts[1] || !parts[2]) return null;
  try {
    const payload: unknown = JSON.parse(fromUtf8(base64urlDecode(parts[1])));
    return isPayload(payload) ? { payload, payloadB64: parts[1], sigB64: parts[2] } : null;
  } catch {
    return null;
  }
}

const keyCache = new Map<string, Promise<CryptoKey | null>>();

/** Accepts base64url(JWK JSON) (the documented form) or a raw JWK JSON string. */
function decodePublicJwk(publicKeyB64Jwk: string): JsonWebKey | null {
  const s = publicKeyB64Jwk.trim();
  if (!s) return null;
  try {
    const jwk = JSON.parse(s.startsWith('{') ? s : fromUtf8(base64urlDecode(s))) as JsonWebKey;
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.x || !jwk.y) return null;
    return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
  } catch {
    return null;
  }
}

function publicKey(publicKeyB64Jwk: string): Promise<CryptoKey | null> {
  let cached = keyCache.get(publicKeyB64Jwk);
  if (!cached) {
    cached = (async () => {
      const subtle = globalThis.crypto?.subtle;
      const jwk = decodePublicJwk(publicKeyB64Jwk);
      if (!subtle || !jwk) return null;
      try {
        return await subtle.importKey('jwk', jwk, ECDSA_KEY, false, ['verify']);
      } catch {
        return null;
      }
    })();
    keyCache.set(publicKeyB64Jwk, cached);
  }
  return cached;
}

/** The payload when the signature verifies, else null. Never throws; null when WebCrypto is unavailable. */
export async function verifyToken(token: string, publicKeyB64Jwk: string): Promise<UnlockPayload | null> {
  const parsed = parseToken(token);
  if (!parsed) return null;
  try {
    const key = await publicKey(publicKeyB64Jwk);
    if (!key) return null;
    const ok = await globalThis.crypto.subtle.verify(
      ECDSA_SIGN,
      key,
      base64urlDecode(parsed.sigB64),
      utf8(parsed.payloadB64),
    );
    return ok ? parsed.payload : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Storage

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  try {
    const v = storage()?.getItem(TOKEN_STORAGE_KEY);
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    storage()?.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* private mode / quota: the session still has the in-memory result */
  }
  if (verified?.token !== token) verified = null;
}

export function clearToken(): void {
  try {
    storage()?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  verified = null;
  pending = null;
}

// ---------------------------------------------------------------------------
// Entitlement

let verified: { token: string; ok: boolean } | null = null;
let pending: { token: string; promise: Promise<boolean> } | null = null;

function unlockedByFlags(): boolean {
  return !FEATURES.paywall || FEATURES.allUnlocked;
}

/**
 * Synchronous answer from flags and the cached verification only. When a token is
 * stored but not yet verified this returns false and starts the verification so a
 * later call (or `hasEndless()`) reflects the result.
 */
export function hasEndlessSync(): boolean {
  if (unlockedByFlags()) return true;
  const token = getStoredToken();
  if (!token) return false;
  if (verified?.token === token) return verified.ok;
  void hasEndless();
  return false;
}

/** Verifies the stored token once (per token) and caches the outcome in memory. */
export async function hasEndless(): Promise<boolean> {
  if (unlockedByFlags()) return true;
  const token = getStoredToken();
  if (!token) return false;
  if (verified?.token === token) return verified.ok;
  if (pending?.token === token) return pending.promise;
  const promise = verifyToken(token, FEATURES.unlockPublicKey).then((payload) => {
    const ok = payload !== null;
    verified = { token, ok };
    if (pending?.token === token) pending = null;
    return ok;
  });
  pending = { token, promise };
  return promise;
}

// ---------------------------------------------------------------------------
// Worker calls

function workerUrl(): string {
  return (FEATURES.unlockWorkerUrl ?? '').trim().replace(/\/+$/, '');
}

/** Verify, then persist and cache. False when the token is missing or does not verify. */
async function acceptToken(token: unknown): Promise<boolean> {
  if (typeof token !== 'string') return false;
  const payload = await verifyToken(token, FEATURES.unlockPublicKey);
  if (!payload) return false;
  storeToken(token);
  verified = { token, ok: true };
  pending = null;
  return true;
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Handle the `/unlocked` landing. Reads `?token=` (a token handed over directly) or
 * `?session_id=` (Stripe's redirect), exchanges the session id with the worker,
 * then stores and verifies the token.
 */
export async function completeUnlockFromUrl(search: string): Promise<UnlockStatus> {
  const params = new URLSearchParams(search);
  const direct = params.get('token');
  const sessionId = params.get('session_id');
  if (!direct && !sessionId) return 'none';

  if (direct) return (await acceptToken(direct)) ? 'unlocked' : 'invalid';

  if (getStoredToken() && (await hasEndless())) return 'already';
  if (!sessionId || !/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return 'invalid';
  const base = workerUrl();
  if (!base) return 'error';

  try {
    const res = await fetch(`${base}/unlocked?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if ([400, 402, 404, 422].includes(res.status)) return 'invalid';
    if (!res.ok) return 'error';
    const body = await readJson(res);
    return (await acceptToken(body?.token)) ? 'unlocked' : 'invalid';
  } catch {
    return 'error';
  }
}

/** "Restore purchase": ask the worker for a fresh token for the email used at checkout. */
export async function restoreByEmail(email: string): Promise<RestoreStatus> {
  const base = workerUrl();
  const trimmed = (email ?? '').trim();
  if (!base || !trimmed) return 'error';
  try {
    const res = await fetch(`${base}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    });
    if (res.status === 404) return 'not_found';
    if (!res.ok) return 'error';
    const body = await readJson(res);
    return (await acceptToken(body?.token)) ? 'unlocked' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * The configured Stripe Payment Link. There are no accounts, so nothing meaningful
 * could go in `client_reference_id`; the Checkout Session id Stripe appends to the
 * success URL is the only handle the game needs.
 */
export function paymentLinkUrl(): string {
  return (FEATURES.stripePaymentLink ?? '').trim();
}

/** Test hook: forget cached verification results and imported keys. */
export function __resetUnlockStateForTests(): void {
  verified = null;
  pending = null;
  keyCache.clear();
}
