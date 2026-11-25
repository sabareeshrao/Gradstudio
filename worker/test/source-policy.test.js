import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('source contains no administrator bypass or non-interactive auto-confirm', () => {
  const index = fs.readFileSync(path.join(root, 'worker/src/index.js'), 'utf8');
  const productionDeploy = fs.readFileSync(path.join(root, 'deploy-prod.sh'), 'utf8');
  assert.doesNotMatch(index, /return\s*\{\s*role:\s*['"]admin['"]\s*\}/);
  assert.doesNotMatch(productionDeploy, /confirm\s*=\s*['"]?y/i);
  assert.match(productionDeploy, /GRADSTUDIO_PRODUCTION_RELEASE_SHA/);
});

test('development static serving has no production-prefix fallback', () => {
  const index = fs.readFileSync(path.join(root, 'worker/src/index.js'), 'utf8');
  assert.doesNotMatch(index, /replace\(env\.STATIC_PREFIX,\s*['"]static\//);
});

test('sync utility has no hard-coded production endpoint and requires bearer auth', () => {
  const sync = fs.readFileSync(path.join(root, 'scripts/run_sync.js'), 'utf8');
  assert.doesNotMatch(sync, /const API_URL\s*=\s*['"]https:\/\/api\.gradstudio\.org/);
  assert.match(sync, /GRADSTUDIO_ADMIN_ACCESS_TOKEN/);
  assert.match(sync, /Authorization:\s*`Bearer/);
});

test('simulation upload and replacement handlers block failed scans', () => {
  for (const file of ['worker/src/handlers/adminUpload.js', 'worker/src/handlers/adminReplace.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /if \(!scanResult\.safe\)/, file);
    assert.doesNotMatch(source, /scanResult\.(?:score|warnings)/, file);
  }
});

test('pull-request validation has read-only permissions and no secret references', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/security-ci.yml'), 'utf8');
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /wrangler\s+deploy|r2\s+object\s+put/);
});
