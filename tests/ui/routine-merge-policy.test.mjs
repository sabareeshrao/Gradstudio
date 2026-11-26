import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('routine merge automation is trusted, fail-closed, and staging-only', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/routine-ui-auto-merge.yml', import.meta.url), 'utf8');
  const script = await readFile(new URL('../../scripts/ui/merge-routine-pr.mjs', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /ref: main/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.match(script, /classifyGit\(pr\.base\.sha, pr\.head\.sha/);
  assert.match(script, /security-ci\.yml/);
  assert.match(script, /application-staging\.yml\/dispatches/);
  assert.doesNotMatch(script, /production/i);
});

test('remote previews upload an unpromoted version from a trusted materialized tree', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/ui-remote-preview.yml', import.meta.url), 'utf8');
  const materializer = await readFile(new URL('../../scripts/ui/prepare-remote-preview.mjs', import.meta.url), 'utf8');
  assert.match(workflow, /wrangler versions upload/);
  assert.match(workflow, /--preview-alias/);
  assert.doesNotMatch(workflow, /wrangler deploy/);
  assert.match(materializer, /file\.startsWith\('static\/'\)/);
  assert.match(materializer, /rejects non-UI path/);
});
