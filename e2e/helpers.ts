import { expect, type Page } from '@playwright/test';

/** Play the current run to its end by tapping choice buttons and taking the first offered piece. */
export async function playToEnd(page: Page, pick: 'left' | 'right' | 'alternate' = 'alternate', maxSteps = 400): Promise<void> {
  let step = 0;
  while (step < maxSteps) {
    step++;
    // Ending?
    if (await page.getByRole('button', { name: /replay this seed/i }).isVisible().catch(() => false)) return;
    // Offer?
    const offerBtn = page.getByRole('button', { name: /^Bring in|^Choose one/ });
    if (await offerBtn.isVisible().catch(() => false)) {
      const pieces = page.locator('button').filter({ hasText: /ADVISOR|DOCTRINE|ASSET/ });
      if ((await pieces.count()) > 0) await pieces.first().click();
      await page.getByRole('button', { name: /^Bring in/ }).click();
      await page.waitForTimeout(400);
      continue;
    }
    // Roll overlay: wait for it to clear.
    const overlay = page.getByRole('dialog');
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
      continue;
    }
    const left = page.getByRole('button', { name: /^Left:/ });
    const right = page.getByRole('button', { name: /^Right:/ });
    if (await left.isVisible().catch(() => false)) {
      const side = pick === 'alternate' ? (step % 2 ? 'left' : 'right') : pick;
      const btn = side === 'left' ? left : right;
      if (await btn.isEnabled()) {
        await btn.click();
        await page.waitForTimeout(450);
        continue;
      }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('Run did not end within the step budget');
}

export async function expectEndingScreen(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /replay this seed/i })).toBeVisible();
  await expect(page.getByText(/DAYS IN OFFICE/)).toBeVisible();
}
