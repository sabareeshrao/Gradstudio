import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { handleContentCatalogRequest, loadContentCatalog, validateCatalog } from '../src/content/catalogAdapter.js';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}

function signedCatalog(mutate = null) {
  const release = 'rel-222222222222-aaaaaaaaaaaa';
  const payload = {
    '$schema': 'https://content.example/schemas/catalog-v1.json',
    contract: 'gradstudio-content-catalog/v1',
    schema_version: 1,
    release_id: release,
    source: { repository: 'sabareeshrao/Gradstudio-2.0', commit: '2'.repeat(40) },
    compiler: { name: '@gradstudio/content-compiler', version: '1.0.0' },
    content_base_url: `https://content.example/releases/${release}/`,
    shared_assets: [],
    categories: [{ id: 'cat-synthetic', title: 'Synthetic category', slug: 'synthetic', order: 1, status: 'published' }],
    courses: [{ id: 'course-synthetic', category_id: 'cat-synthetic', title: 'Synthetic course', slug: 'synthetic', order: 1, status: 'published', access: { display: 'open' } }],
    sections: [{ id: 'section-synthetic', course_id: 'course-synthetic', title: 'Synthetic section', slug: 'synthetic', order: 1, status: 'published', access: { display: 'open' } }],
    simulations: [{
      id: 'sim-synthetic',
      course_id: 'course-synthetic',
      section_id: 'section-synthetic',
      title: 'Synthetic simulation',
      slug: 'synthetic',
      order: 1,
      status: 'published',
      access: { display: 'open' },
      entrypoint: 'index.html',
      release_path: `releases/${release}/content/simulations/sim-synthetic/index.html`
    }]
  };
  if (mutate) mutate(payload);
  const canonical = `${JSON.stringify(canonicalize(payload), null, 2)}\n`;
  return { ...payload, catalog_sha256: crypto.createHash('sha256').update(canonical).digest('hex') };
}

function service(catalog, options = {}) {
  return {
    CONTENT: {
      async fetch(request) {
        assert.equal(new URL(request.url).pathname, '/catalog/v1/active.json');
        return new Response(options.body ?? JSON.stringify(catalog), {
          status: options.status || 200,
          headers: { 'Content-Type': options.contentType || 'application/json', ...(options.headers || {}) }
        });
      }
    }
  };
}

test('catalog adapter accepts a digest-verified v1 catalog from the CONTENT service binding', async () => {
  const catalog = signedCatalog();
  const result = await loadContentCatalog(service(catalog));
  assert.equal(result.release_id, catalog.release_id);
  assert.equal(result.simulations[0].id, 'sim-synthetic');
});

test('catalog endpoint exposes explicit ready state and short revalidation cache', async () => {
  const response = await handleContentCatalogRequest(service(signedCatalog()), { 'Access-Control-Allow-Origin': 'https://app.example' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=30, must-revalidate');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.example');
  const body = await response.json();
  assert.equal(body.state, 'ready');
  assert.equal(body.catalog.source.commit, '2'.repeat(40));
});

test('missing content configuration is explicit and never falls back to legacy data', async () => {
  const response = await handleContentCatalogRequest({ DB: { prepare() { throw new Error('legacy database must not be read'); } } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { state: 'unconfigured', error: { code: 'content_source_unconfigured' } });
});

test('unsupported, corrupted, and structurally invalid catalogs fail closed', async () => {
  const unsupported = signedCatalog(value => { value.contract = 'gradstudio-content-catalog/v2'; });
  await assert.rejects(validateCatalog(unsupported), error => error.state === 'incompatible' && error.code === 'unsupported_contract');

  const corrupted = signedCatalog();
  corrupted.simulations[0].title = 'Changed after signing';
  await assert.rejects(validateCatalog(corrupted), error => error.code === 'catalog_digest_mismatch');

  const missingParent = signedCatalog(value => { value.simulations[0].section_id = 'section-missing'; });
  await assert.rejects(validateCatalog(missingParent), error => error.code === 'simulation_section_mismatch');

  const crossRelease = signedCatalog(value => { value.simulations[0].release_path = 'releases/rel-999999999999-bbbbbbbbbbbb/content/simulations/sim-synthetic/index.html'; });
  await assert.rejects(validateCatalog(crossRelease), error => error.code === 'simulation_invalid_release_path');
});

test('upstream transport, content type, JSON, and size errors return safe diagnostics', async () => {
  const wrongType = await handleContentCatalogRequest(service(signedCatalog(), { contentType: 'text/html' }));
  assert.deepEqual(await wrongType.json(), { state: 'incompatible', error: { code: 'content_type_invalid' } });

  const invalidJson = await handleContentCatalogRequest(service(signedCatalog(), { body: '{' }));
  assert.deepEqual(await invalidJson.json(), { state: 'incompatible', error: { code: 'catalog_json_invalid' } });

  const oversized = await handleContentCatalogRequest(service(signedCatalog(), { headers: { 'Content-Length': String(3 * 1024 * 1024) } }));
  assert.deepEqual(await oversized.json(), { state: 'incompatible', error: { code: 'catalog_too_large' } });

  const streamedOversized = await handleContentCatalogRequest(service(signedCatalog(), { body: 'x'.repeat(2 * 1024 * 1024 + 1) }));
  assert.deepEqual(await streamedOversized.json(), { state: 'incompatible', error: { code: 'catalog_too_large' } });

  const unavailable = await handleContentCatalogRequest(service(signedCatalog(), { status: 503 }));
  assert.deepEqual(await unavailable.json(), { state: 'unavailable', error: { code: 'content_upstream_unavailable' } });
});

test('empty, multi-course, unpublished, and rollback catalogs have explicit compatibility behavior', async () => {
  const empty = signedCatalog(value => {
    value.categories = [];
    value.courses = [];
    value.sections = [];
    value.simulations = [];
  });
  assert.deepEqual((await validateCatalog(empty)).simulations, []);

  const multi = signedCatalog(value => {
    value.categories.push({ id: 'cat-second', title: 'Second category', slug: 'second', order: 2, status: 'published' });
    value.courses.push({ id: 'course-second', category_id: 'cat-second', title: 'Second course', slug: 'second', order: 1, status: 'published', access: { display: 'open' } });
    value.sections.push({ id: 'section-second', course_id: 'course-second', title: 'Second section', slug: 'second', order: 1, status: 'published', access: { display: 'open' } });
    value.simulations.push({
      id: 'sim-second', course_id: 'course-second', section_id: 'section-second', title: 'Second simulation', slug: 'second', order: 1,
      status: 'published', access: { display: 'open' }, entrypoint: 'index.html',
      release_path: `releases/${value.release_id}/content/simulations/sim-second/index.html`
    });
  });
  assert.equal((await validateCatalog(multi)).courses.length, 2);

  const unpublished = signedCatalog(value => { value.simulations[0].status = 'unpublished'; });
  await assert.rejects(validateCatalog(unpublished), error => error.code === 'simulations_not_published');

  const rollback = signedCatalog(value => {
    value.release_id = 'rel-111111111111-bbbbbbbbbbbb';
    value.source.commit = '1'.repeat(40);
    value.content_base_url = `https://content.example/releases/${value.release_id}/`;
    value.simulations[0].release_path = `releases/${value.release_id}/content/simulations/sim-synthetic/index.html`;
  });
  assert.equal((await validateCatalog(rollback)).source.commit, '1'.repeat(40));
});
