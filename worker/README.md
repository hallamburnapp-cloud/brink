# brink-unlock-worker

A small Cloudflare Worker that turns a paid Stripe Checkout session into a signed
**Endless unlock token** for BRINK. The Daily mode is free; Endless is a one-time
purchase through a Stripe Payment Link. No accounts, no cookies, no user data
beyond a hash of the purchaser's email.

```
player ──► Stripe Payment Link ──► pays ──► redirect https://<game>/unlocked?session_id=cs_...
                                                      │
game ──► GET  {worker}/unlocked?session_id=cs_... ────┤ worker asks Stripe "is cs_... paid?"
      ◄── {token}                                     │ stores KV sub:<sha256(email)> = {sessionId, issuedAt}
                                                      │ signs token with the ECDSA private key
game stores the token in localStorage and verifies it offline with the public key.

restore ──► POST {worker}/restore {email} ──► KV hit, or Stripe lookup by email ──► {token} | 404
Stripe  ──► POST {worker}/webhook (checkout.session.completed) ──► pre-store the KV record
```

## Token format

```
brink1.<base64url(payload JSON)>.<base64url(signature)>
payload   = {"sub":"<sha256 hex of lowercased email>","plan":"endless","iat":<unix seconds>,"v":1}
signature = ECDSA P-256 / SHA-256 over the UTF-8 bytes of the payload segment (WebCrypto raw r||s)
```

The client only needs the public key. It is shipped to the game build as
`VITE_UNLOCK_PUBLIC_KEY` = base64url(JSON of the public JWK `{kty,crv,x,y}`).

## Endpoints

| Route | Success | Errors |
| --- | --- | --- |
| `GET /health` | `{ok:true}` | |
| `GET /unlocked?session_id=cs_…` | `200 {token, plan:'endless'}` | `400 bad_request`, `404 not_found`, `402 not_paid` / `wrong_product`, `422 no_email`, `502 upstream` |
| `POST /restore` `{email}` | `200 {token, plan:'endless'}` | `400 bad_request`, `404 not_found`, `429 rate_limited` (10 per email per day), `502 upstream` |
| `POST /webhook` (Stripe) | `200 {received:true}` (or `ignored:true`) | `400 bad_signature` / `bad_request`, `500 webhook_not_configured` |

All responses are JSON with `Cache-Control: no-store`. CORS is restricted to
`ALLOWED_ORIGIN` (comma-separated list allowed for local dev); `OPTIONS` is answered
with `204`.

## Setup

Everything below runs from this folder (`cd worker`). You need a Cloudflare account
with Workers + KV and a Stripe account.

### 1. Install and generate the signing keypair

```bash
npm install
npm run keygen
```

It prints two values. The **private JWK** becomes the worker secret
`SIGNING_PRIVATE_KEY_JWK` (step 5); the **public value** becomes the game's
`VITE_UNLOCK_PUBLIC_KEY` (step 7). Generate once; rotating the key invalidates every
issued token (players then use "Restore purchase").

### 2. Create the KV namespace

```bash
npx wrangler kv namespace create PURCHASES
npx wrangler kv namespace create PURCHASES --preview
```

Paste the printed `id` and `preview_id` into `[[kv_namespaces]]` in `wrangler.toml`.

KV holds two kinds of keys: `sub:<sha256(email)>` → `{"sessionId":"cs_…","issuedAt":"<ISO>"}`
(permanent) and `rl:restore:<sha256(email)>:<YYYY-MM-DD>` → counter (expires after a day).

### 3. Stripe: product, price and Payment Link

1. Dashboard → Product catalog → **Add product** "BRINK — Endless", one-time price.
   Copy the price id (`price_…`) into `STRIPE_PRICE_ID` in `wrangler.toml` (optional
   but recommended: it stops a purchase of some other product in the same account from
   unlocking Endless).
2. Dashboard → Payment Links → **New** → pick that price.
   Under **After payment** choose *Don't show confirmation page* → *Redirect customers
   to your website* and set the URL to
   `https://<your-game-domain>/unlocked?session_id={CHECKOUT_SESSION_ID}`.
   Stripe substitutes the real session id on redirect. Make sure email collection
   stays on (it is by default; the email is what "Restore purchase" keys on).
3. Copy the Payment Link URL (`https://buy.stripe.com/…`) into the game's
   `VITE_STRIPE_PAYMENT_LINK`.
