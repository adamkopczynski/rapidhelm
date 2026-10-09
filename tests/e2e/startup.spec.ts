import { expect, test } from '@playwright/test';
test('loads real WASM, paddles and restarts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Simulation ready');
  await expect(page.getByLabel('Canoe simulation viewport')).toBeVisible();
  await page.keyboard.down('KeyW');
  await expect.poll(async () => Number((await page.locator('.speed').innerText()).split(' ')[0])).toBeGreaterThan(0.5);
  await page.keyboard.up('KeyW');
  await page.getByRole('button', { name: 'Restart simulation' }).click();
  await expect(page.locator('.speed')).toHaveText('0.00 m/s');
  expect(errors).toEqual([]);
});
