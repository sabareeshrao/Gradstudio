import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import worker from '../src/index.js';
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '../src/utils/auth.js';
import { getRoutePolicy, isLegacyEducationalRoute, isRuntimeRouteDisabled, validateRuntimeEnvironment } from '../src/middleware/requestPolicy.js';
import { checkRateLimit } from '../src/utils/rateLimiter.js';
import { scanHtmlFile } from '../src/utils/htmlScanner.js';
import { handleAdminUploadSimulation } from '../src/handlers/adminUpload.js';

class MemoryKV {
  constructor() { this.values = new Map(); }
  async get(key, options) {
    const value = this.values.get(key) ?? null;
    return options?.type === 'json' && value ? JSON.parse(value) : value;
  }
  async put(key, value) { this.values.set(key, String(value)); }
  async delete(key) { this.values.delete(key); }
  async list({ prefix = '' } = {}) {
    return { keys: [...this.values.keys()].filter(key => key.startsWith(prefix)).map(name => ({ name })) };
  }
}

class MockDB {
  constructor(users = []) { this.users = new Map(users.map(user => [user.id, user])); }
  prepare(sql) {
    const db = this;
    return {
      args: [],
      bind(...args) { this.args = args; return this; },
      async first() {
        if (/FROM users WHERE id = \?/i.test(sql)) return db.users.get(this.args[0]) || null;
        return null;
      },
      async all() {
        if (/FROM users/i.test(sql)) return { results: [...db.users.values()] };
        return { results: [] };
      },
      async run() { return { success: true }; }
    };
  }
}

function makeEnv(users = []) {
  return {
    ENVIRONMENT: 'test',
    ENVIRONMENT_ISOLATED: 'true',
    JWT_SECRET: 'access-secret-that-is-at-least-thirty-two-characters-long',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-thirty-two-characters',
    JWT_ISSUER: 'gradstudio-test',
    JWT_AUDIENCE: 'gradstudio-api-test',
    ALLOWED_ORIGINS: 'https://app.example.test',
    DB: new MockDB(users),
    KV: new MemoryKV(),
    RATE_LIMITS: new MemoryKV(),
    REFRESH_TOKENS: new MemoryKV(),
    R2: { async get() { return null; }, async list() { throw new Error('R2 listing must not be reached'); } }
  };
}

function makeGitContentEnv(users = []) {
  return {
    ...makeEnv(users),
    GIT_CONTENT_ENABLED: 'true',
    APP_SOURCE_COMMIT: 'a'.repeat(40),
    CONTENT_PUBLIC_ORIGIN: 'https://content.example.test',
    CONTENT: { async fetch() { return Response.json({ status: 'ready', catalog: {} }); } },
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/' || path === '/index.html') {
          return new Response('<!doctype html><title>staging</title>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
          });
        }
        return new Response('Not found', { status: 404 });
      }
    },
    R2: undefined
  };
}

function context() { return { waitUntil() {} }; }

function apiRequest(path, { method = 'GET', token, origin, headers = {}, body } = {}) {
  const merged = new Headers(headers);
  merged.set('CF-Connecting-IP', '203.0.113.10');
  if (token) merged.set('Authorization', `Bearer ${token}`);
  if (origin) merged.set('Origin', origin);
  return new Request(`https://api.example.test${path}`, { method, headers: merged, body });
}

test('access and refresh tokens have separate, enforced purposes', async () => {
  const env = makeEnv();
  const { accessToken, refreshToken } = await generateTokens({ id: 'u1', email: 'u@example.test', role: 'user' }, env);
  const access = await verifyAccessToken(accessToken, env);
  const refresh = await verifyRefreshToken(refreshToken, env);
  assert.equal(access.token_type, 'access');
  assert.equal(refresh.token_type, 'refresh');
  await assert.rejects(() => verifyAccessToken(refreshToken, env), /TOKEN_INVALID/);
  await assert.rejects(() => verifyRefreshToken(accessToken, env), /REFRESH_TOKEN_INVALID/);
});
test('issuer and audience are mandatory', async () => {
  const signingEnv = makeEnv();
  const { accessToken } = await generateTokens({ id: 'u1', email: 'u@example.test', role: 'user' }, signingEnv);
  const verifyingEnv = { ...signingEnv, JWT_AUDIENCE: 'different-audience' };
  await assert.rejects(() => verifyAccessToken(accessToken, verifyingEnv), /TOKEN_INVALID/);
});

