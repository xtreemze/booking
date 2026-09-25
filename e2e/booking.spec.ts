import { expect, test } from '@playwright/test';

test('renders the booking application, visitor booking and embeddable widget', async ({ page }) => {
  await page.goto('./');

  await expect(
    page.getByRole('heading', { name: 'Book time, expertise, space or capacity.' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Interior design consultation' })).toBeVisible();
  await expect(page.getByText('Your upcoming booking')).toBeVisible();
  expect(await page.evaluate(() => customElements.get('booking-widget') !== undefined)).toBe(true);
});

test('supports consultation presets with delivery and intake components', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'Audio / AV' }).click();
  await expect(page.getByRole('heading', { name: 'Signal Room Audio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'At the business' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'At your location' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Online' })).toBeVisible();
  await expect(page.getByLabel('Primary goal')).toBeVisible();
  await expect(page.getByLabel('Current equipment')).toBeVisible();
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

  await widget.evaluate((element) => element.setAttribute('business-id', 'audio-demo'));
  await expect(widget.getByRole('heading', { name: 'Signal Room Audio' })).toBeVisible();
  await expect(widget.getByRole('button', { name: 'At the business' })).toBeVisible();
  await expect(widget.getByRole('button', { name: 'At your location' })).toBeVisible();
  await expect(widget.getByRole('button', { name: 'Online' })).toBeVisible();
});

test('mobile layout does not overflow horizontally', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium');
  await page.goto('./');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await expect(page.getByText('Your upcoming booking')).toBeVisible();
  await page.getByRole('button', { name: 'Legal' }).click();
  await expect(page.getByRole('heading', { name: 'North Counsel' })).toBeVisible();
});
