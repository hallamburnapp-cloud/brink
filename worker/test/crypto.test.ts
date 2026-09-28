import { describe, expect, it } from 'vitest';
import {
  base64urlDecode,
  base64urlEncode,
  generateKeyPair,
  hmacSha256Hex,
  importPrivateKey,
  importPublicKey,
  parseToken,
  sha256Hex,
  signToken,
  timingSafeEqual,
  verifyToken,
  type TokenPayload,
} from '../src/crypto';

const payload: TokenPayload = { sub: 'a'.repeat(64), plan: 'endless', iat: 1_760_000_000, v: 1 };

describe('base64url', () => {
  it('round-trips arbitrary bytes without padding', () => {
    const bytes = new Uint8Array(257).map((_, i) => (i * 7) % 256);
    const s = base64urlEncode(bytes);
    expect(s).not.toMatch(/[+/=]/);
    expect(Array.from(base64urlDecode(s))).toEqual(Array.from(bytes));
  });
  it('rejects non-alphabet input', () => {
    expect(() => base64urlDecode('ab+c')).toThrow();
  });
});

describe('hashing', () => {
  it('sha256Hex matches a known vector', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('hmacSha256Hex matches RFC 4231 test case 2', async () => {
    expect(await hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
  it('timingSafeEqual compares correctly', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('token sign/verify', () => {
  it('round-trips and produces the documented format', async () => {
    const { privateJwk, publicJwk } = await generateKeyPair();
    expect(privateJwk.d).toBeTruthy();
    expect(publicJwk).not.toHaveProperty('d');

    const token = await signToken(payload, await importPrivateKey(privateJwk));
    expect(token).toMatch(/^brink1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const parsed = parseToken(token);
    expect(parsed?.payload).toEqual(payload);
    expect(JSON.parse(new TextDecoder().decode(base64urlDecode(parsed!.payloadB64)))).toEqual(payload);

    const verified = await verifyToken(token, await importPublicKey(publicJwk));
    expect(verified).toEqual(payload);
  });

  it('rejects a tampered payload, a tampered signature and a foreign key', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const token = await signToken(payload, await importPrivateKey(a.privateJwk));
    const pubA = await importPublicKey(a.publicJwk);
    const [prefix, body, sig] = token.split('.');

    const forged = base64urlEncode(JSON.stringify({ ...payload, sub: 'b'.repeat(64) }));
    expect(await verifyToken(`${prefix}.${forged}.${sig}`, pubA)).toBeNull();

    const sigBytes = base64urlDecode(sig);
    sigBytes[0] ^= 0xff;
    expect(await verifyToken(`${prefix}.${body}.${base64urlEncode(sigBytes)}`, pubA)).toBeNull();

    expect(await verifyToken(token, await importPublicKey(b.publicJwk))).toBeNull();
  });

  it('parseToken rejects malformed tokens', async () => {
    expect(parseToken('')).toBeNull();
    expect(parseToken('brink1.only-two')).toBeNull();
    expect(parseToken('brink2.a.b')).toBeNull();
    expect(parseToken(`brink1.${base64urlEncode('not json')}.sig`)).toBeNull();
    expect(parseToken(`brink1.${base64urlEncode(JSON.stringify({ ...payload, plan: 'daily' }))}.sig`)).toBeNull();
    expect(parseToken(`brink1.${base64urlEncode(JSON.stringify({ ...payload, sub: 'short' }))}.sig`)).toBeNull();
    expect(parseToken(`brink1.${base64urlEncode(JSON.stringify({ ...payload, v: 2 }))}.sig`)).toBeNull();
    expect(parseToken(`brink1.${base64urlEncode(JSON.stringify(payload))}.###`)).not.toBeNull(); // sig decoded at verify time
    const { publicJwk } = await generateKeyPair();
    expect(await verifyToken(`brink1.${base64urlEncode(JSON.stringify(payload))}.###`, await importPublicKey(publicJwk))).toBeNull();
  });
});
