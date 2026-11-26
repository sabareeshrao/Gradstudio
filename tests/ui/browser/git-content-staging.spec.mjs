import { test, expect } from '@playwright/test';

const releaseId = 'rel-333333333333-bbbbbbbbbbbb';
const sourceCommit = '3'.repeat(40);
const catalogDigest = 'b'.repeat(64);
const contentOrigin = 'https://content.example';

function envelope({ empty = false, release = releaseId, commit = sourceCommit, digest = catalogDigest, courseTitle = 'Browser Course' } = {}) {
  return {
    state: 'ready',
    catalog: {
      contract: 'gradstudio-content-catalog/v1',
      schema_version: 1,
      release_id: release,
      source: { repository: 'sabareeshrao/Gradstudio-2.0', commit },
      catalog_sha256: digest,
      content_base_url: `${contentOrigin}/releases/${release}/`,
      categories: empty ? [] : [{ id: 'cat-browser', title: 'Browser Category', order: 1, status: 'published' }],
      courses: empty ? [] : [{ id: 'course-browser', category_id: 'cat-browser', title: courseTitle, description: 'Synthetic browser-only course.', order: 1, status: 'published', access: { display: 'open' } }],
      sections: empty ? [] : [{ id: 'section-browser', course_id: 'course-browser', title: 'Browser Section', order: 1, status: 'published' }],
      simulations: empty ? [] : [{
        id: 'sim-browser',
        course_id: 'course-browser',
        section_id: 'section-browser',
        title: 'Browser Simulation',
        order: 1,
        status: 'published',
        access: { display: 'open' },
        release_path: `releases/${release}/content/simulations/sim-browser/index.html`
      }],
      shared_assets: []
    }
  };
}

async function installGitCatalogRoutes(page, payload) {
  const legacyRequests = [];
  await page.route('**/api/content/v1/catalog', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  }));
  for (const pattern of ['**/api/categories*', '**/api/courses*', '**/api/learn-carousels*']) {
    await page.route(pattern, route => {
      legacyRequests.push(new URL(route.request().url()).pathname);
      return route.fulfill({ status: 500, body: 'legacy endpoint must not be called' });
    });
  }
  await page.route(`${contentOrigin}/**`, route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html lang="en"><head><title>Browser simulation</title></head><body><main>Isolated simulation</main></body></html>'
  }));
  return legacyRequests;
}

test('staging-only Git catalog drives cards, detail, player, and release diagnostics', async ({ page }) => {
  const legacyRequests = await installGitCatalogRoutes(page, envelope());
  await page.goto('/?contentSource=git');

  const card = page.locator('[data-course-card-id="course-browser"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Browser Course');
  await expect(page.locator('html')).toHaveAttribute('data-content-state', 'ready');
  await expect(page.locator('html')).toHaveAttribute('data-content-release', releaseId);
  await expect(page.locator('html')).toHaveAttribute('data-content-source-commit', sourceCommit);
  expect(await page.evaluate(() => window.__GRADSTUDIO_CONTENT_RELEASE__)).toEqual({
    state: 'ready',
    id: releaseId,
    sourceCommit,
    catalogDigest,
    contentBaseUrl: `${contentOrigin}/releases/${releaseId}/`
  });

  await card.click();
  await expect(page.locator('#courseDetailTitle')).toHaveText('Browser Course');
  await expect(page.locator('.lesson-row')).toContainText('Browser Simulation');
  await page.locator('[data-start-learning]').click();

  const frame = page.locator('iframe[data-component-id="course.simulation-frame"]');
  await expect(frame).toHaveAttribute('data-component-instance', 'sim-browser');
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await expect(frame).not.toHaveAttribute('sandbox', /allow-same-origin/);
  await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(frame).toHaveAttribute('src', `${contentOrigin}/releases/${releaseId}/content/simulations/sim-browser/index.html`);
  expect(legacyRequests).toEqual([]);
});

test('ready empty Git catalog does not fall back to legacy educational content', async ({ page }) => {
  const legacyRequests = await installGitCatalogRoutes(page, envelope({ empty: true }));
  await page.goto('/?contentSource=git');
  await expect(page.locator('#courseGrid .empty-state')).toHaveText('No GradStudio 2.0 courses have been published yet.');
  await expect(page.locator('[data-component-id="catalog.course-card"]')).toHaveCount(0);
  expect(legacyRequests).toEqual([]);
});

test('an open staging tab refreshes a newly deployed content release without a page reload', async ({ page }) => {
  let payload = envelope();
  await installGitCatalogRoutes(page, null);
  await page.unroute('**/api/content/v1/catalog');
  await page.route('**/api/content/v1/catalog', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload)
  }));
  await page.goto('/?contentSource=git');
  await expect(page.locator('[data-course-card-id="course-browser"]')).toContainText('Browser Course');

  payload = envelope({
    release: 'rel-444444444444-cccccccccccc',
    commit: '4'.repeat(40),
    digest: 'c'.repeat(64),
    courseTitle: 'Automatically Refreshed Course'
  });
  const changed = await page.evaluate(() => window.__GRADSTUDIO_REFRESH_CONTENT__());

  expect(changed).toBe(true);
  await expect(page.locator('[data-course-card-id="course-browser"]')).toContainText('Automatically Refreshed Course');
  await expect(page.locator('html')).toHaveAttribute('data-content-release', 'rel-444444444444-cccccccccccc');
});
