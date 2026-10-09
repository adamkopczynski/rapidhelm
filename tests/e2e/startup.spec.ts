import { expect, test, type Page } from '@playwright/test';
const number = async (page: Page, id: string) => parseFloat(await page.getByTestId(id).innerText());
async function ready(page: Page) {
  await page.goto('/'); await expect(page.getByRole('status')).toHaveText('Simulation ready');
}
test('real WASM forward, reverse, turn and restart', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await ready(page); await expect(page.getByLabel('Canoe simulation viewport')).toBeVisible();
  await page.keyboard.down('KeyW'); await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.5); await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD'); await expect.poll(() => number(page, 'yaw-rate')).toBeGreaterThan(0.1); await page.keyboard.up('KeyD');
  await page.getByRole('button', { name: 'Restart simulation' }).click();
  await expect(page.getByTestId('forward-speed')).toHaveText('0.00 m/s forward');
  await expect(page.getByTestId('yaw-rate')).toHaveText('0.000 rad/s');
  await page.getByLabel('Canoe simulation viewport').focus(); await page.keyboard.down('KeyS');
  await expect.poll(() => number(page, 'forward-speed')).toBeLessThan(-0.5); await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyR'); await expect(page.getByTestId('position')).toHaveText('0.00 / 0.00 m');
  expect(errors).toEqual([]);
});
test('applies tuning, rejects bad values, preserves tuning across restart, restores defaults', async ({ page }) => {
  await ready(page); await page.getByText('Handling laboratory', { exact: true }).click();
  await page.getByLabel('Mass', { exact: false }).fill('0'); await page.getByRole('button', { name: 'Apply tuning' }).click();
  await expect(page.getByTestId('tuning-message')).toContainText('not applied'); await expect(page.locator('#mass')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#mass').fill('90'); await page.locator('#forwardThrust').fill('0'); await page.getByRole('button', { name: 'Apply tuning' }).click();
  await expect(page.getByTestId('tuning-message')).toContainText('Configuration applied');
  await page.getByLabel('Canoe simulation viewport').focus(); await page.keyboard.down('KeyW');
  await expect.poll(() => number(page, 'steps')).toBeGreaterThan(30); await expect(page.getByTestId('forward-speed')).toHaveText('0.00 m/s forward');
  await page.keyboard.up('KeyW'); await page.keyboard.press('KeyR'); await page.keyboard.down('KeyW');
  await expect.poll(() => number(page, 'steps')).toBeGreaterThan(30); await expect(page.getByTestId('forward-speed')).toHaveText('0.00 m/s forward'); await page.keyboard.up('KeyW');
  await page.getByRole('button', { name: 'Restore defaults' }).click(); await expect(page.locator('#forwardThrust')).toHaveValue('240');
  await page.getByLabel('Canoe simulation viewport').focus(); await page.keyboard.down('KeyW'); await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.5); await page.keyboard.up('KeyW');
});
test('editing ignores gameplay controls and blur clears held input', async ({ page }) => {
  await ready(page); await page.getByText('Handling laboratory', { exact: true }).click();
  await page.locator('#mass').focus(); await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD');
  await expect.poll(() => number(page, 'steps')).toBeGreaterThan(30); await expect(page.getByTestId('position')).toHaveText('0.00 / 0.00 m');
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD'); await page.getByLabel('Canoe simulation viewport').focus();
  await page.keyboard.down('KeyW'); await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.8);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const speed = await number(page, 'forward-speed'); const steps = await number(page, 'steps');
  await expect.poll(() => number(page, 'steps')).toBeGreaterThan(steps + 60);
  await expect.poll(() => number(page, 'forward-speed')).toBeLessThan(speed); await page.keyboard.up('KeyW');
});
test('debug toggle and reference scene render without page errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await ready(page); await expect(page.getByText('Velocity: 1 m = 1 m/s', { exact: false })).toBeVisible();
  await page.getByLabel('Show debug vectors').uncheck(); await expect(page.getByTestId('steps')).toHaveCount(0);
  await page.getByLabel('Show debug vectors').check(); await expect(page.getByTestId('steps')).toBeVisible();
  await page.screenshot({ path: 'test-results/sprint-1-sandbox.png' }); expect(errors).toEqual([]);
});

test('repeated restart keys and editor focus do not reset an active run', async ({ page }) => {
  await ready(page); await page.keyboard.down('KeyR'); // first event resets
  await page.keyboard.down('KeyW'); await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.5);
  await page.keyboard.down('KeyR'); // repeated keydown must not reset or clear throttle
  await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.6);
  await page.keyboard.up('KeyR'); await page.keyboard.up('KeyW');
  await page.getByText('Handling laboratory', { exact: true }).click(); await page.locator('#mass').focus();
  await page.keyboard.press('KeyR'); await expect.poll(() => number(page, 'forward-speed')).toBeGreaterThan(0.2);
});
