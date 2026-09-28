#!/usr/bin/env node
/**
 * Generate the ECDSA P-256 keypair used to sign unlock tokens.
 *
 *   npm run keygen            # human-readable, with the two commands to run
 *   npm run keygen -- --json  # {"privateJwk": "...", "publicKeyB64": "..."} for scripts
 *
 * Keep the private JWK secret (wrangler secret). The public value is embedded in
 * the game bundle as VITE_UNLOCK_PUBLIC_KEY and is safe to commit to CI config.
 */
const { privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', privateKey);
delete priv.key_ops;
delete priv.ext;
const pub = { kty: priv.kty, crv: priv.crv, x: priv.x, y: priv.y };

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64url');
const privateJwk = JSON.stringify(priv);
const publicKeyB64 = b64url(JSON.stringify(pub));

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ privateJwk, publicKeyB64 }) + '\n');
} else {
  process.stdout.write(
    [
      '# 1. Worker secret (paste when prompted; keep it out of git):',
      '#    npx wrangler secret put SIGNING_PRIVATE_KEY_JWK',
      privateJwk,
      '',
      '# 2. Game build env (base64url-encoded public JWK), e.g. in .env.production or CI:',
      `VITE_UNLOCK_PUBLIC_KEY=${publicKeyB64}`,
      '',
    ].join('\n'),
  );
}
