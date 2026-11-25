import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationModelToUiCatalog, catalogToApplicationModel, resolveSimulationSource } from '../../static/modules/content-catalog-v1.mjs';

function catalog() {
  const release = 'rel-222222222222-aaaaaaaaaaaa';
  return {
    release_id: release,
    source: { commit: '2'.repeat(40) },
    catalog_sha256: 'a'.repeat(64),
    content_base_url: `https://content.example/releases/${release}/`,
    categories: [{ id: 'cat-one', title: 'One', order: 1, status: 'published' }],
    courses: [{ id: 'course-one', category_id: 'cat-one', title: 'Course', order: 1, status: 'published' }],
    sections: [{ id: 'section-one', course_id: 'course-one', title: 'Section', order: 1, status: 'published' }],
    simulations: [{
      id: 'sim-one', course_id: 'course-one', section_id: 'section-one', title: 'Simulation', order: 1, status: 'published',
      release_path: `releases/${release}/content/simulations/sim-one/index.html`
    }]
  };
}

test('client adapter maps stable IDs and the independent content origin', () => {
  const source = catalog();
  const model = catalogToApplicationModel(source);
  assert.equal(model.release.sourceCommit, '2'.repeat(40));
  assert.equal(model.courses[0].stableProgressKey, 'course:course-one');
  assert.equal(model.courses[0].sections[0].simulations[0].stableProgressKey, 'simulation:sim-one');
  assert.equal(model.courses[0].sections[0].simulations[0].source, 'https://content.example/releases/rel-222222222222-aaaaaaaaaaaa/content/simulations/sim-one/index.html');
});

test('rename, move, and reorder preserve simulation progress identity', () => {
  const before = catalogToApplicationModel(catalog()).courses[0].sections[0].simulations[0];
  const changed = catalog();
  changed.sections.push({ id: 'section-two', course_id: 'course-one', title: 'Moved section', order: 1, status: 'published' });
  changed.sections[0].order = 2;
  changed.simulations[0].title = 'Renamed simulation';
  changed.simulations[0].section_id = 'section-two';
  changed.simulations[0].order = 3;
  const after = catalogToApplicationModel(changed).courses[0].sections[0].simulations[0];
  assert.equal(before.stableProgressKey, after.stableProgressKey);
  assert.equal(after.id, 'sim-one');
});

test('empty catalog maps to a ready empty application model', () => {
  const empty = catalog();
  empty.categories = [];
  empty.courses = [];
  empty.sections = [];
  empty.simulations = [];
  const model = catalogToApplicationModel(empty);
  assert.equal(model.state, 'ready');
  assert.deepEqual(model.courses, []);
});

test('application model maps into the active shell without losing stable IDs or release provenance', () => {
  const ui = applicationModelToUiCatalog(catalogToApplicationModel(catalog()));
  assert.equal(ui.state, 'ready');
  assert.deepEqual(ui.topics, ['All', 'One']);
  assert.equal(ui.release.id, 'rel-222222222222-aaaaaaaaaaaa');
  assert.equal(ui.courses[0].id, 'course-one');
  assert.equal(ui.courses[0].stableProgressKey, 'course:course-one');
  assert.equal(ui.courses[0].fromGitContent, true);
  assert.equal(ui.courses[0]._apiSections[0].section_id, 'section-one');
  assert.equal(ui.courses[0]._apiLessons[0].simulation_id, 'sim-one');
  assert.equal(ui.courses[0]._apiLessons[0].stableProgressKey, 'simulation:sim-one');
  assert.match(ui.courses[0]._apiLessons[0].src, /^https:\/\/content\.example\/releases\//);
});

test('non-ready application state cannot expose courses from another source', () => {
  const ui = applicationModelToUiCatalog({ state: 'unavailable', error: { code: 'test' } });
  assert.equal(ui.state, 'unavailable');
  assert.deepEqual(ui.courses, []);
  assert.deepEqual(ui.topics, ['All']);
});

test('simulation sources cannot cross origins or releases', () => {
  const source = catalog();
  const simulation = source.simulations[0];
  assert.throws(() => resolveSimulationSource(source, { ...simulation, release_path: 'releases/rel-999999999999-bbbbbbbbbbbb/content/simulations/sim-one/index.html' }), /incompatible/);
  assert.throws(() => resolveSimulationSource(source, { ...simulation, release_path: 'https://evil.example/index.html' }), /incompatible/);
});
