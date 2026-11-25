import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEnvironmentConfig, validateEnvironmentPair } from '../../scripts/validate-environment-config.mjs';

const workerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('development and staging examples contain complete isolated bindings', () => {
  for (const environment of ['dev', 'staging']) {
    const content = fs.readFileSync(path.join(workerRoot, `wrangler.${environment}.example.toml`), 'utf8');
    assert.deepEqual(validateEnvironmentConfig(content, environment, { example: true }), []);
  }
});
test('non-production config rejects production resource fingerprints', () => {
  const content = fs.readFileSync(path.join(workerRoot, 'wrangler.dev.example.toml'), 'utf8')
    .replace('REPLACE_WITH_DEV_D1_DATABASE_ID', 'b1f24bfd-4ca5-4c2b-94af-8037cd68422f');
  const errors = validateEnvironmentConfig(content, 'dev', { example: true });
  assert.ok(errors.some(error => error.includes('Production fingerprint')));
});

test('deployable non-production config rejects placeholders', () => {
  const content = fs.readFileSync(path.join(workerRoot, 'wrangler.dev.example.toml'), 'utf8');
  const errors = validateEnvironmentConfig(content, 'dev');
  assert.ok(errors.some(error => error.includes('placeholder')));
});

test('checked-in dev environment no longer contains persistent production bindings', () => {
  const content = fs.readFileSync(path.join(workerRoot, 'wrangler.toml'), 'utf8');
  const devSection = content.slice(content.indexOf('[env.dev]'));
  assert.doesNotMatch(devSection, /b1f24bfd-4ca5-4c2b-94af-8037cd68422f|e5dc25fdeb9d42eb8947287323cf7027|92489a91aab6495ab072d7e2715eb8e0|dd4395372be745e5b7d5f63acddb002a/);
  assert.doesNotMatch(devSection, /bucket_name\s*=\s*"learning-simulations"/);
});

test('production CORS allowlist excludes localhost development origins', () => {
  const production = fs.readFileSync(path.join(workerRoot, 'wrangler.toml'), 'utf8');
  const productionVars = production.split('# ===== DEV ENVIRONMENT =====')[0];
  assert.doesNotMatch(productionVars, /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/);
});

test('development and staging templates share no worker, binding, bucket, or route identifiers', () => {
  const dev = fs.readFileSync(path.join(workerRoot, 'wrangler.dev.example.toml'), 'utf8');
  const staging = fs.readFileSync(path.join(workerRoot, 'wrangler.staging.example.toml'), 'utf8');
  assert.deepEqual(validateEnvironmentPair(dev, staging), []);
});