test('expired access tokens are rejected with an expiration error', async () => {
  const env = makeEnv();
  const expired = await new SignJWT({ userId: 'u1', token_type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setJti('expired-token')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(env.JWT_SECRET));
  await assert.rejects(() => verifyAccessToken(expired, env), /TOKEN_EXPIRED/);
});

test('runtime environment fails closed without isolation or distinct secrets', async () => {
  const env = makeEnv();
  assert.equal(validateRuntimeEnvironment(env), null);
  assert.match(validateRuntimeEnvironment({ ...env, ENVIRONMENT_ISOLATED: 'false' }), /isolation/i);
  assert.match(validateRuntimeEnvironment({ ...env, JWT_REFRESH_SECRET: env.JWT_SECRET }), /distinct/i);

  const response = await worker.fetch(apiRequest('/api/health'), { ...env, ENVIRONMENT_ISOLATED: 'false' }, context());
  assert.equal(response.status, 503);
});

test('Git-content staging requires content and Static Assets bindings instead of R2', () => {
  const env = makeGitContentEnv();
  assert.equal(validateRuntimeEnvironment(env), null);
  assert.match(validateRuntimeEnvironment({ ...env, ASSETS: undefined }), /ASSETS/);
  assert.match(validateRuntimeEnvironment({ ...env, CONTENT: undefined }), /CONTENT/);
  assert.match(validateRuntimeEnvironment({ ...env, CONTENT_PUBLIC_ORIGIN: undefined }), /origin/i);
  assert.match(validateRuntimeEnvironment({ ...env, CONTENT_PUBLIC_ORIGIN: 'http://content.example.test' }), /HTTPS/i);
  assert.equal(validateRuntimeEnvironment({ ...env, R2: undefined }), null);
});

test('Git-content staging serves versioned assets and exposes safe release diagnostics', async () => {
  const env = makeGitContentEnv();
  const asset = await worker.fetch(apiRequest('/'), env, context());
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /staging/);
  assert.equal(asset.headers.get('Cache-Control'), 'no-cache, no-store, must-revalidate');
  assert.match(asset.headers.get('Content-Security-Policy'), /frame-src 'self' https:\/\/accounts\.google\.com https:\/\/content\.example\.test/);
  assert.doesNotMatch(asset.headers.get('Content-Security-Policy'), /frame-src[^;]*\*/);

  const health = await worker.fetch(apiRequest('/api/health'), env, context());
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: 'ok',
    version: '1.0.0',
    environment: 'test',
    content_source: 'git',
    source_commit: 'a'.repeat(40)
  });

  const retiredEditor = await worker.fetch(apiRequest('/gradstudio-learn-admin.html'), env, context());
  assert.equal(retiredEditor.status, 302);
  assert.equal(retiredEditor.headers.get('Location'), 'https://api.example.test/admin-content-status.html');
});

test('Git-content staging fails closed for legacy catalog reads and authoring', async () => {
  const admin = { id: 'admin-1', email: 'admin@example.test', role: 'admin', is_active: 1 };
  const env = makeGitContentEnv([admin]);
  const adminToken = (await generateTokens(admin, env)).accessToken;
  const attempts = [
    apiRequest('/api/courses'),
    apiRequest('/api/categories'),
    apiRequest('/simulations/legacy/index.html'),
    apiRequest('/api/admin/courses', { method: 'POST', token: adminToken, body: '{}' }),
    apiRequest('/api/admin/upload-simulation', { method: 'POST', token: adminToken, body: new FormData() })
  ];
  for (const request of attempts) {
    const response = await worker.fetch(request, env, context());
    assert.equal(response.status, 404, `${request.method} ${new URL(request.url).pathname}`);
  }
  assert.equal(isLegacyEducationalRoute('/api/courses'), true);
  assert.equal(isLegacyEducationalRoute('/api/admin/metrics/content'), false);
  assert.equal(isLegacyEducationalRoute('/api/bookmarks'), false);
});

test('admin routes deny missing, refresh, non-admin, and inactive identities', async () => {
  const admin = { id: 'admin-1', email: 'admin@example.test', role: 'admin', is_active: 1 };
  const user = { id: 'user-1', email: 'user@example.test', role: 'user', is_active: 1 };
  const inactive = { id: 'admin-2', email: 'disabled@example.test', role: 'admin', is_active: 0 };
  const env = makeEnv([admin, user, inactive]);

  assert.equal((await worker.fetch(apiRequest('/api/admin/users'), env, context())).status, 401);

  assert.equal((await worker.fetch(apiRequest('/api/admin/users', { token: 'not-a-valid-jwt' }), env, context())).status, 401);

  const refresh = (await generateTokens(admin, env)).refreshToken;
  assert.equal((await worker.fetch(apiRequest('/api/admin/users', { token: refresh }), env, context())).status, 401);

  const userToken = (await generateTokens(user, env)).accessToken;
  assert.equal((await worker.fetch(apiRequest('/api/admin/users', { token: userToken }), env, context())).status, 403);

  const inactiveToken = (await generateTokens(inactive, env)).accessToken;
  assert.equal((await worker.fetch(apiRequest('/api/admin/users', { token: inactiveToken }), env, context())).status, 401);
});

test('active database administrator can reach a protected read route', async () => {
  const admin = { id: 'admin-1', email: 'admin@example.test', role: 'admin', is_active: 1 };
  const env = makeEnv([admin]);
  const token = (await generateTokens(admin, env)).accessToken;
  const response = await worker.fetch(apiRequest('/api/admin/users', { token, origin: 'https://app.example.test' }), env, context());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.users[0].id, admin.id);
});

