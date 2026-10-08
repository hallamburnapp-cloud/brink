import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const keys = JSON.parse(readFileSync(new URL('./fixtures/test-keys.json', import.meta.url), 'utf8')) as { privateJwk: JsonWebKey };

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signToken(payload: object): Promise<string> {
  const key = await webcrypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(payloadB64));
  return `brink1.${payloadB64}.${b64url(new Uint8Array(sig))}`;
}

/** Home shows the plate only after the first open: start the practice night, answer one card, come home. */
async function pastTheFirstOpen(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clock in' }).click();
  await page.getByRole('button', { name: /^Right:/ }).click();
  await page.getByRole('button', { name: /^Home/ }).first().click();
  await expect(page.getByText(/PRACTICE NIGHT/)).toBeVisible();
}

test.describe('The Brass Plate with a stubbed Worker', () => {
  test('the plate is locked, then on the desk after the Stripe redirect', async ({ page }) => {
    await pastTheFirstOpen(page);
    await expect(page.getByText('THE BRASS PLATE', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Unlock · / }).click();
    await expect(page.getByText(/ONE-TIME PURCHASE/)).toBeVisible();
    await expect(page.getByText(/Choose the night you work/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Unlock for/ })).toHaveAttribute('href', /stripe/);

    const token = await signToken({ sub: 'a'.repeat(64), plan: 'endless', iat: Math.floor(Date.now() / 1000), v: 1 });
    await page.route('http://unlock.test/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/unlocked')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token }) });
      if (url.includes('/restore')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token }) });
      return route.fulfill({ status: 404, body: '{}' });
    });

    await page.goto('/unlocked?session_id=cs_test_123');
    await expect(page.getByText(/The plate is on the desk/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // With the plate: choose the night you work; the chosen Booking is on the card's footer.
    await expect(page.getByRole('button', { name: /^Unlock · / })).toHaveCount(0);
    await page.getByRole('button', { name: 'CHOOSE THE NIGHT' }).click();
    await page.getByRole('button', { name: 'The Wedding' }).click();
    await expect(page.getByRole('group', { name: /Card from/ })).toBeVisible();
    await expect(page.getByText('THE WEDDING', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('PRACTICE', { exact: true })).toBeVisible();

    // The token survives a reload.
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'CHOOSE THE NIGHT' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Unlock · / })).toHaveCount(0);
  });

  test('a tampered token is rejected', async ({ page }) => {
    const token = (await signToken({ sub: 'b'.repeat(64), plan: 'endless', iat: 1, v: 1 })).replace(/\.[^.]+$/, '.AAAA');
    await page.route('http://unlock.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token }) }));
    await page.goto('/unlocked?session_id=cs_bad');
    await expect(page.getByText(/did not check out/)).toBeVisible();
  });

  test('restore by email puts the plate back', async ({ page }) => {
    const token = await signToken({ sub: 'c'.repeat(64), plan: 'endless', iat: Math.floor(Date.now() / 1000), v: 1 });
    await page.route('http://unlock.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token }) }));
    await pastTheFirstOpen(page);
    await page.getByRole('button', { name: /^Unlock · / }).click();
    await page.getByPlaceholder('email used at checkout').fill('buyer@example.com');
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByText(/Restored/)).toBeVisible();
  });
});
