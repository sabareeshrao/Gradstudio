import { test, expect } from '@playwright/test';

const release = 'rel-222222222222-aaaaaaaaaaaa';
const commit = '2'.repeat(40);

function catalogEnvelope() {
  return {
    state: 'ready',
    catalog: {
      release_id: release,
      source: { commit },
      catalog_sha256: 'a'.repeat(64),
      content_base_url: `https://content.example/releases/${release}/`,
      categories: [{ id: 'cat-synthetic', title: 'Synthetic category', order: 1, status: 'published' }],
      courses: [{ id: 'course-synthetic', category_id: 'cat-synthetic', title: 'Synthetic course', order: 1, status: 'published' }],
      sections: [{ id: 'section-synthetic', course_id: 'course-synthetic', title: 'Synthetic section', order: 1, status: 'published' }],
      simulations: [{
        id: 'sim-synthetic', course_id: 'course-synthetic', section_id: 'section-synthetic', title: 'Synthetic simulation', order: 1, status: 'published',
        release_path: `releases/${release}/content/simulations/sim-synthetic/index.html`
      }]
    }
  };
}

test('administrator content status is Git-derived and read-only', async ({ page }) => {
  const observed = [];
  await page.addInitScript(() => localStorage.setItem('lp_auth_token', 'synthetic-admin-token'));
  await page.route('**/api/auth/me', async route => {
    observed.push({ path: '/api/auth/me', method: route.request().method() });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'user-test-admin', role: 'admin' } }) });
  });
  await page.route('**/api/content/v1/catalog', async route => {
    observed.push({ path: '/api/content/v1/catalog', method: route.request().method() });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogEnvelope()) });
  });

  await page.goto('/admin-content-status.html');
  await expect(page.locator('#catalogState')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#sourceCommit')).toHaveText(commit);
  await expect(page.locator('#sourceCommit')).toHaveAttribute('href', `https://github.com/sabareeshrao/Gradstudio-2.0/commit/${commit}`);
  await expect(page.locator('#activeRelease')).toHaveText(release);
  await expect(page.locator('#deploymentStatus')).toHaveText('Active catalog verified');
  await expect(page.locator('[data-simulation-id="sim-synthetic"]')).toContainText('Synthetic simulation');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('input, textarea, select')).toHaveCount(0);
  expect(observed).toEqual([
    { path: '/api/auth/me', method: 'GET' },
    { path: '/api/content/v1/catalog', method: 'GET' }
  ]);
});

test('non-administrator cannot load the content status view', async ({ page }) => {
  let catalogRequested = false;
  await page.addInitScript(() => localStorage.setItem('lp_auth_token', 'synthetic-user-token'));
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { id: 'user-test-standard', role: 'user' } })
  }));
  await page.route('**/api/content/v1/catalog', route => {
    catalogRequested = true;
    return route.abort();
  });

  await page.goto('/admin-content-status.html');
  await expect(page.locator('#catalogState')).toHaveAttribute('data-state', 'incompatible');
  await expect(page.locator('#catalogState')).toContainText('Administrator access is required');
  expect(catalogRequested).toBe(false);
});