test('wrong and null browser origins are rejected', async () => {
  const env = makeEnv();
  assert.equal((await worker.fetch(apiRequest('/api/health', { origin: 'https://evil.example' }), env, context())).status, 403);
  assert.equal((await worker.fetch(apiRequest('/api/health', { origin: 'null' }), env, context())).status, 403);
});

test('all responses receive baseline security headers without wildcard CORS', async () => {
  const response = await worker.fetch(apiRequest('/api/health'), makeEnv(), context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('oversized admin payload is rejected before handler execution', async () => {
  const response = await worker.fetch(apiRequest('/api/admin/courses', {
    method: 'POST',
    headers: { 'Content-Length': String(2 * 1024 * 1024) },
    body: '{}'
  }), makeEnv(), context());
  assert.equal(response.status, 413);
});

test('streamed payload without Content-Length cannot bypass the body limit', async () => {
  const request = apiRequest('/api/admin/courses', {
    method: 'POST',
    body: 'x'.repeat((1024 * 1024) + 1)
  });
  assert.equal(request.headers.get('Content-Length'), null);
  const response = await worker.fetch(request, makeEnv(), context());
  assert.equal(response.status, 413);
});

test('runtime debug, migration, sync, setup, and permanent-delete routes are disabled', async () => {
  const paths = [
    '/debug/r2',
    '/api/admin/migrate',
    '/api/admin/setup-categories-table',
    '/api/admin/sync-content',
    '/api/admin/courses/course-1/permanent'
  ];
  for (const path of paths) {
    assert.equal(isRuntimeRouteDisabled(path), true, path);
    const response = await worker.fetch(apiRequest(path, { method: path === '/debug/r2' ? 'GET' : 'POST' }), makeEnv(), context());
    assert.equal(response.status, 404, path);
  }
});

test('rate limiter rejects an over-limit request', async () => {
  const env = makeEnv();
  assert.equal((await checkRateLimit(env, 'test-client', 2, 60)).allowed, true);
  assert.equal((await checkRateLimit(env, 'test-client', 2, 60)).allowed, true);
  assert.equal((await checkRateLimit(env, 'test-client', 2, 60)).allowed, false);
});

test('simulation scanner and upload handler fail closed on unsafe HTML', async () => {
  const unsafe = '<!doctype html><script src="https://evil.example/payload.js"></script>';
  assert.equal(scanHtmlFile(unsafe).safe, false);
  assert.equal(scanHtmlFile('<style>.card { top: 0; }</style><main>Safe</main>').safe, true);

  const env = makeEnv();
  let stored = false;
  env.R2 = { async put() { stored = true; } };
  const form = new FormData();
  form.set('file', new File([unsafe], 'unsafe.html', { type: 'text/html' }));
  form.set('course_id', 'course-1');
  form.set('section_id', 'section-1');
  form.set('title', 'Unsafe fixture');
  const response = await handleAdminUploadSimulation(
    apiRequest('/api/admin/upload-simulation', { method: 'POST', body: form }),
    env,
    {}
  );
  assert.equal(response.status, 400);
  assert.equal(stored, false);
});

test('route policy covers every admin path with admin access', () => {
  assert.equal(getRoutePolicy('/api/admin/users', 'GET').access, 'admin');
  assert.equal(getRoutePolicy('/api/admin/courses', 'POST').access, 'admin');
  assert.equal(getRoutePolicy('/api/admin/upload-simulation', 'POST').access, 'admin');
});

test('route policy distinguishes authenticated mutations from anonymous engagement', () => {
  assert.equal(getRoutePolicy('/api/comments/sim-1', 'GET').access, 'public');
  assert.equal(getRoutePolicy('/api/comments/sim-1', 'POST').access, 'user');
  assert.equal(getRoutePolicy('/api/content/sim-1/share', 'POST').access, 'user');
  assert.equal(getRoutePolicy('/api/content/sim-1/report', 'POST').access, 'user');
  assert.equal(getRoutePolicy('/api/likes/sim-1', 'POST').access, 'public');
  assert.equal(getRoutePolicy('/api/dislikes/sim-1', 'POST').access, 'public');
});

test('public courses admin projection requires administrator identity', async () => {
  const env = makeEnv();
  const response = await worker.fetch(apiRequest('/api/courses?admin=1'), env, context());
  assert.equal(response.status, 401);
});

test('legacy simulation response is sandboxed into an opaque origin', async () => {
  const env = makeEnv();
  env.R2 = { async get() { return { body: '<!doctype html><title>synthetic</title>' }; } };
  const response = await worker.fetch(apiRequest('/simulations/synthetic/index.html'), env, context());
  assert.equal(response.status, 200);
  const csp = response.headers.get('Content-Security-Policy');
  assert.match(csp, /sandbox allow-scripts allow-forms/);
  assert.doesNotMatch(csp, /allow-same-origin/);
  assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN');
});