4. Developers → API keys → create a **restricted key** with *Read* on Checkout Sessions
   and Customers. That is `STRIPE_SECRET_KEY`.

### 4. Stripe webhook

Developers → Webhooks → **Add endpoint** with URL
`https://brink-unlock.<your-subdomain>.workers.dev/webhook` (or your custom domain)
and the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
Copy the signing secret (`whsec_…`): that is `STRIPE_WEBHOOK_SECRET`.

The webhook is a safety net: it records the purchase even when the player closes the
tab before the redirect, so "Restore purchase" still works.

### 5. Secrets

```bash
npx wrangler secret put STRIPE_SECRET_KEY          # sk_live_... or rk_live_...
npx wrangler secret put STRIPE_WEBHOOK_SECRET      # whsec_...
npx wrangler secret put SIGNING_PRIVATE_KEY_JWK    # the private JWK line from `npm run keygen`
```

For `npm run dev`, put the same three names in an untracked `worker/.dev.vars` file
(`NAME=value` per line) and use `sk_test_…` keys.

### 6. Vars

In `wrangler.toml`:

- `ALLOWED_ORIGIN` — the game's origin, e.g. `https://brink.example`
  (add `,http://localhost:5173` while developing).
- `STRIPE_PRICE_ID` — the price from step 3, or `""` to accept any paid session.

### 7. Deploy and wire the game

```bash
npx wrangler deploy
```

Then set these in the game build environment (`.env.production` or CI):

```
VITE_PAYWALL=true
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/...
VITE_UNLOCK_WORKER_URL=https://brink-unlock.<your-subdomain>.workers.dev
VITE_UNLOCK_PUBLIC_KEY=<base64url public JWK from keygen>
```

## CI deploy

The worker is deployed by a job that runs `wrangler deploy` with an API token. Create
the token in Cloudflare → My Profile → API Tokens using the *Edit Cloudflare Workers*
template, and store it as the repository secret `CLOUDFLARE_API_TOKEN` (plus
`CLOUDFLARE_ACCOUNT_ID` from the Workers overview page). A GitHub Actions job:

```yaml
deploy-worker:
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  defaults: { run: { working-directory: worker } }
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm, cache-dependency-path: worker/package-lock.json }
    - run: npm ci
    - run: npm test
    - run: npx wrangler deploy
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Secrets set with `wrangler secret put` persist across deploys; the job never needs
them.

## Smoke test

```bash
W=https://brink-unlock.<your-subdomain>.workers.dev
O=https://brink.example

curl -sS "$W/health"
# {"ok":true}

curl -sS -i -X OPTIONS "$W/restore" -H "Origin: $O" | grep -i access-control
# Access-Control-Allow-Origin: https://brink.example ...

# Complete a test-mode payment through the Payment Link, take cs_test_... from the redirect URL:
curl -sS "$W/unlocked?session_id=cs_test_..." -H "Origin: $O"
# {"token":"brink1.eyJ...","plan":"endless"}

curl -sS -X POST "$W/restore" -H "Content-Type: application/json" -H "Origin: $O" \
     -d '{"email":"the-email-used-at-checkout@example.com"}'
# {"token":"brink1....","plan":"endless"}   or   {"error":"not_found"}

# Webhook signature check (Stripe CLI): stripe listen --forward-to $W/webhook
# then: stripe trigger checkout.session.completed
```

## Development

```bash
npm run dev        # wrangler dev on http://localhost:8787 (reads .dev.vars)
npm test           # vitest, Node, in-memory KV, mocked Stripe
npm run typecheck  # tsc against @cloudflare/workers-types
```

Layout: `src/crypto.ts` (base64url, SHA-256, HMAC, ECDSA sign/verify — pure WebCrypto),
`src/stripe.ts` (REST wrappers with injectable fetch, webhook signature),
`src/index.ts` (router), `scripts/keygen.mjs`, `test/`.

## Threat model

The token proves only that *someone* paid: it can be copied between devices, and the
game accepts that because the goal is a frictionless one-time purchase, not DRM.
The private signing key and Stripe keys live only in Worker secrets, so a leaked game
bundle or a compromised browser cannot mint tokens, and the only personal data at rest
is a SHA-256 of the purchaser's email keyed to a Stripe session id. Abuse of
`/restore` as an email oracle is limited to ten guesses per email per day, and the
webhook accepts nothing without a fresh (5-minute) HMAC signature from Stripe.
