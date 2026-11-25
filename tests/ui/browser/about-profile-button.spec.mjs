import { test, expect } from '@playwright/test';

test('About page retains founder content without the GitHub profile button', async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:4173' && !url.pathname.startsWith('/api/')
      ? route.continue() : route.abort();
  });
  await page.goto('/#about');
  await expect(page.getByRole('heading', { name: 'About GradStudio', exact: true })).toBeVisible();
  const about = page.locator('.about-standard');
  await expect(about.locator('.about-standard-photo')).toBeVisible();
  await expect(about.locator('.about-standard-points article')).toHaveCount(3);
  await expect(about.getByRole('link', { name: /github/i })).toHaveCount(0);
  await expect(about.locator('.about-github-link, .about-profile-link')).toHaveCount(0);
});
