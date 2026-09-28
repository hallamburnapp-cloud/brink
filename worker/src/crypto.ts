/**
 * Pure WebCrypto helpers shared by the worker routes and the tests.
 * Nothing here touches Cloudflare-specific APIs, so the same code runs in
 * Node 22 (vitest) and in the Workers runtime.
 */

export const TOKEN_PREFIX = 'brink1';

export interface TokenPayload {
  /** sha256 hex of the purchaser's lowercased email. */
  sub: string;
  plan: 'endless';
  /** Issued-at, Unix seconds. */
  iat: number;
  v: 1;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8(s: string): Uint8Array {
  return encoder.encode(s);
}

export function fromUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function toBytes(input: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof input === 'string') return utf8(input);
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

/** RFC 4648 §5 base64url without padding. */
export function base64urlEncode(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = toBytes(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Throws on malformed input. */
export function base64urlDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('bad base64url');
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function hex(bytes: ArrayBuffer | Uint8Array): string {
  const b = toBytes(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toBytes(input));
  return hex(digest);
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, utf8(message));
  return hex(mac);
}

/**
 * Constant-time comparison of two strings of equal length. The length check is
 * an early exit, which is fine for fixed-size digests.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// ECDSA P-256 token signing

const ECDSA_KEY = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

export function parsePrivateJwk(jwkJson: string): JsonWebKey {
  const jwk = JSON.parse(jwkJson) as JsonWebKey;
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.d || !jwk.x || !jwk.y) {
    throw new Error('SIGNING_PRIVATE_KEY_JWK must be an EC P-256 private key');
  }
  return jwk;
}

export function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', { ...jwk, key_ops: undefined, ext: undefined }, ECDSA_KEY, false, ['sign']);
}

export function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', publicJwkFrom(jwk), ECDSA_KEY, false, ['verify']);
}

/** The public half of an EC JWK: strip the private scalar and key metadata. */
export function publicJwkFrom(jwk: JsonWebKey): JsonWebKey {
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}

export async function generateKeyPair(): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey }> {
  // workers-types widens both return types to unions; the ECDSA overload always yields a pair / a JWK.
  const pair = (await crypto.subtle.generateKey(ECDSA_KEY, true, ['sign', 'verify'])) as CryptoKeyPair;
  const privateJwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
  return { privateJwk: { ...privateJwk, key_ops: undefined, ext: undefined }, publicJwk: publicJwkFrom(privateJwk) };
}

/** `brink1.<base64url(payload JSON)>.<base64url(signature)>` */
export async function signToken(payload: TokenPayload, privateKey: CryptoKey): Promise<string> {
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign(ECDSA_SIGN, privateKey, utf8(payloadB64));
  return `${TOKEN_PREFIX}.${payloadB64}.${base64urlEncode(sig)}`;
}

export interface ParsedToken {
  payload: TokenPayload;
  payloadB64: string;
  sigB64: string;
}

export function isTokenPayload(p: unknown): p is TokenPayload {
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

export function parseToken(token: string): ParsedToken | null {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !parts[1] || !parts[2]) return null;
  try {
    const payload: unknown = JSON.parse(fromUtf8(base64urlDecode(parts[1])));
    if (!isTokenPayload(payload)) return null;
    return { payload, payloadB64: parts[1], sigB64: parts[2] };
  } catch {
    return null;
  }
}

/** Returns the payload when the signature checks out, otherwise null. Never throws. */
export async function verifyToken(token: string, publicKey: CryptoKey): Promise<TokenPayload | null> {
  const parsed = parseToken(token);
  if (!parsed) return null;
  try {
    const ok = await crypto.subtle.verify(ECDSA_SIGN, publicKey, base64urlDecode(parsed.sigB64), utf8(parsed.payloadB64));
    return ok ? parsed.payload : null;
  } catch {
    return null;
  }
}
