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

test('new content catalog route has no legacy fallback', () => {
  const index = fs.readFileSync(path.join(root, 'worker/src/index.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'worker/src/content/catalogAdapter.js'), 'utf8');
  assert.match(index, /\/api\/content\/v1\/catalog/);
  assert.doesNotMatch(adapter, /env\.(?:DB|R2|KV)\b/);
  assert.doesNotMatch(adapter, /api\/courses|legacy/i);
});

test('pull-request validation has read-only permissions and no secret references', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/security-ci.yml'), 'utf8');
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /r2\s+object\s+put/);
  for (const line of workflow.split(/\r?\n/).filter(value => /wrangler\s+deploy/.test(value))) {
    assert.match(line, /--dry-run/, 'pull-request validation may bundle but must never deploy');
  }
});

test('security workflow actions are pinned to immutable revisions', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/security-ci.yml'), 'utf8');
  const actions = [...workflow.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)];
  assert.ok(actions.length >= 4, 'expected every security workflow action to be inspected');
  for (const [, action, revision] of actions) {
    assert.match(revision, /^[a-f0-9]{40}$/, `${action} must use an immutable 40-character commit SHA`);
  }
});

test('application staging workflows are scoped, gated, pinned, and production-free', () => {
  for (const filename of ['application-staging.yml', 'application-staging-rollback.yml']) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', filename), 'utf8');
    assert.match(workflow, /environment: staging/);
    assert.match(workflow, /CLOUDFLARE_STAGING_ENABLED/);
    assert.doesNotMatch(workflow, /gradstudio\.org|api\.gradstudio\.org|learning-simulations/);
    const actions = [...workflow.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)];
    assert.ok(actions.length >= 2, `${filename} must pin its actions`);
    for (const [, action, revision] of actions) {
      assert.match(revision, /^[a-f0-9]{40}$/, `${action} in ${filename} must use an immutable commit SHA`);
    }
  }

  const deployment = fs.readFileSync(path.join(root, '.github/workflows/application-staging.yml'), 'utf8');
  assert.match(deployment, /needs: \[staging-gate, validate\]/);
  assert.match(deployment, /if: needs\.staging-gate\.outputs\.enabled == 'true'/);
  assert.match(deployment, /APP_SOURCE_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(deployment, /npx wrangler deploy --config wrangler\.staging\.toml/);
  assert.ok(
    [...deployment.matchAll(/git ls-remote --exit-code origin refs\/heads\/main/g)].length >= 2,
    'application staging must reject stale commits both before preflight and immediately before deployment'
  );
  assert.match(deployment, /remote_main.*GITHUB_SHA/s);
  assert.match(deployment, /id: smoke[\s\S]*continue-on-error: true/);
  assert.match(deployment, /steps\.smoke\.outcome == 'failure'/);
  assert.match(deployment, /npx wrangler rollback --name gradstudio-app-staging --message "Automatic staging rollback/);
  assert.match(deployment, /Automatic application staging rollback did not restore a healthy Worker/);

  const rollback = fs.readFileSync(path.join(root, '.github/workflows/application-staging-rollback.yml'), 'utf8');
  assert.match(rollback, /needs: staging-gate/);
  assert.match(rollback, /if: needs\.staging-gate\.outputs\.enabled == 'true'/);
  assert.match(rollback, /npx wrangler rollback "\$TARGET_VERSION_ID" --name gradstudio-app-staging/);
});

test('staging smoke and rollback construct exact endpoint URLs without double slashes', async () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const origin = 'https://gradstudio-app-staging.example.workers.dev';
  const source = 'a'.repeat(40);
  const fixtures = [
    ['application-staging.yml', 3],
    ['application-staging-rollback.yml', 1]
  ];
  for (const [filename, count] of fixtures) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', filename), 'utf8');
    const scripts = [...workflow.matchAll(/node -e "([^"\n]*const origin=new URL[^"\n]*)"/g)].map(match => match[1]);
    assert.equal(scripts.length, count, filename);
    for (const script of scripts) {
      const requests = [];
      const fakeFetch = async (input) => {
        const url = new URL(input);
        assert.equal(url.origin, origin);
        assert.ok(!url.pathname.startsWith('//'), url.href);
        requests.push(url.pathname);
        if (url.pathname === '/api/health') return Response.json({ environment: 'staging', content_source: 'git', source_commit: source });
        if (url.pathname === '/catalog/v1/active.json') return Response.json({ contract: 'gradstudio-content-catalog/v1' });
        if (url.pathname === '/api/content/v1/catalog') return Response.json({ state: 'ready' });
        if (url.pathname === '/api/courses') return new Response(null, { status: 404 });
        if (url.pathname === '/gradstudio-learn-admin.html') return Response.redirect(origin + '/admin-content-status.html', 302);
        if (url.pathname === '/') return new Response('application');
        throw new Error('Unexpected staging path: ' + url.pathname);
      };
      // Replace the exit call with a return so the test does not exit the runner.
      const executable = script.replaceAll('process.exit(0)', 'return');
      await new AsyncFunction('fetch', 'process', 'setTimeout', executable)(
        fakeFetch,
        { env: { APPLICATION_STAGING_ORIGIN: origin, CONTENT_STAGING_ORIGIN: origin, APP_SOURCE_COMMIT: source } },
        () => { throw new Error('Unexpected retry'); }
      );
      assert.ok(requests.length > 0);
    }
  }
});
