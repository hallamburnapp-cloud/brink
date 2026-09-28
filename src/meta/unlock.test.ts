import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as unlock from './unlock';
import {
  __resetUnlockStateForTests,
  __setUnlockFlagsForTests,
  clearToken,
  getStoredToken,
  parseToken,
  storeToken,
  TOKEN_STORAGE_KEY,
  verifyToken,
  type UnlockFlags,
  type UnlockPayload,
} from './unlock';

// ---------------------------------------------------------------------------
// Helpers: an in-test keypair, a token signer and a localStorage stub.

const b64u = (bytes: Uint8Array | string): string => {
  const b = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64uDecode = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

interface Keys {
  privateKey: CryptoKey;
  /** base64url(JSON public JWK), the VITE_UNLOCK_PUBLIC_KEY form. */
  publicKeyB64: string;
  publicJwkJson: string;
}

async function makeKeys(): Promise<Keys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const publicJwkJson = JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
  return { privateKey: pair.privateKey, publicKeyB64: b64u(publicJwkJson), publicJwkJson };
}

const payload: UnlockPayload = { sub: 'ab'.repeat(32), plan: 'endless', iat: 1_760_000_000, v: 1 };

async function sign(keys: Keys, p: object = payload): Promise<string> {
  const payloadB64 = b64u(JSON.stringify(p));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(payloadB64));
  return `brink1.${payloadB64}.${b64u(new Uint8Array(sig))}`;
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/**
 * config.ts computes FEATURES from import.meta.env at load time and vi.stubEnv does not
 * reach that object, so the flag-dependent tests set the flags through the test hook.
 */
function withFlags(flags: Partial<UnlockFlags>) {
  __setUnlockFlagsForTests(flags);
  return unlock;
}

let keys: Keys;
beforeEach(async () => {
  keys = await makeKeys();
  vi.stubGlobal('localStorage', memoryStorage());
  __resetUnlockStateForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  __resetUnlockStateForTests();
});

// ---------------------------------------------------------------------------

describe('parseToken', () => {
  it('parses a well-formed token', async () => {
    const token = await sign(keys);
    const parsed = parseToken(token);
    expect(parsed?.payload).toEqual(payload);
    expect(parsed?.payloadB64).toBe(token.split('.')[1]);
    expect(parsed?.sigB64).toBe(token.split('.')[2]);
  });

  it('rejects malformed tokens', () => {
    expect(parseToken('')).toBeNull();
    expect(parseToken('brink1.abc')).toBeNull();
    expect(parseToken('nope.abc.def')).toBeNull();
    expect(parseToken(`brink1.${b64u('{"not":"a payload"}')}.sig`)).toBeNull();
    expect(parseToken(`brink1.${b64u(JSON.stringify({ ...payload, plan: 'daily' }))}.sig`)).toBeNull();
    expect(parseToken(`brink1.${b64u(JSON.stringify({ ...payload, v: 2 }))}.sig`)).toBeNull();
    expect(parseToken(`brink1.${b64u(JSON.stringify({ ...payload, sub: 'xyz' }))}.sig`)).toBeNull();
    expect(parseToken('brink1.$$$.sig')).toBeNull();
    expect(parseToken(null as unknown as string)).toBeNull();
  });
});

describe('verifyToken', () => {
  it('accepts a token signed by the matching key (base64url JWK and raw JSON forms)', async () => {
    const token = await sign(keys);
    expect(await verifyToken(token, keys.publicKeyB64)).toEqual(payload);
    expect(await verifyToken(token, keys.publicJwkJson)).toEqual(payload);
  });

  it('rejects tampering and foreign keys', async () => {
    const token = await sign(keys);
    const [prefix, body, sig] = token.split('.');

    const forgedBody = b64u(JSON.stringify({ ...payload, sub: 'cd'.repeat(32) }));
    expect(await verifyToken(`${prefix}.${forgedBody}.${sig}`, keys.publicKeyB64)).toBeNull();

    const sigBytes = b64uDecode(sig);
    sigBytes[5] ^= 0x01;
    expect(await verifyToken(`${prefix}.${body}.${b64u(sigBytes)}`, keys.publicKeyB64)).toBeNull();

    expect(await verifyToken(`${prefix}.${body}.###`, keys.publicKeyB64)).toBeNull();

    const other = await makeKeys();
    expect(await verifyToken(token, other.publicKeyB64)).toBeNull();
  });

  it('returns null for a missing or malformed public key', async () => {
    const token = await sign(keys);
    expect(await verifyToken(token, '')).toBeNull();
    expect(await verifyToken(token, 'not-a-key')).toBeNull();
    expect(await verifyToken(token, b64u(JSON.stringify({ kty: 'RSA' })))).toBeNull();
  });

  it('returns null when WebCrypto is unavailable', async () => {
    const token = await sign(keys);
    __resetUnlockStateForTests();
    vi.stubGlobal('crypto', undefined);
    expect(await verifyToken(token, keys.publicKeyB64)).toBeNull();
  });
});

