import { expect, test } from '@playwright/test';
import { dismissIntro, expectEndingScreen, playToEnd } from './helpers';

test.describe('Tonight', () => {
  test('plays tonight on a phone, copies the result, and comes home to the countdown', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
    await expect(page.getByText(/TONIGHT · #\d+/)).toBeVisible();
    await expect(page.getByText(/^You are .+\.$/)).toBeVisible();

    // Start tonight
    await page.getByRole('button', { name: 'Play tonight' }).click();
    await dismissIntro(page);

    // The clock starts at 3:00 and the five dials are named in plain words; nothing on screen is a number
    await expect(page.getByLabel(/The time is 3:0\d/)).toBeVisible();
    for (const m of ['PEOPLE', 'ARMY', 'ALLIES', 'MONEY', 'DANGER']) await expect(page.getByText(m, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/leverage|ante|\d+ percent/i)).toHaveCount(0);

    // Drag the card a little to reveal the choice stamp, then release without committing
    const card = page.getByRole('group', { name: /Card from/ });
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
    }
    await expect(card).toBeVisible();

    await playToEnd(page);
    await expectEndingScreen(page, 'night');

    // The result goes to the clipboard as one line, the strip and the link (no Web Share in headless)
    await page.getByRole('button', { name: 'Copy result' }).click();
    await expect(page.getByText(/Copied/).first()).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (text) {
      expect(text).toMatch(/BRINK #\d+ (🌅 Dawn|🌑 Fell at \d:\d\d|☢️ \d:\d\d)/);
      expect(text.split('\n').length).toBeGreaterThanOrEqual(7);
    }

    // The image share falls back gracefully
    await page.getByRole('button', { name: 'Share image' }).click();
    await expect(page.getByText(/Shared|Copied|saved|not available/).first()).toBeVisible();

    // Tonight is one attempt: home shows the result strip and the countdown, not Play tonight
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByText(/TOMORROW'S NIGHT IN/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play tonight' })).toHaveCount(0);

    // Compendium shows at least one ending seen
    await page.getByRole('button', { name: /Endings \d+\/\d+/ }).click();
    await expect(page.getByText(/% COMPLETE/)).toBeVisible();
    await expect(page.locator('li').filter({ hasNotText: 'Not yet witnessed.' }).filter({ hasText: /×1/ }).first()).toBeVisible();
  });

  test('home is one tap away from inside a night, and the night is where you left it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play tonight' }).click();
    await dismissIntro(page);
    const card = page.getByRole('group', { name: /Card from/ });
    await expect(card).toBeVisible();
    // Play one card so the clock has moved, then go home from the header.
    await page.getByRole('button', { name: /^Right:/ }).click();
    await expect(page.getByLabel(/The time is 3:07/)).toBeVisible();
    const before = await card.locator('.serif').nth(1).innerText();
    await page.getByRole('button', { name: /^Home/ }).first().click();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
    // Tonight is one attempt: Home offers to pick it back up, not to start again.
    await expect(page.getByRole('button', { name: 'Play tonight' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Pick the phone back up' }).click();
    await expect(page.getByLabel(/The time is 3:07/)).toBeVisible();
    await expect(card.locator('.serif').nth(1)).toHaveText(before);
    // The browser's back button also walks back to Home and keeps the night.
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pick the phone back up' })).toBeVisible();
    // Every other screen has Home at the top left.
    await page.getByRole('button', { name: 'About' }).click();
    await page.getByRole('button', { name: '← HOME' }).click();
    await expect(page.getByRole('heading', { name: 'BRINK' })).toBeVisible();
  });

  test('the dawn screen offers the unlock while night after night is paywalled', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play tonight' }).click();
    await dismissIntro(page);
    const firstCardText = await page.getByRole('group', { name: /Card from/ }).locator('.serif').nth(1).innerText();
    expect(firstCardText.length).toBeGreaterThan(10);
    await playToEnd(page, 'right');
    await expectEndingScreen(page, 'night');
    await expect(page.getByRole('button', { name: /Replay this seed/i })).toHaveCount(0);
    await page.getByRole('button', { name: /Night after night · unlock/ }).click();
    await expect(page.getByText(/ONE-TIME PURCHASE/)).toBeVisible();
  });
});
