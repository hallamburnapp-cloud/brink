import { expect, test, type Page } from '@playwright/test';

/**
 * The hotel, end to end on a phone: the first night from CLOCK IN, Home from the Desk with the
 * night kept where it was, tonight as one attempt, the review and its share text, the Guest
 * Book, and the plate's purchase screen. Runs against the pack in `content/` (the hotel).
 */

const ENDED = /^Copy result$/;

async function playToEnd(page: Page, pick: 'left' | 'right' | 'alternate' = 'alternate', maxSteps = 400): Promise<void> {
  for (let step = 1; step <= maxSteps; step++) {
    if (await page.getByRole('button', { name: ENDED }).first().isVisible().catch(() => false)) return;
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
      await expect(btn).toBeEnabled({ timeout: 8_000 }).catch(() => {});
      if (await btn.isEnabled().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(200);
        continue;
      }
    }
    await page.waitForTimeout(150);
  }
  throw new Error('the night did not end within the step budget');
}

test.describe('The Brink Hotel', () => {
  test('the first night, tonight, the review, the share text, the Guest Book', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();

    // First open: one button. No numbers anywhere but the clock.
    await page.getByRole('button', { name: 'Clock in' }).click();
    await expect(page.getByLabel(/The time is 3:00/)).toBeVisible();
    for (const b of ['GUESTS', 'STAFF', 'MONEY', 'THE BUILDING']) await expect(page.getByText(b, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/leverage|ante|\d+ percent|\d+%/i)).toHaveCount(0);
    await expect(page.getByText('THE SWAN', { exact: true }).first()).toBeVisible();

    // One answer: the clock moves ten minutes, a reply line appears, a bar wears an arrow.
    await page.getByRole('button', { name: /^Right:/ }).click();
    await expect(page.getByLabel(/The time is 3:10/)).toBeVisible();
    await expect(page.locator('.reply-line')).toBeVisible();

    // Home keeps the night exactly where it is.
    await page.getByRole('button', { name: /^Home/ }).first().click();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
    await expect(page.getByText(/PRACTICE NIGHT/)).toBeVisible();
    await page.getByRole('button', { name: 'Pick it back up' }).click();
    await expect(page.getByLabel(/The time is 3:10/)).toBeVisible();

    await playToEnd(page, 'alternate');

    // The review: stars as words, a byline, the clock, the row, the bars; AGAIN and tonight.
    await expect(page.getByRole('img', { name: /stars? out of five/ }).first()).toBeVisible();
    await expect(page.getByText(/YOUR FIRST NIGHT · THE SWAN/)).toBeVisible();
    await expect(page.getByText(/DAWN|FELL AT/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Copy result' }).click();
    const first = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (first) {
      expect(first.split('\n')[0]).toMatch(/^BRINK · THE SWAN · [★☆]{5}$/);
      expect(first.split('\n')[1]).toMatch(/^[🟩🟨🟧🟥⬜]{9} (🌅|🌑 \d:\d\d)$/u);
    }

    // Tonight: one attempt, picked back up from Home, then a numbered review.
    await page.getByRole('button', { name: 'Now the real one · tonight' }).click();
    await expect(page.getByLabel(/The time is 3:00/)).toBeVisible();
    await expect(page.getByText('TONIGHT', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /^Left:/ }).click();
    await page.getByRole('button', { name: /^Home/ }).first().click();
    await expect(page.getByRole('button', { name: 'Answer it' })).toHaveCount(0);
    await page.getByRole('button', { name: /Pick the phone back up/ }).click();
    await expect(page.getByLabel(/The time is 3:10/)).toBeVisible();
    await playToEnd(page, 'right');
    await page.getByRole('button', { name: 'Copy result' }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (text) {
      const lines = text.split('\n');
      expect(lines[0]).toMatch(/^BRINK #\d+ · [A-Z0-9 ']+ · [★☆]{5}$/);
      expect(lines[lines.length - 1]).toMatch(/^https?:\/\//);
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
    }
    await page.getByRole('button', { name: 'Share image' }).click();
    await expect(page.getByText(/Shared|Copied|saved|not available/).first()).toBeVisible();

    // Home shows today's review and tomorrow's Booking; tonight cannot be played again.
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.getByText(/TOMORROW'S NIGHT IN/)).toBeVisible();
    await expect(page.getByText(/^Tomorrow:/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Answer it' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();

    // The Guest Book has at least one page written and blank pages or unwritten ones.
    await page.getByRole('button', { name: /Guest Book/ }).click();
    await expect(page.getByRole('heading', { name: 'Guest Book' })).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ reviews written/)).toBeVisible();
    await expect(page.getByText(/THE ARCHIVE/)).toBeVisible();
    await page.getByRole('button', { name: '← HOME' }).click();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
  });

  test('the plate is one purchase with the price on the button, and the back button walks home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Clock in' }).click();
    await page.getByRole('button', { name: /^Right:/ }).click();
    // The browser's back button leaves the desk for Home and keeps the night.
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick it back up' })).toBeVisible();
    await page.getByRole('button', { name: /^Unlock · /}).click();
    await expect(page.getByText('THE BRASS PLATE', { exact: true })).toBeVisible();
    await expect(page.getByText(/ONE-TIME PURCHASE/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Unlock for / })).toBeVisible();
    await page.getByRole('button', { name: '← HOME' }).click();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
  });
});
