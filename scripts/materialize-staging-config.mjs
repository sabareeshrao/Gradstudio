import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateEnvironmentConfig } from './validate-environment-config.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const KV_ID = /^[a-f0-9]{32}$/i;
const COMMIT = /^[a-f0-9]{40}$/;

const REPLACEMENTS = {
  REPLACE_WITH_STAGING_D1_DATABASE_ID: ['APP_STAGING_D1_DATABASE_ID', UUID],
  REPLACE_WITH_STAGING_KV_ID: ['APP_STAGING_KV_ID', KV_ID],
  REPLACE_WITH_STAGING_REFRESH_TOKENS_KV_ID: ['APP_STAGING_REFRESH_TOKENS_KV_ID', KV_ID],
  REPLACE_WITH_STAGING_RATE_LIMITS_KV_ID: ['APP_STAGING_RATE_LIMITS_KV_ID', KV_ID],
  REPLACE_WITH_STAGING_APP_URL: ['APPLICATION_STAGING_ORIGIN', null],
  REPLACE_WITH_STAGING_CONTENT_URL: ['CONTENT_STAGING_ORIGIN', null],
  REPLACE_WITH_APP_SOURCE_COMMIT: ['APP_SOURCE_COMMIT', COMMIT]
};

function validateOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.origin === value && !url.username && !url.password;
}

export function materializeStagingConfig(template, values) {
  let rendered = template;
  const kvIds = [];

  for (const [placeholder, [variable, pattern]] of Object.entries(REPLACEMENTS)) {
    const value = String(values[variable] || '').trim();
    const valid = variable.endsWith('_STAGING_ORIGIN')
      ? validateOrigin(value)
      : pattern?.test(value);
    if (!valid) throw new Error(`${variable} is missing or malformed.`);
    if (variable.endsWith('_KV_ID')) kvIds.push(value);
    rendered = rendered.replaceAll(placeholder, value);
  }

  if (new Set(kvIds).size !== kvIds.length) {
    throw new Error('Application staging KV namespace IDs must be distinct.');
  }

  const errors = validateEnvironmentConfig(rendered, 'staging');
  if (errors.length) throw new Error(errors.join('\n'));
  return rendered;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const templatePath = path.join(root, 'worker', 'wrangler.staging.example.toml');
  const outputPath = path.resolve(process.argv[2] || path.join(root, 'worker', 'wrangler.staging.toml'));
  const rendered = materializeStagingConfig(fs.readFileSync(templatePath, 'utf8'), process.env);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered, 'utf8');
  console.log(`Materialized isolated staging configuration: ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
