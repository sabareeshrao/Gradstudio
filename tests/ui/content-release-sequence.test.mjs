import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { catalogToApplicationModel } from '../../static/modules/content-catalog-v1.mjs';
import { handleContentCatalogRequest, validateCatalog } from '../../worker/src/content/catalogAdapter.js';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

function signedCatalog({ release = 'rel-222222222222-aaaaaaaaaaaa', commit = '2'.repeat(40) } = {}) {
  const unsigned = {
    '$schema': 'https://content.example/schemas/catalog-v1.json',
    contract: 'gradstudio-content-catalog/v1',
    schema_version: 1,
    release_id: release,
    source: { repository: 'sabareeshrao/Gradstudio-2.0', commit },
    compiler: { name: '@gradstudio/content-compiler', version: '1.0.0' },
    content_base_url: `https://content.example/releases/${release}/`,
    shared_assets: [],
    categories: [{ id: 'cat-sequence', title: 'Synthetic category', slug: 'synthetic', order: 1, status: 'published' }],
    courses: [{ id: 'course-sequence', category_id: 'cat-sequence', title: 'Synthetic course', slug: 'synthetic', order: 1, status: 'published', access: { display: 'open' } }],
    sections: [{ id: 'section-sequence', course_id: 'course-sequence', title: 'Synthetic section', slug: 'synthetic', order: 1, status: 'published', access: { display: 'open' } }],
    simulations: [{
      id: 'sim-sequence',
      course_id: 'course-sequence',
      section_id: 'section-sequence',
      title: 'Synthetic simulation',
      slug: 'synthetic',
      order: 1,
      status: 'published',
      access: { display: 'open' },
      entrypoint: 'index.html',
      release_path: `releases/${release}/content/simulations/sim-sequence/index.html`
    }]
  };
  const canonical = `${JSON.stringify(canonicalize(unsigned), null, 2)}\n`;
  return { ...unsigned, catalog_sha256: crypto.createHash('sha256').update(canonical).digest('hex') };
}

test('content-first rollout is limited to the configured staging host and localhost test opt-in', async () => {
  const shell = await readFile(new URL('../../static/index.html', import.meta.url), 'utf8');
  const activeClient = await readFile(new URL('../../static/gradstudio-learn-demo.js', import.meta.url), 'utf8');
  const siteConfig = JSON.parse(await readFile(new URL('../../static/ui-config/site.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(shell, /content-catalog-v1\.mjs/);
  assert.equal(siteConfig.featureFlags.gitContentCatalogStaging, true);
  assert.match(activeClient, /gradstudio-app-staging\.gradstudio-non-production\.workers\.dev/);
  assert.match(activeClient, /gitContentPreviewHost && gitContentPreviewRequested/);
  assert.match(activeClient, /featureFlags\?\.gitContentCatalogStaging === true/);
  assert.match(activeClient, /import\('\.\/modules\/content-catalog-v1\.mjs'\)/);
  assert.match(activeClient, /USE_GIT_CONTENT_CATALOG \? false : loadCatalogFromCache\(\)/);
  assert.match(activeClient, /CONTENT_REFRESH_INTERVAL_MS = 15_000/);
  assert.match(activeClient, /gradstudio:content-release-changed/);
  assert.match(activeClient, /__GRADSTUDIO_REFRESH_CONTENT__/);
  assert.match(activeClient, /sandbox="\$\{frameSandbox\}"/);
});

test('application-first rollout is explicitly unconfigured and never reads legacy content', async () => {
  let legacyRead = false;
  const response = await handleContentCatalogRequest({
    DB: { prepare() { legacyRead = true; throw new Error('legacy content read'); } },
    R2: { get() { legacyRead = true; throw new Error('legacy content read'); } },
    KV: { get() { legacyRead = true; throw new Error('legacy content read'); } }
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { state: 'unconfigured', error: { code: 'content_source_unconfigured' } });
  assert.equal(legacyRead, false);
});

test('rolling content back one side preserves v1 compatibility and stable progress identity', async () => {
  const current = await validateCatalog(signedCatalog());
  const previous = await validateCatalog(signedCatalog({
    release: 'rel-111111111111-bbbbbbbbbbbb',
    commit: '1'.repeat(40)
  }));
  const currentModel = catalogToApplicationModel(current);
  const previousModel = catalogToApplicationModel(previous);
  assert.equal(currentModel.release.id, 'rel-222222222222-aaaaaaaaaaaa');
  assert.equal(previousModel.release.id, 'rel-111111111111-bbbbbbbbbbbb');
  assert.equal(currentModel.courses[0].stableProgressKey, previousModel.courses[0].stableProgressKey);
  assert.equal(
    currentModel.courses[0].sections[0].simulations[0].stableProgressKey,
    previousModel.courses[0].sections[0].simulations[0].stableProgressKey
  );
});

test('missing active release is unavailable and never becomes a partial ready catalog', async () => {
  const response = await handleContentCatalogRequest({
    CONTENT: { fetch: async () => new Response('missing', { status: 404 }) }
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { state: 'unavailable', error: { code: 'content_upstream_unavailable' } });
});
