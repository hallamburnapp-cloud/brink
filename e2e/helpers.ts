import { expect, type Page } from '@playwright/test';

/** Play the current run to its end by tapping choice buttons and taking the first offered piece. */
export async function playToEnd(page: Page, pick: 'left' | 'right' | 'alternate' = 'alternate', maxSteps = 3000, budgetMs = 300_000): Promise<void> {
  let step = 0;
  const started = Date.now();
  while (step < maxSteps && Date.now() - started < budgetMs) {
    step++;
    // Ending?
    if (await page.getByRole('button', { name: /replay this seed/i }).isVisible().catch(() => false)) return;
    // Shop? Buy the first affordable piece, then leave.
    const leave = page.getByRole('button', { name: /^Back to the desk$|^Begin |^Into the endless night$/ });
    if (await leave.isVisible().catch(() => false)) {
      const affordable = page.locator('button').filter({ hasText: /ADVISOR|DOCTRINE|ASSET/ }).filter({ hasNot: page.locator('text=BOUGHT') });
      const n = await affordable.count();
      for (let i = 0; i < n; i++) {
        const b = affordable.nth(i);
        if (await b.isEnabled().catch(() => false)) {
          await b.click().catch(() => {});
          break;
        }
      }
      await leave.click();
      await page.waitForTimeout(400);
      continue;
    }
    // Roll / accident overlays: wait for them to clear.
    const overlay = page.getByRole('dialog');
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      continue;
    }
    const alert = page.getByRole('alert');
    if (await alert.isVisible().catch(() => false)) {
      await alert.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      continue;
    }
    const left = page.getByRole('button', { name: /^Left:/ });
    const right = page.getByRole('button', { name: /^Right:/ });
    if (await left.isVisible().catch(() => false)) {
      const side = pick === 'alternate' ? (step % 2 ? 'left' : 'right') : pick;
      const btn = side === 'left' ? left : right;
      // The tally / accident animations disable the choices briefly; wait them out rather than spend steps.
      await expect(btn).toBeEnabled({ timeout: 8_000 }).catch(() => {});
      if (await btn.isEnabled().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(250);
        continue;
      }
    }
    await page.waitForTimeout(200);
  }
  throw new Error('Run did not end within the step budget');
}

export async function expectEndingScreen(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /replay this seed/i })).toBeVisible();
  await expect(page.getByText(/DAYS IN OFFICE/)).toBeVisible();
}