describe('storage helpers', () => {
  it('stores, reads and clears the token under the documented key', () => {
    expect(getStoredToken()).toBeNull();
    storeToken('brink1.a.b');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('brink1.a.b');
    expect(getStoredToken()).toBe('brink1.a.b');
    clearToken();
    expect(getStoredToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('never throws when localStorage is missing or hostile', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => storeToken('x')).not.toThrow();
    expect(getStoredToken()).toBeNull();
    expect(() => clearToken()).not.toThrow();

    const hostile = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    vi.stubGlobal('localStorage', hostile);
    expect(() => storeToken('x')).not.toThrow();
    expect(getStoredToken()).toBeNull();
    expect(() => clearToken()).not.toThrow();
  });
});

describe('entitlement with the paywall on', () => {
  const WORKER = 'https://unlock.example';
  const LINK = 'https://buy.stripe.com/test_abc';

  function paywalled(extra: Partial<UnlockFlags> = {}) {
    return withFlags({
      paywall: true,
      allUnlocked: false,
      workerUrl: `${WORKER}/`,
      publicKey: keys.publicKeyB64,
      paymentLink: LINK,
      ...extra,
    });
  }

  it('is locked without a token and unlocked with a verified one', async () => {
    const u = paywalled();
    expect(u.hasEndlessSync()).toBe(false);
    expect(await u.hasEndless()).toBe(false);

    u.storeToken(await sign(keys));
    expect(u.hasEndlessSync()).toBe(false); // verification pending
    expect(await u.hasEndless()).toBe(true);
    expect(u.hasEndlessSync()).toBe(true); // cached

    u.clearToken();
    expect(u.hasEndlessSync()).toBe(false);
  });

  it('rejects a token signed by another key', async () => {
    const u = paywalled();
    const other = await makeKeys();
    u.storeToken(await sign(other));
    expect(await u.hasEndless()).toBe(false);
    expect(u.hasEndlessSync()).toBe(false);
  });

  it('paywall off or allUnlocked short-circuits to true', async () => {
    const off = withFlags({ paywall: false, allUnlocked: false, publicKey: '' });
    expect(off.hasEndlessSync()).toBe(true);
    expect(await off.hasEndless()).toBe(true);
    const all = withFlags({ paywall: true, allUnlocked: true, publicKey: '' });
    expect(all.hasEndlessSync()).toBe(true);
    expect(await all.hasEndless()).toBe(true);
  });

  it('paymentLinkUrl returns the configured link', async () => {
    const u = paywalled();
    expect(u.paymentLinkUrl()).toBe(LINK);
    const none = paywalled({ paymentLink: '' });
    expect(none.paymentLinkUrl()).toBe('');
  });

  describe('completeUnlockFromUrl', () => {
    it('exchanges session_id with the worker, stores and verifies the token', async () => {
      const u = paywalled();
      const token = await sign(keys);
      const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse({ token, plan: 'endless' }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('unlocked');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toBe(`${WORKER}/unlocked?session_id=cs_test_a1B2c3D4e5`);
      expect(u.getStoredToken()).toBe(token);
      expect(u.hasEndlessSync()).toBe(true);
    });

    it('accepts a token passed directly and reports none without params', async () => {
      const u = paywalled();
      vi.stubGlobal('fetch', vi.fn());
      expect(await u.completeUnlockFromUrl('')).toBe('none');
      expect(await u.completeUnlockFromUrl('?foo=bar')).toBe('none');
      expect(await u.completeUnlockFromUrl(`?token=${encodeURIComponent(await sign(keys))}`)).toBe('unlocked');
      expect(await u.completeUnlockFromUrl('?token=brink1.bad.token')).toBe('invalid');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('reports already when a valid token is stored', async () => {
      const u = paywalled();
      u.storeToken(await sign(keys));
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('already');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps worker rejections to invalid, failures to error, and bad tokens to invalid', async () => {
      const u = paywalled();
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'not_paid' }, 402)));
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('invalid');
      expect(u.getStoredToken()).toBeNull();

      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'not_found' }, 404)));
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('invalid');

      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'upstream' }, 502)));
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('error');

      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('network'))));
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('error');

      const other = await makeKeys();
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ token: await sign(other) })));
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('invalid');
      expect(u.getStoredToken()).toBeNull();

      expect(await u.completeUnlockFromUrl('?session_id=pi_not_a_session')).toBe('invalid');
    });

    it('reports error when no worker URL is configured', async () => {
      const u = paywalled({ workerUrl: '' });
      vi.stubGlobal('fetch', vi.fn());
      expect(await u.completeUnlockFromUrl('?session_id=cs_test_a1B2c3D4e5')).toBe('error');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('restoreByEmail', () => {
    it('posts the email and stores the returned token', async () => {
      const u = paywalled();
      const token = await sign(keys);
      const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse({ token, plan: 'endless' }));
      vi.stubGlobal('fetch', fetchMock);

      expect(await u.restoreByEmail('  Buyer@Example.com ')).toBe('unlocked');
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${WORKER}/restore`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ email: 'Buyer@Example.com' });
      expect(u.getStoredToken()).toBe(token);
      expect(await u.hasEndless()).toBe(true);
    });

    it('maps 404 to not_found and everything else to error', async () => {
      const u = paywalled();
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'not_found' }, 404)));
      expect(await u.restoreByEmail('nobody@example.com')).toBe('not_found');
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'rate_limited' }, 429)));
      expect(await u.restoreByEmail('nobody@example.com')).toBe('error');
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
      expect(await u.restoreByEmail('nobody@example.com')).toBe('error');
      expect(await u.restoreByEmail('   ')).toBe('error');
      expect(u.getStoredToken()).toBeNull();
    });
  });
});
