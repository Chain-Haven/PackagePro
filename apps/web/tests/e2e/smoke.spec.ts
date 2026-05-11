import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'PackagePro' })).toBeVisible();
    await expect(page.getByText(/sign in to your fulfillment dashboard/i)).toBeVisible();
  });

  test('health endpoint responds with JSON', async ({ request }) => {
    const res = await request.get('/api/health');
    expect([200, 503]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('checks');
  });

  test('unknown route returns 404', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
