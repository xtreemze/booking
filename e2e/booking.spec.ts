import { expect, test } from '@playwright/test';

test('renders the booking application and registers the embeddable widget', async ({ page }) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'One booking system. Different operational realities.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => customElements.get('booking-widget') !== undefined)).toBe(true);
});

test('Lit widget consumes the shared booking model', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const widget = document.createElement('booking-widget');
    widget.id = 'widget-under-test';
    widget.setAttribute('business-id', 'restaurant-demo');
    document.body.append(widget);
  });

  const widget = page.locator('#widget-under-test');
  await expect(widget.getByRole('heading', { name: 'Common Table' })).toBeVisible();

  const future = await page.evaluate(() => {
    const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });
  await widget.getByLabel('Date').fill(future);
  await expect(widget.getByText(/available option|No availability/)).toBeVisible();
});

test('mobile layout does not overflow horizontally', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
